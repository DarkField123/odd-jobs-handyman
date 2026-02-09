# Email System Setup Guide

This guide explains how to set up the email functionality for quote confirmations and invoices.

## Overview

The email system uses:
- **Resend** - Email API service (3,000 emails/month free)
- **Firebase Cloud Functions** - Serverless backend to send emails
- **Firestore Triggers** - Automatically sends emails when documents are created

## Step 1: Set Up Resend

1. Go to [resend.com](https://resend.com) and create a free account
2. Verify your domain (or use their test domain `resend.dev` for development)
3. Go to **API Keys** and create a new API key
4. Copy the API key - you'll need it in Step 3

### Domain Verification (Production)
For production emails that don't go to spam:
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain** and enter your domain (e.g., `oddjobs.com`)
3. Add the DNS records Resend provides to your domain registrar
4. Wait for verification (usually a few minutes)

## Step 2: Firebase Service Account

You mentioned you created a new Firebase Admin service account. Here's what to do with it:

### Option A: Using Environment Variable (Recommended for Cloud Functions)

The service account JSON is only needed if you're running functions locally. For deployed functions, Firebase automatically provides credentials.

**For local development only:**
1. Download the service account JSON from Firebase Console > Project Settings > Service Accounts
2. Keep it secure - **NEVER commit it to git**
3. Set the environment variable:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"

   # Windows CMD
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json

   # Mac/Linux
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
   ```

### Option B: For Deployed Functions (No Action Needed)

When you deploy to Firebase, Cloud Functions automatically have access to Firestore using the default service account. You don't need to configure anything.

## Step 3: Set Resend API Key as Firebase Secret

Firebase secrets are secure environment variables for Cloud Functions:

```bash
# Navigate to your project
cd c:\Users\joshs\OneDrive\Documents\Projects\handyman

# Set the secret (you'll be prompted to enter the value)
firebase functions:secrets:set RESEND_API_KEY
```

When prompted, paste your Resend API key.

## Step 4: Update Email Sender Address

Edit `firebase/functions/src/email/resend.ts` and update the `from` address:

```typescript
// For testing (no domain verification needed):
from: 'Odd Jobs <onboarding@resend.dev>',

// For production (after domain verification):
from: 'Odd Jobs <hello@yourdomain.com>',
```

## Step 5: Deploy Cloud Functions

```bash
# Build and deploy functions
cd firebase/functions
npm run deploy
```

Or from the project root:
```bash
firebase deploy --only functions
```

## Step 6: Verify Deployment

1. Go to Firebase Console > Functions
2. You should see three functions:
   - `onSubmissionCreate` - Sends confirmation email when a quote is submitted
   - `onReplyCreate` - Sends email when admin replies to a quote
   - `onInvoiceCreate` - Sends invoice email to customers

## Troubleshooting

### "Failed to create invoice" Error

This usually means one of:
1. **Not logged in** - Make sure you're authenticated as admin
2. **Firestore rules** - Check that invoices collection allows write for admins
3. **Check browser console** - Open DevTools (F12) and look for the actual error

To check Firestore rules are deployed:
```bash
firebase deploy --only firestore:rules
```

### Emails Not Sending

1. Check Firebase Console > Functions > Logs for errors
2. Verify RESEND_API_KEY secret is set correctly
3. Make sure domain is verified in Resend (for production)

### Check Function Logs

```bash
firebase functions:log
```

Or view in Firebase Console > Functions > Logs

## Email Templates

Email templates are in `firebase/functions/src/email/templates.ts`:
- `confirmationEmailTemplate` - Quote submission confirmation
- `replyEmailTemplate` - Admin reply to customer
- `invoiceEmailTemplate` - Invoice sent to customer

## Local Development (Optional)

To test functions locally:

```bash
cd firebase/functions

# Start emulators
npm run serve
```

This requires the Firestore emulator to be set up.

## Security Notes

- **Never commit** the service account JSON file to git
- The `.gitignore` should already exclude `**/serviceAccountKey.json`
- Resend API key is stored securely as a Firebase secret
- Only admin users can trigger invoice/reply emails (protected by Firestore rules)

---

**Delete this file after setup is complete.**
