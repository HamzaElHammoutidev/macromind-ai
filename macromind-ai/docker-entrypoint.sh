#!/bin/sh
set -e

# Fix data directory permissions
if [ -d "/app/data" ]; then
    chown -R nextjs:nodejs /app/data
else
    mkdir -p /app/data
    chown -R nextjs:nodejs /app/data
fi

# Switch to nextjs user and run the command
exec su-exec nextjs "$@"
