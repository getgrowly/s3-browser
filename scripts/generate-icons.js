#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Icon Generation Script for Electron
 *
 * This script generates platform-specific icon files from the S3 logo PNG.
 * It creates .icns for macOS, .ico for Windows, and copies the PNG for Linux.
 *
 * Requirements:
 * - png2icons package (npm install -g png2icons) OR
 * - Native tools (iconutil for macOS, ImageMagick for cross-platform)
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const PUBLIC_DIR = path.join(__dirname, "..", "public")
const SOURCE_ICON = path.join(PUBLIC_DIR, "s3-logo.png")
const ICON_ICNS = path.join(PUBLIC_DIR, "icon.icns")
const ICON_ICO = path.join(PUBLIC_DIR, "icon.ico")
const ICON_PNG = path.join(PUBLIC_DIR, "icon.png")

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
}

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkSourceIcon() {
  log("Checking for source icon...", "cyan")

  if (!fs.existsSync(SOURCE_ICON)) {
    log(`❌ Source icon not found: ${SOURCE_ICON}`, "red")
    log("Please make sure s3-logo.png exists in the public directory.", "yellow")
    process.exit(1)
  }

  log("✓ Source icon found", "green")
}

function checkPng2icons() {
  try {
    execSync("png2icons-cli", { stdio: "pipe" })
    return true
  } catch (error) {
    return false
  }
}

function checkImageMagick() {
  try {
    execSync("magick --version", { stdio: "pipe" })
    return true
  } catch (error) {
    try {
      execSync("convert --version", { stdio: "pipe" })
      return true
    } catch (error) {
      return false
    }
  }
}

function generateWithPng2icons() {
  log("\nUsing png2icons to generate icons...", "cyan")

  try {
    // Generate both .icns and .ico
    log("Generating icons for all platforms...", "blue")
    execSync(`png2icons-cli "${SOURCE_ICON}" "${path.join(PUBLIC_DIR, "icon")}" -allwe -i`, { stdio: "inherit" })
    log("✓ icon.icns generated", "green")
    log("✓ icon.ico generated", "green")

    return true
  } catch (error) {
    log("❌ Failed to generate icons with png2icons", "red")
    return false
  }
}

function generateWithImageMagick() {
  log("\nUsing ImageMagick to generate icons...", "cyan")

  try {
    const magickCmd = checkCommand("magick") ? "magick" : "convert"

    // Generate .ico for Windows
    log("Generating icon.ico for Windows...", "blue")
    execSync(`${magickCmd} "${SOURCE_ICON}" -define icon:auto-resize=256,128,64,48,32,16 "${ICON_ICO}"`, {
      stdio: "inherit",
    })
    log("✓ icon.ico generated", "green")

    return true
  } catch (error) {
    log("❌ Failed to generate icons with ImageMagick", "red")
    return false
  }
}

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "pipe" })
    return true
  } catch (error) {
    return false
  }
}

function generateMacOSIconWithIconutil() {
  if (process.platform !== "darwin") {
    log("⚠ Skipping .icns generation (not on macOS)", "yellow")
    return false
  }

  log("\nUsing iconutil to generate macOS icon...", "cyan")

  const iconsetDir = path.join(__dirname, "..", "icon.iconset")

  try {
    // Create iconset directory
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir)
    }

    // Generate all required sizes
    const sizes = [
      { size: 16, name: "icon_16x16.png" },
      { size: 32, name: "icon_16x16@2x.png" },
      { size: 32, name: "icon_32x32.png" },
      { size: 64, name: "icon_32x32@2x.png" },
      { size: 128, name: "icon_128x128.png" },
      { size: 256, name: "icon_128x128@2x.png" },
      { size: 256, name: "icon_256x256.png" },
      { size: 512, name: "icon_256x256@2x.png" },
      { size: 512, name: "icon_512x512.png" },
      { size: 1024, name: "icon_512x512@2x.png" },
    ]

    log("Generating icon sizes...", "blue")
    for (const { size, name } of sizes) {
      const outputPath = path.join(iconsetDir, name)
      execSync(`sips -z ${size} ${size} "${SOURCE_ICON}" --out "${outputPath}"`, { stdio: "pipe" })
    }

    log("Converting to .icns...", "blue")
    execSync(`iconutil -c icns "${iconsetDir}" -o "${ICON_ICNS}"`, { stdio: "inherit" })

    // Clean up
    fs.rmSync(iconsetDir, { recursive: true, force: true })

    log("✓ icon.icns generated", "green")
    return true
  } catch (error) {
    log(`❌ Failed to generate .icns: ${error.message}`, "red")

    // Clean up on error
    if (fs.existsSync(iconsetDir)) {
      fs.rmSync(iconsetDir, { recursive: true, force: true })
    }

    return false
  }
}

function copyLinuxIcon() {
  log("\nGenerating Linux icon...", "cyan")

  try {
    fs.copyFileSync(SOURCE_ICON, ICON_PNG)
    log("✓ icon.png copied", "green")
    return true
  } catch (error) {
    log(`❌ Failed to copy Linux icon: ${error.message}`, "red")
    return false
  }
}

function printSummary() {
  log(`\n${"=".repeat(60)}`, "cyan")
  log("Icon Generation Summary", "cyan")
  log("=".repeat(60), "cyan")

  const icons = [
    { path: ICON_ICNS, platform: "macOS", name: "icon.icns" },
    { path: ICON_ICO, platform: "Windows", name: "icon.ico" },
    { path: ICON_PNG, platform: "Linux", name: "icon.png" },
  ]

  let allGenerated = true

  for (const icon of icons) {
    const exists = fs.existsSync(icon.path)
    const status = exists ? "✓" : "✗"
    const color = exists ? "green" : "red"

    if (!exists) {
      allGenerated = false
    }

    log(`${status} ${icon.platform.padEnd(10)} ${icon.name}`, color)
  }

  log("=".repeat(60), "cyan")

  if (allGenerated) {
    log("\n✓ All icons generated successfully!", "green")
    log("\nYou can now build your Electron app:", "cyan")
    log("  npm run electron:build:mac", "blue")
    log("  npm run electron:build:win", "blue")
    log("  npm run electron:build:linux", "blue")
  } else {
    log("\n⚠ Some icons could not be generated.", "yellow")
    log("Please check the errors above and try manual generation.", "yellow")
    log("See ELECTRON_ICON_SETUP.md for manual instructions.", "cyan")
  }
}

function main() {
  log(`\n${"=".repeat(60)}`, "cyan")
  log("S3 Browser - Icon Generation Script", "cyan")
  log(`${"=".repeat(60)}\n`, "cyan")

  // Check if source icon exists
  checkSourceIcon()

  // Check available tools
  const hasPng2icons = checkPng2icons()
  const hasImageMagick = checkImageMagick()
  const hasIconutil = process.platform === "darwin"

  log("\nAvailable tools:", "cyan")
  log(`  png2icons:    ${hasPng2icons ? "✓" : "✗"}`, hasPng2icons ? "green" : "yellow")
  log(`  ImageMagick:  ${hasImageMagick ? "✓" : "✗"}`, hasImageMagick ? "green" : "yellow")
  log(`  iconutil:     ${hasIconutil ? "✓" : "✗"}`, hasIconutil ? "green" : "yellow")

  // Generate icons based on available tools
  let success = false

  if (hasPng2icons) {
    success = generateWithPng2icons()
  } else if (hasImageMagick) {
    success = generateWithImageMagick()

    // Generate macOS icon with iconutil if available
    if (hasIconutil) {
      generateMacOSIconWithIconutil()
    }
  } else if (hasIconutil) {
    // Only iconutil available (macOS only)
    generateMacOSIconWithIconutil()
    log("\n⚠ Cannot generate Windows .ico without ImageMagick or png2icons", "yellow")
    log("Install one of these tools:", "yellow")
    log("  npm install -g png2icons", "blue")
    log("  brew install imagemagick", "blue")
  } else {
    log("\n❌ No icon generation tools available!", "red")
    log("Please install one of the following:", "yellow")
    log("  npm install -g png2icons", "blue")
    log("  brew install imagemagick (macOS)", "blue")
    log("  apt-get install imagemagick (Linux)", "blue")
    log("  choco install imagemagick (Windows)", "blue")
    log("\nOr see ELECTRON_ICON_SETUP.md for manual instructions.", "cyan")
    process.exit(1)
  }

  // Always generate Linux icon (simple copy)
  copyLinuxIcon()

  // Print summary
  printSummary()
}

// Run the script
main()
