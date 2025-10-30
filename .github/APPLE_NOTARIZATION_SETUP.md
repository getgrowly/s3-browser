# 🍎 Apple Notarization Setup Guide

## What is Notarization?

Apple notarization is a security feature that scans your app for malicious content and verifies it's from a trusted developer. **Without notarization, macOS users will see "damaged" warnings.**

## Benefits

✅ **No "damaged" warnings** - Users can open the app directly
✅ **No Gatekeeper bypass** - No need for `xattr` commands
✅ **Professional distribution** - Shows your app is trusted
✅ **Automatic in CI/CD** - No manual steps after setup

## Prerequisites

### 1. Apple Developer Account

**Cost:** $99/year

**Sign up:** https://developer.apple.com/programs/

You need this to:
- Get a code signing certificate
- Access notarization service
- Distribute outside Mac App Store

### 2. Code Signing Certificate

**Steps:**
1. Open Xcode
2. Go to **Xcode → Settings → Accounts**
3. Add your Apple ID
4. Click **"Manage Certificates"**
5. Click **"+"** → **"Developer ID Application"**
6. Certificate will be created and installed

**Export Certificate for CI:**
```bash
# Export certificate as .p12 file
# Keychain Access → My Certificates → Right-click certificate → Export

# Convert to base64 for GitHub Secrets
base64 -i certificate.p12 -o certificate.base64

# Note the password you set during export
```

### 3. App-Specific Password

**Why needed:** 2FA prevents using your main password in automation

**Steps:**
1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to **"Security"** section
4. Click **"App-Specific Passwords"**
5. Click **"+"** to generate new password
6. Label it: "Growly S3 Notarization"
7. **Copy the generated password** (you can't see it again!)

### 4. Get Your Team ID

**Method 1:** From developer.apple.com
1. Go to https://developer.apple.com/account
2. Click **"Membership details"**
3. Copy your **"Team ID"** (10-character alphanumeric)

**Method 2:** From terminal
```bash
security find-identity -v -p codesigning
# Look for: "Developer ID Application: Your Name (TEAM_ID_HERE)"
```

## Setting Up GitHub Secrets

Add these secrets to your GitHub repository:

**Path:** `https://github.com/getgrowly/s3-browser/settings/secrets/actions`

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `APPLE_ID` | Your Apple ID email | `developer@example.com` |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com | `abcd-efgh-ijkl-mnop` |
| `APPLE_TEAM_ID` | Your Team ID | `AB12CD34EF` |
| `CSC_LINK` | Base64-encoded certificate (.p12) | `MIIKxAIBAz...` |
| `CSC_KEY_PASSWORD` | Certificate password | `your-p12-password` |

### How to Add Secrets

```bash
# 1. CSC_LINK (base64 certificate)
cat certificate.base64
# Copy output and paste as CSC_LINK secret

# 2. CSC_KEY_PASSWORD
# The password you set when exporting certificate

# 3. APPLE_ID
# Your Apple ID email

# 4. APPLE_APP_SPECIFIC_PASSWORD
# The app-specific password you generated

# 5. APPLE_TEAM_ID
# Your 10-character Team ID
```

## How It Works

### Build Process Flow

```
1. GitHub Actions triggers on release
2. Electron builder signs the app with your certificate (CSC_LINK + CSC_KEY_PASSWORD)
3. afterSign hook calls scripts/notarize.js
4. Script uploads app to Apple for notarization
5. Apple scans app (~2-5 minutes)
6. Apple staples notarization ticket to app
7. DMG is created with notarized app
8. Upload to GitHub Releases
```

### Local Development

**No certificate needed!** The script automatically:
- Detects `CI !== 'true'`
- Skips notarization
- Uses ad-hoc signing (identity: "-")
- App works locally but will show "damaged" when distributed

### CI/CD (GitHub Actions)

**Automatic when secrets are set:**
- Detects `CI === 'true'`
- Checks for Apple credentials
- Signs with Developer ID certificate
- Notarizes with Apple
- Creates distributable DMG

## Testing Notarization

### 1. Check if App is Notarized

```bash
# After downloading DMG
spctl -a -vv "/Applications/Growly S3.app"

# Success output:
# /Applications/Growly S3.app: accepted
# source=Notarized Developer ID

# Failure output:
# /Applications/Growly S3.app: rejected
# source=Unnotarized
```

### 2. Check Notarization Ticket

```bash
stapler validate "/Applications/Growly S3.app"

# Success output:
# The validate action worked!

# Failure output:
# The staple and validate action failed!
```

### 3. View Notarization Info

```bash
spctl -a -vv -t install "/Applications/Growly S3.app"

# Shows detailed notarization information
```

## Troubleshooting

### "afterSign timed out"

**Cause:** Apple's notarization service is slow or unavailable

**Solution:**
- Wait and retry (usually 2-5 minutes)
- Check https://developer.apple.com/system-status
- Increase timeout in electron-builder config

### "Invalid credentials"

**Cause:** Wrong Apple ID, password, or Team ID

**Solution:**
- Verify APPLE_ID is correct email
- Regenerate app-specific password
- Double-check APPLE_TEAM_ID (10 characters)
- Test locally: `xcrun notarytool history --apple-id YOUR_ID --team-id YOUR_TEAM`

### "Invalid certificate"

**Cause:** Certificate not valid for Developer ID

**Solution:**
- Certificate must be "Developer ID Application"
- Not "Mac Developer" or "Mac App Distribution"
- Re-export from Keychain Access
- Verify expiration date

### "App not signed"

**Cause:** CSC_LINK or CSC_KEY_PASSWORD incorrect

**Solution:**
- Re-export certificate as .p12
- Convert to base64 correctly
- Update GitHub secret
- Check password matches

## Cost Breakdown

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Yearly |
| Certificate | Included | With membership |
| Notarization | Free | Unlimited |
| **Total** | **$99/year** | |

## Alternative: Without Apple Developer Account

If you don't want to pay $99/year:

**Current Setup:**
- ✅ Ad-hoc signing (free)
- ✅ DMG with "Fix Gatekeeper.command" script
- ⚠️ Users need to run script once
- ⚠️ Shows "damaged" warning initially

**With Notarization:**
- ✅ No warnings at all
- ✅ Professional distribution
- ✅ Automatic trust
- 💰 $99/year

## Next Steps

1. ✅ Sign up for Apple Developer Program
2. ✅ Create code signing certificate
3. ✅ Generate app-specific password
4. ✅ Get Team ID
5. ✅ Add secrets to GitHub
6. ✅ Push a commit and watch it work!

## Resources

- **Apple Notarization Guide:** https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
- **Electron Notarization:** https://www.electron.build/configuration/mac#notarization
- **@electron/notarize Docs:** https://github.com/electron/notarize

## Questions?

If you have questions about this setup, please open an issue or discussion!

---

**Made with ❤️ for Growly S3**
