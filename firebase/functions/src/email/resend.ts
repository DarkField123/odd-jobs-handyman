import { Resend } from 'resend';
import { defineSecret } from 'firebase-functions/params';

// Define the secret (set via: firebase functions:secrets:set RESEND_API_KEY)
export const resendApiKey = defineSecret('RESEND_API_KEY');

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(resendApiKey.value());
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
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

  return { id: data!.id };
}
