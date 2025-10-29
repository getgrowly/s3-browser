# Setting up Personal Access Token for Release-Please

## ⚠️ When You MUST Use a PAT

You MUST create a PAT if you see this error:

```
Error: release-please failed: Validation Failed:
"Cannot create ref due to creations being restricted"
```

This happens when you have **branch protection rules** that prevent GitHub Actions from creating tags/releases.

## 1. Create a Personal Access Token (Classic)

1. Go to: https://github.com/settings/tokens/new
2. Set the following:
   - **Note:** `Release Please Token`
   - **Expiration:** `No expiration` (or your preferred duration)
   - **Scopes:** Select these permissions:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
     - ✅ `admin:repo_hook` (Full control of repository hooks) **← REQUIRED for branch protection bypass**

3. Click "Generate token"
4. **Copy the token** (you won't see it again!)

## 2. Add Token to Repository Secrets

1. Go to your repository: `https://github.com/getgrowly/s3-browser`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Set:
   - **Name:** `RELEASE_PLEASE_TOKEN`
   - **Secret:** Paste your token from step 1
5. Click **"Add secret"**

## 3. Verify Token is Being Used

The workflow is already configured to use `RELEASE_PLEASE_TOKEN` if available. After adding the secret:

1. Push a commit with conventional format:
   ```bash
   git commit -m "feat: test release automation"
   git push
   ```

2. Check the workflow run: https://github.com/getgrowly/s3-browser/actions

3. It should now succeed in creating tags and releases!

## 🔍 How It Works

The workflow uses a fallback mechanism:

```yaml
token: ${{ secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}
```

- If `RELEASE_PLEASE_TOKEN` exists → Uses PAT (bypasses branch protection) ✅
- If not → Falls back to `GITHUB_TOKEN` (might fail with branch protection) ⚠️

## 🔒 Security Notes

- ✅ PAT is stored as a secret (encrypted at rest)
- ✅ Only accessible by workflows in this repository
- ✅ Can be revoked anytime at: https://github.com/settings/tokens
- ⚠️ NEVER commit the token in code
- ⚠️ NEVER share the token value

## ❓ Troubleshooting

### Still getting "Cannot create ref" error?

1. **Check token permissions:** Make sure `admin:repo_hook` is enabled
2. **Check secret name:** Must be exactly `RELEASE_PLEASE_TOKEN`
3. **Check branch protection:** Consider allowing Actions to bypass:
   - Go to: Repository Settings → Branches → Branch protection rules
   - Edit the rule for `main`
   - Enable: "Allow specified actors to bypass required pull requests"
   - Add: `github-actions[bot]`

### Token expired?

1. Generate a new token with same permissions
2. Update the `RELEASE_PLEASE_TOKEN` secret with new value
3. No code changes needed!

## 📚 See Also

- Turkish documentation: `.github/COZUM_TR.md`
- Quick fix guide: `.github/QUICK_FIX.md`
