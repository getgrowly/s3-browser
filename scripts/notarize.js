/**
 * Apple Notarization Script
 *
 * This script handles macOS app notarization using Apple's notarytool.
 * Notarization is required for apps distributed outside the Mac App Store
 * to avoid Gatekeeper warnings.
 *
 * Prerequisites:
 * 1. Apple Developer Account ($99/year)
 * 2. App-specific password from https://appleid.apple.com
 * 3. Environment variables set (see below)
 *
 * Environment Variables Required:
 * - APPLE_ID: Your Apple ID email
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password
 * - APPLE_TEAM_ID: Your Team ID from Apple Developer
 *
 * Usage:
 * This script is automatically called by electron-builder via afterSign hook.
 */

const { notarize } = require('@electron/notarize');
const { build } = require('../../package.json');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    console.log('⏭️  Skipping notarization (not macOS)');
    return;
  }

  // Skip notarization in local builds
  if (process.env.CI !== 'true') {
    console.log('⏭️  Skipping notarization (not in CI environment)');
    console.log('ℹ️  To enable: Set CI=true and provide Apple credentials');
    return;
  }

  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const appleTeamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !appleTeamId) {
    console.log('⏭️  Skipping notarization (missing Apple credentials)');
    console.log('ℹ️  Required environment variables:');
    console.log('   - APPLE_ID');
    console.log('   - APPLE_APP_SPECIFIC_PASSWORD');
    console.log('   - APPLE_TEAM_ID');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log('🍎 Starting macOS notarization...');
  console.log(`   App: ${appName}`);
  console.log(`   Path: ${appPath}`);
  console.log(`   Team ID: ${appleTeamId}`);

  try {
    await notarize({
      tool: 'notarytool',
      appPath,
      appleId,
      appleIdPassword,
      teamId: appleTeamId,
    });

    console.log('✅ Notarization successful!');
    console.log('   Users can now install without Gatekeeper warnings');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
