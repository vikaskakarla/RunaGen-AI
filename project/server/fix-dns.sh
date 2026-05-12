#!/bin/bash

# Script to configure DNS for MongoDB Atlas connectivity
# This adds Cloudflare and Google DNS servers to your network configuration

echo "🔧 Configuring DNS for MongoDB Atlas connectivity..."
echo ""

# Get the active network service (Wi-Fi or Ethernet)
NETWORK_SERVICE=$(networksetup -listallnetworkservices | grep -v "An asterisk" | head -n 2 | tail -n 1)

echo "📡 Active Network Service: $NETWORK_SERVICE"
echo ""

# Get current DNS servers
echo "Current DNS Servers:"
networksetup -getdnsservers "$NETWORK_SERVICE"
echo ""

# Set new DNS servers (Cloudflare primary, Google secondary)
echo "Setting new DNS servers..."
echo "  - 1.1.1.1 (Cloudflare Primary)"
echo "  - 1.0.0.1 (Cloudflare Secondary)"
echo "  - 8.8.8.8 (Google DNS)"
echo "  - 8.8.4.4 (Google DNS Secondary)"
echo ""

sudo networksetup -setdnsservers "$NETWORK_SERVICE" 1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4

echo "✅ DNS servers updated!"
echo ""
echo "New DNS Servers:"
networksetup -getdnsservers "$NETWORK_SERVICE"
echo ""

# Flush DNS cache
echo "🔄 Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

echo ""
echo "✅ DNS configuration complete!"
echo "🎉 MongoDB Atlas should now work with or without VPN"
echo ""
echo "To verify, run: nslookup cluster0runagen.dbw0rxl.mongodb.net"
