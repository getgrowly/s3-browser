# 🚨 Quick Fix: GitHub Actions PR Permission Error

## Error Message
```
Error: release-please failed: GitHub Actions is not permitted to create or approve pull requests.
```

## ✅ Solution (Takes 30 seconds)

### Step 1: Go to Repository Settings
Visit: **https://github.com/getgrowly/s3-browser/settings/actions**

### Step 2: Enable Workflow Permissions
Scroll down to **"Workflow permissions"** and:

1. ✅ Select **"Read and write permissions"**
2. ✅ Check **"Allow GitHub Actions to create and approve pull requests"**
3. Click **"Save"**

That's it! Your next workflow run will work.

---

## Why This Happens

By default, GitHub Actions workflows can only read the repository. To create pull requests (which release-please needs to do), you must explicitly grant this permission at the repository level.

## What This Enables

Once enabled, release-please will:
- ✅ Create automated release PRs with version bumps
- ✅ Update CHANGELOG.md automatically
- ✅ Create GitHub releases when PR is merged
- ✅ Trigger build workflows

## Security Note

This setting only affects workflows in **this repository**. It's safe to enable for your own repositories. The workflow still cannot:
- ❌ Access other repositories
- ❌ Modify organization settings
- ❌ Access secrets from other repos

---

## Alternative: Use Personal Access Token

If you prefer not to enable this setting, see `.github/SETUP_GITHUB_TOKEN.md` for instructions on using a Personal Access Token instead.
