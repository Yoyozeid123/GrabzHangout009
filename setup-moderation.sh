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

# Check for AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo ""
    echo "⚠️  AWS credentials not found in environment!"
    echo ""
    echo "Please set these environment variables:"
    echo "  export AWS_REGION='us-east-1'"
    echo "  export AWS_ACCESS_KEY_ID='your-access-key'"
    echo "  export AWS_SECRET_ACCESS_KEY='your-secret-key'"
    echo ""
    echo "Or create a .env file with these values."
    echo ""
else
    echo "✅ AWS credentials found!"
fi

echo ""
echo "✨ Setup complete! Read MODERATION_SETUP.md for details."
echo ""
echo "To start the app:"
echo "  npm run dev"
echo ""
