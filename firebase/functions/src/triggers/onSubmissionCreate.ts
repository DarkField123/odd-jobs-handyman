import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendEmail, resendApiKey } from '../email/resend';
import { confirmationEmailTemplate } from '../email/templates';

/**
 * Triggered when a new quote submission is created.
 * Sends a confirmation email to the customer.
 */
export const onSubmissionCreate = onDocumentCreated(
  {
    document: 'submissions/{submissionId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data in submission event');
      return;
    }

    const data = snapshot.data();
    const submissionId = event.params.submissionId;
    const db = getFirestore();

    // Validate required fields
    if (!data.email || !data.name || !data.service) {
      console.error(`Missing required fields in submission ${submissionId}`);
      return;
    }

    try {
      // Send confirmation email
      const result = await sendEmail({
        to: data.email,
        subject: 'Quote Request Received - Odd Jobs',
        html: confirmationEmailTemplate({
          customerName: data.name,
          service: data.service,
          message: data.message || 'No additional details provided.',
        }),
      });

      // Update submission with email status
      await db.collection('submissions').doc(submissionId).update({
        confirmationEmail: {
          sentAt: FieldValue.serverTimestamp(),
          status: 'sent',
          resendId: result.id,
        },
      });

      console.log(
        `Confirmation email sent to ${data.email} for submission ${submissionId}`
      );
    } catch (error) {
      // Log error and update submission
      console.error(
        `Failed to send confirmation email for ${submissionId}:`,
        error
      );

      await db.collection('submissions').doc(submissionId).update({
        confirmationEmail: {
          sentAt: FieldValue.serverTimestamp(),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
);
