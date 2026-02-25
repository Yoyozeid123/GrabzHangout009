#!/bin/bash

# Quick setup script for content moderation

echo "🚀 Setting up content moderation for GrabzHangout009..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from the GrabzHangout009/GrabzHangout009 directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✨ Setup complete! Read MODERATION_SETUP.md for details."
echo ""
echo "✅ No AWS or credit card needed!"
echo "✅ Simple keyword filter blocks bad words"
echo "✅ Delete button lets you remove any message"
echo ""
echo "To start the app:"
echo "  npm run dev"
echo ""
