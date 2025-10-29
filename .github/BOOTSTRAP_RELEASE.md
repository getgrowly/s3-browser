# Bootstrap GitHub Release for v1.0.0

## Issue
Release-please is failing because the `v1.0.0` git tag exists, but there's no corresponding GitHub Release object.

## Solution

You need to create a GitHub Release for v1.0.0 to bootstrap the release-please process.

### Option 1: Via GitHub Web Interface (Easiest)

1. Go to: https://github.com/getgrowly/s3-browser/releases/new
2. Fill in the form:
   - **Tag:** `v1.0.0` (select existing tag)
   - **Release title:** `v1.0.0`
   - **Description:** Copy from CHANGELOG.md or use:
     ```
     ## Initial Release

     Multi-platform S3 Browser Desktop Application

     ### Features
     - Browse S3 buckets and objects
     - Multi-platform support (macOS, Linux, Windows)
     - Offline caching
     - File preview and download
     ```
3. Click **"Publish release"**

### Option 2: Via GitHub CLI (if installed)

```bash
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "## Initial Release

Multi-platform S3 Browser Desktop Application

### Features
- Browse S3 buckets and objects
- Multi-platform support (macOS, Linux, Windows)
- Offline caching
- File preview and download"
```

### Option 3: Via API

```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/getgrowly/s3-browser/releases \
  -d '{
    "tag_name": "v1.0.0",
    "name": "v1.0.0",
    "body": "Initial Release",
    "draft": false,
    "prerelease": false
  }'
```

## After Creating the Release

Once the GitHub Release for v1.0.0 exists:

1. The next push to `main` with conventional commits will trigger release-please
2. Release-please will create a PR for the next version (e.g., v1.0.1 or v1.1.0)
3. Everything will work smoothly!

## Alternative: Start Fresh from v1.0.1

If you don't want to create a release for v1.0.0, you can:

1. Update `.release-please-manifest.json` to `"1.0.1"`
2. Update `package.json` version to `"1.0.1"`
3. Create a new tag and release for v1.0.1

But creating a release for v1.0.0 is cleaner and preserves your version history.
