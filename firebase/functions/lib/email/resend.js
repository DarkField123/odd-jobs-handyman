"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendApiKey = void 0;
exports.getResendClient = getResendClient;
exports.sendEmail = sendEmail;
const resend_1 = require("resend");
const params_1 = require("firebase-functions/params");
// Define the secret (set via: firebase functions:secrets:set RESEND_API_KEY)
exports.resendApiKey = (0, params_1.defineSecret)('RESEND_API_KEY');
let resendClient = null;
function getResendClient() {
    if (!resendClient) {
        resendClient = new resend_1.Resend(exports.resendApiKey.value());
    }
    return resendClient;
}
async function sendEmail(params) {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
        from: params.from || 'Odd Jobs <noreply@oddjobs.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo || 'info@oddjobs.com',
    });
    if (error) {
        throw new Error(`Resend error: ${error.message}`);
    }
    return { id: data.id };
}
//# sourceMappingURL=resend.js.map