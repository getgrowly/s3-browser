#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Update README.md with the latest version from package.json
 * This script is run during the semantic-release process
 */

const fs = require("fs")
const path = require("path")

// Read package.json to get the version
const packageJsonPath = path.join(__dirname, "../package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
const version = packageJson.version

console.log(`Updating README.md with version ${version}...`)

// Read README.md
const readmePath = path.join(__dirname, "../README.md")
let readme = fs.readFileSync(readmePath, "utf8")

// Replace {version} placeholders with actual version
readme = readme.replace(/\{version\}/g, version)

// Write back to README.md
fs.writeFileSync(readmePath, readme, "utf8")

console.log("README.md updated successfully!")
