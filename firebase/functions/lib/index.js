"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInvoiceCreate = exports.onReplyCreate = exports.onSubmissionCreate = void 0;
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Export all Cloud Functions
var onSubmissionCreate_1 = require("./triggers/onSubmissionCreate");
Object.defineProperty(exports, "onSubmissionCreate", { enumerable: true, get: function () { return onSubmissionCreate_1.onSubmissionCreate; } });
var onReplyCreate_1 = require("./triggers/onReplyCreate");
Object.defineProperty(exports, "onReplyCreate", { enumerable: true, get: function () { return onReplyCreate_1.onReplyCreate; } });
var onInvoiceCreate_1 = require("./triggers/onInvoiceCreate");
Object.defineProperty(exports, "onInvoiceCreate", { enumerable: true, get: function () { return onInvoiceCreate_1.onInvoiceCreate; } });
//# sourceMappingURL=index.js.map