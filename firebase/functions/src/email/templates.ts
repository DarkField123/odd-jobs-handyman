/**
 * Email template for quote confirmation sent to customers
 */
export function confirmationEmailTemplate(data: {
  customerName: string;
  service: string;
  message: string;
}): string {
  // Escape HTML entities to prevent XSS
  const escape = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Request Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: #e53935; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Odd Jobs</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Professional Handyman Services</p>
  </div>

  <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0; font-size: 20px;">Thanks for your quote request, ${escape(data.customerName)}!</h2>

    <p style="color: #555;">We've received your request for <strong style="color: #e53935;">${escape(data.service)}</strong> and will get back to you within 24 hours with a free estimate.</p>

    <div style="background: #fafafa; padding: 16px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #e53935;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Your Message</h3>
      <p style="margin: 0; color: #333; white-space: pre-wrap;">${escape(data.message)}</p>
    </div>

    <h3 style="color: #333; font-size: 16px; margin-bottom: 12px;">What happens next?</h3>
    <ol style="padding-left: 20px; color: #555; margin: 0;">
      <li style="margin-bottom: 8px;">We'll review your request</li>
      <li style="margin-bottom: 8px;">You'll receive a detailed quote via email or phone</li>
      <li style="margin-bottom: 8px;">Once approved, we'll schedule a convenient time</li>
    </ol>

    <p style="color: #777; font-size: 14px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
      Questions? Simply reply to this email or call us directly.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p style="margin: 0;">Odd Jobs - Manchester & Surrounding Areas</p>
    <p style="margin: 8px 0 0;">This email was sent because you requested a quote on our website.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for admin replies to customers
 */
export function adminReplyTemplate(data: {
  customerName: string;
  subject: string;
  body: string;
}): string {
  // Escape HTML entities and convert newlines to <br>
  const escape = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: #e53935; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">Odd Jobs</h1>
  </div>

  <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 28px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${escape(data.customerName)},</p>

    <div style="color: #333;">${escape(data.body)}</div>

    <p style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 14px; margin-bottom: 0;">
      Best regards,<br>
      <strong>The Odd Jobs Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
    <p style="margin: 0;">Odd Jobs - Professional Handyman Services</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for invoices sent to customers
 */
export function invoiceEmailTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  total: number;
  notes?: string;
}): string {
  const escape = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  const lineItemsHtml = data.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${escape(item.description)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.quantity * item.unitPrice)}</td>
      </tr>
    `
    )
    .join('');

  const notesSection = data.notes
    ? `
    <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 6px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase;">Notes</h3>
      <p style="margin: 0; color: #333;">${escape(data.notes).replace(/\n/g, '<br>')}</p>
    </div>
  `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escape(data.invoiceNumber)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: #e53935; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <table width="100%" style="border-collapse: collapse;">
      <tr>
        <td>
          <h1 style="margin: 0; font-size: 24px;">Odd Jobs</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Professional Handyman Services</p>
        </td>
        <td style="text-align: right;">
          <div style="font-size: 28px; font-weight: bold;">INVOICE</div>
          <div style="opacity: 0.9;">${escape(data.invoiceNumber)}</div>
        </td>
      </tr>
    </table>
  </div>

  <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${escape(data.customerName)},</p>
    <p>Please find your invoice below. Payment is due by <strong>${escape(data.dueDate)}</strong>.</p>

    <table width="100%" style="border-collapse: collapse; margin: 24px 0;">
      <tr style="background: #f5f5f5;">
        <td style="padding: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666;">Description</td>
        <td style="padding: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; text-align: center;">Qty</td>
        <td style="padding: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; text-align: right;">Unit Price</td>
        <td style="padding: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; text-align: right;">Amount</td>
      </tr>
      ${lineItemsHtml}
    </table>

    <table width="100%" style="border-collapse: collapse;">
      <tr>
        <td></td>
        <td style="width: 200px; padding: 16px; background: #fafafa; border-radius: 6px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #666;">Subtotal</td>
              <td style="padding: 4px 0; text-align: right;">${formatCurrency(data.total)}</td>
            </tr>
            <tr style="font-size: 18px; font-weight: bold;">
              <td style="padding: 12px 0 4px; border-top: 2px solid #ddd;">Total</td>
              <td style="padding: 12px 0 4px; border-top: 2px solid #ddd; text-align: right; color: #e53935;">${formatCurrency(data.total)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${notesSection}

    <div style="margin-top: 32px; padding: 20px; background: #e8f5e9; border-radius: 6px; text-align: center;">
      <p style="margin: 0; color: #2e7d32; font-weight: 600;">Payment Details</p>
      <p style="margin: 8px 0 0; color: #555; font-size: 14px;">
        Bank Transfer or Cash on completion<br>
        Please reference: ${escape(data.invoiceNumber)}
      </p>
    </div>

    <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #777; font-size: 14px;">
      If you have any questions about this invoice, please reply to this email.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p style="margin: 0;">Thank you for your business!</p>
    <p style="margin: 8px 0 0;">Odd Jobs - Manchester & Surrounding Areas</p>
  </div>
</body>
</html>
  `.trim();
}
