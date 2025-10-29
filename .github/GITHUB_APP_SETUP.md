# 🤖 GitHub App Setup for Automated Releases

## Why GitHub App?

Using a GitHub App is the **most secure and recommended approach**:

✅ **More secure:** Tokens are short-lived (1 hour)
✅ **Repository-specific:** Only access to this repo
✅ **Bypass branch protection:** Can create tags/releases automatically
✅ **Organization-level management:** Not tied to personal account
✅ **Better audit trail:** Clear attribution of actions

## 📋 What You Need

From your existing GitHub App:

1. **App ID** - Your GitHub App's numeric ID
2. **Private Key** - Your GitHub App's private key (.pem file)

## 🔧 Setup Steps

### Step 1: Verify GitHub App Permissions

Your GitHub App needs these permissions:

**Repository Permissions:**
- ✅ **Contents:** Read and write
- ✅ **Metadata:** Read-only
- ✅ **Pull requests:** Read and write
- ✅ **Issues:** Read and write (optional)

**To check/update permissions:**
1. Go to: https://github.com/settings/apps
2. Click on your App name
3. Go to "Permissions & events" tab
4. Verify the permissions above
5. If you made changes: "Save changes" → "Accept new permissions"

### Step 2: Get Your App ID

1. Go to: https://github.com/settings/apps
2. Click on your App name
3. In the "General" tab, find **App ID** (e.g., `123456`)
4. Copy this number

### Step 3: Get Private Key

If you don't have the private key:

1. Go to: https://github.com/settings/apps
2. Click on your App name
3. Scroll to "Private keys" section
4. Click "Generate a private key"
5. A `.pem` file will download
6. **Keep this file secure!**

If you already have it, use your existing `.pem` file.

### Step 4: Install App to Repository

1. Go to: https://github.com/settings/apps
2. Click on your App name
3. Go to "Install App" tab
4. Find "getgrowly" organization → ⚙️ → "Configure"
5. Under "Repository access":
   - Select "Only select repositories"
   - Choose "s3-browser"
6. Click "Save"

### Step 5: Add Secrets to Repository

**Direct link:** https://github.com/getgrowly/s3-browser/settings/secrets/actions/new

Add two secrets:

#### Secret 1: APP_ID

- **Name:** `APP_ID`
- **Secret:** Your App ID number (e.g., `123456`)
- Click "Add secret"

#### Secret 2: APP_PRIVATE_KEY

- **Name:** `APP_PRIVATE_KEY`
- **Secret:** Paste the **entire contents** of your `.pem` file
  ```
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA...
  (all lines)
  ...
  -----END RSA PRIVATE KEY-----
  ```
- Click "Add secret"

⚠️ **IMPORTANT:** Copy the entire key including the `-----BEGIN/END-----` lines!

## ✅ Test It

After adding secrets, test it:

```bash
git commit -m "feat: test GitHub App release automation" --allow-empty
git push
```

The workflow should:
1. ✅ Generate GitHub App token
2. ✅ Bypass branch protection
3. ✅ Create release PR automatically
4. ✅ Add tags automatically

## 🔍 How It Works

The workflow uses a priority fallback system:

```yaml
token: ${{ steps.generate_token.outputs.token || secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}
```

1. **GitHub App token exists?** → Most secure, use it ✅
2. **PAT exists?** → Use that
3. **Only GITHUB_TOKEN?** → Last resort (might fail with branch protection)

## 🔒 Security Notes

- ✅ Tokens auto-expire after 1 hour
- ✅ Private key is encrypted by GitHub
- ✅ Only accessible by workflows in this repository
- ✅ App permissions can be changed anytime
- ⚠️ NEVER commit the private key in code
- ⚠️ NEVER share the private key value

## ❓ Troubleshooting

### "Error: Input required and not supplied: private-key"

Check your secret:
- Name must be exactly: `APP_PRIVATE_KEY`
- Value must include BEGIN/END lines
- Copy the entire `.pem` file contents

### "Error: Cannot create ref due to creations being restricted"

Check App permissions:
1. Contents: Read and write ✅
2. Pull requests: Read and write ✅
3. Is App installed on the repository? ✅

### "Error: Resource not accessible by integration"

App is not installed on repository:
1. GitHub App → Install App tab
2. Configure → Select s3-browser
3. Save

### Still having issues?

1. **Verify App ID:** Check it matches your App
2. **Regenerate private key:** Generate a new one if needed
3. **Reinstall App:** Remove and reinstall to repository
4. **Check logs:** Go to Actions tab to see detailed errors

## 🔄 Rotating Private Key

If you need to rotate the private key:

1. Generate a new private key from GitHub App settings
2. Update the `APP_PRIVATE_KEY` secret with new value
3. Old key will stop working immediately
4. No code changes needed!

## 📚 See Also

- Turkish documentation: `.github/GITHUB_APP_SETUP_TR.md`
- PAT alternative: `.github/SETUP_GITHUB_TOKEN.md`
- Quick fix guide: `.github/QUICK_FIX.md`

## 🎉 Done!

Once configured, your GitHub App will handle all releases automatically! 🚀

Every push with conventional commits will:
1. Generate short-lived token
2. Create release PR
3. Update CHANGELOG
4. Create tags/releases
5. Trigger builds

All completely automated! 🎊
