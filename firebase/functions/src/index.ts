import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();

// Export all Cloud Functions
export { onSubmissionCreate } from './triggers/onSubmissionCreate';
export { onReplyCreate } from './triggers/onReplyCreate';
export { onInvoiceCreate } from './triggers/onInvoiceCreate';
