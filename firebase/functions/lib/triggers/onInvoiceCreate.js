"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInvoiceCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const resend_1 = require("../email/resend");
const templates_1 = require("../email/templates");
/**
 * Triggered when a new invoice is created.
 * Sends the invoice email to the customer if sendEmail flag is true.
 */
exports.onInvoiceCreate = (0, firestore_1.onDocumentCreated)({
    document: 'invoices/{invoiceId}',
    secrets: [resend_1.resendApiKey],
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data in invoice event');
        return;
    }
    const data = snapshot.data();
    const invoiceId = event.params.invoiceId;
    const db = (0, firestore_2.getFirestore)();
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
        const result = await (0, resend_1.sendEmail)({
            to: data.customerEmail,
            subject: `Invoice ${data.invoiceNumber} from Odd Jobs`,
            html: (0, templates_1.invoiceEmailTemplate)({
                customerName: data.customerName,
                invoiceNumber: data.invoiceNumber,
                invoiceDate,
                dueDate,
                lineItems: data.lineItems,
                total: data.total,
                notes: data.notes,
            }),
        });
        // Update invoice with email status
        await db.collection('invoices').doc(invoiceId).update({
            emailStatus: {
                sentAt: firestore_2.FieldValue.serverTimestamp(),
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
        console.log(`Invoice email sent to ${data.customerEmail} for invoice ${data.invoiceNumber}`);
    }
    catch (error) {
        console.error(`Failed to send invoice email for ${invoiceId}:`, error);
        await db.collection('invoices').doc(invoiceId).update({
            emailStatus: {
                sentAt: firestore_2.FieldValue.serverTimestamp(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
});
//# sourceMappingURL=onInvoiceCreate.js.map