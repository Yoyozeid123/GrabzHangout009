#!/bin/bash

# Apply IP ban migration
echo "🔧 Adding IP address tracking to ban system..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    exit 1
fi

# Apply migration
psql "$DATABASE_URL" -f migrations/add_ip_to_banned_users.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo "📝 IP addresses will now be tracked when banning users"
else
    echo "❌ Migration failed"
    exit 1
fi
