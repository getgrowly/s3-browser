# Create GitHub Release for v1.0.1

## Quick Fix (2 minutes)

The v1.0.1 tag now exists, but you need to create a GitHub Release for it.

### Step 1: Go to Create Release Page

**Direct link:** https://github.com/getgrowly/s3-browser/releases/new?tag=v1.0.1&title=v1.0.1

### Step 2: Fill in the Release Form

The link above should pre-fill most fields. Just verify:

- **Tag:** `v1.0.1` ✅ (already selected)
- **Title:** `v1.0.1` ✅ (already filled)
- **Description:** Copy this:

```markdown
## What's Changed

### Bug Fixes
* Multiple updates and improvements

**Full Changelog**: https://github.com/getgrowly/s3-browser/compare/v1.0.0...v1.0.1

---

## 📦 Installation

Download the appropriate installer for your platform from the assets below.

### macOS
- **Apple Silicon (M1/M2/M3):** Download `Growly-S3-1.0.1-arm64.dmg`
- **Intel:** Download `Growly-S3-1.0.1-x64.dmg`

### Linux
- **Ubuntu/Debian:** Download `.deb` file
- **Red Hat/Fedora:** Download `.rpm` file
- **AppImage:** Download `.AppImage` file (works on all distros)

### Windows
- **Installer:** Download `.exe` file
- **Portable:** Download `portable.exe` file
```

### Step 3: Publish

Click **"Publish release"** button at the bottom.

## Why This is Needed

Release-please checks GitHub Releases (not just git tags) to determine:
- What the previous version was
- What commits to include in the changelog
- What version to bump to next

Without a GitHub Release, it fails with "Invalid previous_tag parameter".

## After Publishing

Once you publish the release:

1. Release-please will work correctly on the next push
2. The build workflow will be triggered for v1.0.1 (creating installers)
3. Future commits will create proper release PRs

## Alternative: Use GitHub CLI (if you have it)

If you have `gh` CLI installed:

```bash
gh release create v1.0.1 \
  --title "v1.0.1" \
  --notes "## What's Changed

### Bug Fixes
* Multiple updates and improvements

**Full Changelog**: https://github.com/getgrowly/s3-browser/compare/v1.0.0...v1.0.1"
```

## Need Help?

If you get stuck, you can also:
1. Go to https://github.com/getgrowly/s3-browser/releases
2. Click "Draft a new release"
3. Select tag `v1.0.1` from dropdown
4. Fill in title and description
5. Click "Publish release"
