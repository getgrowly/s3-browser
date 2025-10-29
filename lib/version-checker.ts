/**
 * Version Checker
 *
 * Checks GitHub releases for the latest version of the application
 * and compares it with the current version.
 */

export interface ReleaseInfo {
  version: string
  name: string
  publishedAt: string
  htmlUrl: string
  body: string
  prerelease: boolean
}

export interface VersionCheckResult {
  currentVersion: string
  latestVersion: string
  isUpdateAvailable: boolean
  releaseInfo?: ReleaseInfo
  error?: string
}

/**
 * Parse semantic version string (e.g., "1.0.1" or "v1.0.1")
 */
function parseVersion(version: string): number[] {
  const cleaned = version.replace(/^v/, "")
  return cleaned.split(".").map((num) => parseInt(num, 10) || 0)
}

/**
 * Compare two semantic versions
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = parseVersion(a)
  const bParts = parseVersion(b)

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0
    const bPart = bParts[i] || 0

    if (aPart > bPart) {
      return 1
    }
    if (aPart < bPart) {
      return -1
    }
  }

  return 0
}

/**
 * Fetch the latest release from GitHub
 */
async function fetchLatestRelease(owner: string, repo: string): Promise<ReleaseInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      console.warn(`GitHub API returned ${response.status}: ${response.statusText}`)
      return null
    }

    const data = await response.json()

    return {
      version: data.tag_name,
      name: data.name || data.tag_name,
      publishedAt: data.published_at,
      htmlUrl: data.html_url,
      body: data.body || "",
      prerelease: data.prerelease || false,
    }
  } catch (error) {
    console.error("Failed to fetch latest release from GitHub:", error)
    return null
  }
}

/**
 * Get current application version
 * Works in both browser and Electron environments
 */
async function getCurrentVersion(): Promise<string> {
  // Check if running in Electron
  if (typeof window !== "undefined" && window.electronAPI) {
    try {
      const version = await window.electronAPI.getVersion()
      return version
    } catch (error) {
      console.error("Failed to get version from Electron:", error)
    }
  }

  // Fallback to package.json version (for browser/dev environment)
  // In production, this should be replaced with the actual version from your build
  return process.env.NEXT_PUBLIC_APP_VERSION || "1.0.1"
}

/**
 * Check if a new version is available
 *
 * @param owner - GitHub repository owner (e.g., "getgrowly")
 * @param repo - GitHub repository name (e.g., "s3-browser")
 * @returns Version check result
 */
export async function checkForUpdates(owner: string, repo: string): Promise<VersionCheckResult> {
  try {
    const currentVersion = await getCurrentVersion()
    const releaseInfo = await fetchLatestRelease(owner, repo)

    if (!releaseInfo) {
      return {
        currentVersion,
        latestVersion: currentVersion,
        isUpdateAvailable: false,
        error: "Failed to fetch latest release information",
      }
    }

    const latestVersion = releaseInfo.version.replace(/^v/, "")
    const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0

    return {
      currentVersion,
      latestVersion,
      isUpdateAvailable,
      releaseInfo,
    }
  } catch (error) {
    console.error("Version check failed:", error)
    const currentVersion = await getCurrentVersion()

    return {
      currentVersion,
      latestVersion: currentVersion,
      isUpdateAvailable: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Get the download URL for the current platform
 */
export function getDownloadUrl(releaseInfo: ReleaseInfo): string {
  // Return the release page URL
  // Users can choose the appropriate download for their platform
  return releaseInfo.htmlUrl
}

/**
 * Format version for display
 */
export function formatVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`
}
