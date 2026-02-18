# Google OAuth2 Setup for Email

This guide explains how to configure Google OAuth2 for sending emails through Gmail.

## Prerequisites

- A Gmail account (yabasfaw777@gmail.com)
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

## Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" if using Google Workspace)
3. Fill in the required information:
   - App name: "Lost & Found Platform"
   - User support email: yabasfaw777@gmail.com
   - Developer contact: yabasfaw777@gmail.com
4. Add scopes:
   - Click "Add or Remove Scopes"
   - Add: `https://mail.google.com/`
5. Add test users (if using External):
   - Add: yabasfaw777@gmail.com
6. Save and continue

## Step 3: Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**
7. Update `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Step 4: Generate Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, select "Gmail API v1"
6. Select `https://mail.google.com/`
7. Click "Authorize APIs"
8. Sign in with yabasfaw777@gmail.com
9. Click "Allow"
10. Click "Exchange authorization code for tokens"
11. Copy the **Refresh Token**
12. Update `.env`:
    ```
    GOOGLE_REFRESH_TOKEN=your_refresh_token_here
    ```

## Step 5: Verify Configuration

Your `.env` file should now have:

```env
EMAIL_USER=yabasfaw777@gmail.com
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwx
GOOGLE_REFRESH_TOKEN=1//0abcdefghijklmnopqrstuvwxyz...
```

## Step 6: Test Email Sending

Restart your backend server and test the email functionality:

```bash
npm run dev
```

Try registering a new user or requesting a password reset to verify emails are sent successfully.

## Troubleshooting

### Error: "invalid_grant"
- Your refresh token may have expired
- Regenerate the refresh token using OAuth Playground

### Error: "unauthorized_client"
- Ensure Gmail API is enabled
- Verify OAuth consent screen is configured
- Check that redirect URI matches exactly

### Error: "access_denied"
- Add your email as a test user in OAuth consent screen
- Ensure you're using the correct Google account

## Security Notes

- Never commit `.env` file to version control
- Keep your Client Secret and Refresh Token secure
- Rotate credentials periodically
- Use environment-specific credentials for production

## Alternative: App Passwords (Less Secure)

If OAuth2 setup is too complex, you can use Gmail App Passwords:

1. Enable 2-Step Verification on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Use basic SMTP configuration (not recommended for production)
