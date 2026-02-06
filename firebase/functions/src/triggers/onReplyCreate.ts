import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendEmail, resendApiKey } from '../email/resend';
import { adminReplyTemplate } from '../email/templates';

/**
 * Triggered when an admin creates a reply to a submission.
 * Sends the reply email to the customer.
 */
export const onReplyCreate = onDocumentCreated(
  {
    document: 'submissions/{submissionId}/emailReplies/{replyId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data in reply event');
      return;
    }

    const replyData = snapshot.data();
    const { submissionId, replyId } = event.params;
    const db = getFirestore();

    // Get parent submission for customer email
    const submissionDoc = await db
      .collection('submissions')
      .doc(submissionId)
      .get();

    if (!submissionDoc.exists) {
      console.error(`Parent submission ${submissionId} not found`);
      return;
    }

    const submission = submissionDoc.data()!;

    // Validate required fields
    if (!submission.email || !replyData.subject || !replyData.body) {
      console.error(`Missing required fields for reply ${replyId}`);
      return;
    }

    try {
      const result = await sendEmail({
        to: submission.email,
        subject: replyData.subject,
        html: adminReplyTemplate({
          customerName: submission.name || 'Customer',
          subject: replyData.subject,
          body: replyData.body,
        }),
        replyTo: replyData.sentByEmail || 'info@oddjobs.com',
      });

      // Update reply status
      await db
        .collection('submissions')
        .doc(submissionId)
        .collection('emailReplies')
        .doc(replyId)
        .update({
          status: 'sent',
          resendId: result.id,
          sentAt: FieldValue.serverTimestamp(),
        });

      // Update submission status to 'contacted' if it was 'new'
      if (submission.status === 'new') {
        await db.collection('submissions').doc(submissionId).update({
          status: 'contacted',
        });
      }

      console.log(
        `Reply sent to ${submission.email} for submission ${submissionId}`
      );
    } catch (error) {
      console.error(`Failed to send reply for ${submissionId}:`, error);

      await db
        .collection('submissions')
        .doc(submissionId)
        .collection('emailReplies')
        .doc(replyId)
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
  }
);
