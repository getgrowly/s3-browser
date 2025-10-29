# 🔧 Repository Rulesets Bypass Configuration

## ✅ Good News

Your GitHub App token is working! 🎉

We can see from the logs:
```
Using: GitHub App Token ✅
```

## ❌ The Problem

However, your GitHub App doesn't have permission to bypass repository rulesets:

```
Error: pre_receive Repository rule violations found
Cannot create ref due to creations being restricted
```

## 🎯 Solution: Configure Bypass Access

You need to add your GitHub App to the **bypass list** for your repository rulesets.

### Step 1: Go to Repository Rulesets

**Direct link:** https://github.com/getgrowly/s3-browser/settings/rules

### Step 2: Find and Edit the Active Ruleset

1. You should see a ruleset (probably for the **"main"** branch)
2. Click the **"Edit"** button next to it

### Step 3: Add Bypass Actor

1. Scroll down to the **"Bypass list"** section
2. Click **"Add bypass"** button
3. In the dropdown, select one of:
   - **"Repository apps"** → Select your GitHub App
   OR
   - **"Deploy keys"** → Add `github-actions[bot]`

### Step 4: Save Changes

- Click **"Save changes"**
- Changes take effect immediately

## 🔍 Alternative: Give GitHub App Administration Permission

If the above doesn't work, you may need to give your GitHub App "Administration" permission:

### Step 1: Go to GitHub App Settings

**Link:** https://github.com/settings/apps

### Step 2: Click on Your App

Go to "Permissions & events" tab

### Step 3: Update Repository Permissions

Find **"Administration"** and set it to "Read-only" or "Read and write"

⚠️ **Note:** This is a broader permission. The bypass list method above is more secure.

### Step 4: Save and Accept

1. Click "Save changes"
2. Go to your repository and "Accept new permissions"

## 📊 Understanding Repository Rulesets

Repository rulesets are the new and more powerful version of branch protection:

- ✅ More flexible
- ✅ Can apply to multiple branches
- ✅ More granular control
- ⚠️ But require explicit bypass configuration

## 🔍 How to Check Current Settings

### View Active Rulesets:

1. **Repository → Settings → Rules**
2. Look at the "Rulesets" tab
3. You'll see all active rulesets

### Check Bypass List:

1. Click on a ruleset
2. Find the "Bypass list" section
3. Is your GitHub App listed?

## ✅ Verify the Fix

After making the changes:

**Option 1: Re-run the workflow**
1. Go to: https://github.com/getgrowly/s3-browser/actions
2. Click on the latest run
3. Click "Re-run all jobs"

**Option 2: Push a new commit**
```bash
git commit -m "test: verify GitHub App bypass works" --allow-empty
git push
```

## 🎯 Expected Result

After fixing, you should see:

```
✅ Generate GitHub App Token - Success
✅ Using: GitHub App Token
✅ Create release PR - Success
✅ Tag created: v1.0.2
✅ Release created: v1.0.2
```

## ❓ Still Not Working?

### "Cannot create ref" Error Persists:

1. **Is GitHub App in bypass list?**
   - Settings → Rules → Click rule → Bypass list
   - Do you see your App listed?

2. **Is App installed to repository?**
   - https://github.com/settings/apps
   - Install App → Is s3-browser selected?

3. **Are permissions correct?**
   - Contents: Read and write ✅
   - Pull requests: Read and write ✅
   - (Optional) Administration: Read-only ✅

### "tag_name was used by an immutable release"

If you see this error:

1. **Check existing release:**
   - https://github.com/getgrowly/s3-browser/releases
   - Does v1.0.2 release exist?

2. **Manually merge the PR:**
   - https://github.com/getgrowly/s3-browser/pull/3
   - Merge PR #3
   - Release will be created automatically

## 📚 Additional Resources

- **GitHub Rulesets Docs:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- **GitHub App Permissions:** https://docs.github.com/en/apps/creating-github-apps/setting-up-a-github-app/choosing-permissions-for-a-github-app
- **Bypass Rulesets:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository#granting-bypass-permissions-for-rulesets

## 🎊 Summary

**Current Status:**
1. ✅ GitHub App working
2. ✅ Token generation successful
3. ❌ Repository rulesets blocking tag creation
4. 🔧 **Fix needed:** Add GitHub App to bypass list

**Quick Fix:**
- Settings → Rules → Edit rule → Bypass list → Add your GitHub App

Takes 5 minutes! 🚀
