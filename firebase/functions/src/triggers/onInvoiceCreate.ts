import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendEmail, resendApiKey } from '../email/resend';
import { invoiceEmailTemplate } from '../email/templates';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Triggered when a new invoice is created.
 * Sends the invoice email to the customer if sendEmail flag is true.
 */
export const onInvoiceCreate = onDocumentCreated(
  {
    document: 'invoices/{invoiceId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data in invoice event');
      return;
    }

    const data = snapshot.data();
    const invoiceId = event.params.invoiceId;
    const db = getFirestore();

    // Check if email should be sent
    if (!data.sendEmail) {
      console.log(`Invoice ${invoiceId} created without email request`);
      return;
    }

    // Validate required fields
    if (!data.customerEmail || !data.invoiceNumber || !data.lineItems) {
      console.error(`Missing required fields in invoice ${invoiceId}`);
      return;
    }

    // Format dates for display
    const invoiceDate = data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

    const dueDate = new Date(data.dueDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    try {
      // Send invoice email
      const result = await sendEmail({
        to: data.customerEmail,
        subject: `Invoice ${data.invoiceNumber} from Odd Jobs`,
        html: invoiceEmailTemplate({
          customerName: data.customerName,
          invoiceNumber: data.invoiceNumber,
          invoiceDate,
          dueDate,
          lineItems: data.lineItems as LineItem[],
          total: data.total,
          notes: data.notes,
        }),
      });

      // Update invoice with email status
      await db.collection('invoices').doc(invoiceId).update({
        emailStatus: {
          sentAt: FieldValue.serverTimestamp(),
          status: 'sent',
          resendId: result.id,
        },
      });

      // Update linked submission status to 'quoted' if it exists
      if (data.submissionId) {
        const submissionRef = db.collection('submissions').doc(data.submissionId);
        const submissionDoc = await submissionRef.get();

        if (submissionDoc.exists) {
          const submissionData = submissionDoc.data();
          // Only update if status is 'new' or 'contacted'
          if (submissionData?.status === 'new' || submissionData?.status === 'contacted') {
            await submissionRef.update({ status: 'quoted' });
          }
        }
      }

      console.log(
        `Invoice email sent to ${data.customerEmail} for invoice ${data.invoiceNumber}`
      );
    } catch (error) {
      console.error(`Failed to send invoice email for ${invoiceId}:`, error);

      await db.collection('invoices').doc(invoiceId).update({
        emailStatus: {
          sentAt: FieldValue.serverTimestamp(),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
);
