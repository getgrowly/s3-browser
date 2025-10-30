#!/bin/bash

# Growly S3 Installation Helper
# This script removes the quarantine flag from the application

echo "🚀 Growly S3 - Installation Helper"
echo ""
echo "This script will remove macOS quarantine restrictions."
echo ""

APP_PATH="/Applications/Growly S3.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: Growly S3.app not found in Applications folder"
    echo ""
    echo "Please drag Growly S3 to your Applications folder first."
    exit 1
fi

echo "📦 Found: $APP_PATH"
echo "🔓 Removing quarantine flag..."

xattr -cr "$APP_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Success! You can now open Growly S3 from Applications."
    echo ""
    echo "Press any key to exit..."
    read -n 1
else
    echo "❌ Failed to remove quarantine flag."
    echo ""
    echo "Please run this command manually in Terminal:"
    echo "xattr -cr \"/Applications/Growly S3.app\""
    echo ""
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi
