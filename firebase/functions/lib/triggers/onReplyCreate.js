"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onReplyCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const resend_1 = require("../email/resend");
const templates_1 = require("../email/templates");
/**
 * Triggered when an admin creates a reply to a submission.
 * Sends the reply email to the customer.
 */
exports.onReplyCreate = (0, firestore_1.onDocumentCreated)({
    document: 'submissions/{submissionId}/emailReplies/{replyId}',
    secrets: [resend_1.resendApiKey],
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data in reply event');
        return;
    }
    const replyData = snapshot.data();
    const { submissionId, replyId } = event.params;
    const db = (0, firestore_2.getFirestore)();
    // Get parent submission for customer email
    const submissionDoc = await db
        .collection('submissions')
        .doc(submissionId)
        .get();
    if (!submissionDoc.exists) {
        console.error(`Parent submission ${submissionId} not found`);
        return;
    }
    const submission = submissionDoc.data();
    // Validate required fields
    if (!submission.email || !replyData.subject || !replyData.body) {
        console.error(`Missing required fields for reply ${replyId}`);
        return;
    }
    try {
        const result = await (0, resend_1.sendEmail)({
            to: submission.email,
            subject: replyData.subject,
            html: (0, templates_1.adminReplyTemplate)({
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
            sentAt: firestore_2.FieldValue.serverTimestamp(),
        });
        // Update submission status to 'contacted' if it was 'new'
        if (submission.status === 'new') {
            await db.collection('submissions').doc(submissionId).update({
                status: 'contacted',
            });
        }
        console.log(`Reply sent to ${submission.email} for submission ${submissionId}`);
    }
    catch (error) {
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
});
//# sourceMappingURL=onReplyCreate.js.map