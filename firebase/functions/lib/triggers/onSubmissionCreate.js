"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSubmissionCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const resend_1 = require("../email/resend");
const templates_1 = require("../email/templates");
/**
 * Triggered when a new quote submission is created.
 * Sends a confirmation email to the customer.
 */
exports.onSubmissionCreate = (0, firestore_1.onDocumentCreated)({
    document: 'submissions/{submissionId}',
    secrets: [resend_1.resendApiKey],
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data in submission event');
        return;
    }
    const data = snapshot.data();
    const submissionId = event.params.submissionId;
    const db = (0, firestore_2.getFirestore)();
    // Validate required fields
    if (!data.email || !data.name || !data.service) {
        console.error(`Missing required fields in submission ${submissionId}`);
        return;
    }
    try {
        // Send confirmation email
        const result = await (0, resend_1.sendEmail)({
            to: data.email,
            subject: 'Quote Request Received - Odd Jobs',
            html: (0, templates_1.confirmationEmailTemplate)({
                customerName: data.name,
                service: data.service,
                message: data.message || 'No additional details provided.',
            }),
        });
        // Update submission with email status
        await db.collection('submissions').doc(submissionId).update({
            confirmationEmail: {
                sentAt: firestore_2.FieldValue.serverTimestamp(),
                status: 'sent',
                resendId: result.id,
            },
        });
        console.log(`Confirmation email sent to ${data.email} for submission ${submissionId}`);
    }
    catch (error) {
        // Log error and update submission
        console.error(`Failed to send confirmation email for ${submissionId}:`, error);
        await db.collection('submissions').doc(submissionId).update({
            confirmationEmail: {
                sentAt: firestore_2.FieldValue.serverTimestamp(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
});
//# sourceMappingURL=onSubmissionCreate.js.map