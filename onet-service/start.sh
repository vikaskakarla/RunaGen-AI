#!/bin/bash

echo "======================================"
echo "🚀 O*NET Data Service - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file"
    echo ""
    echo "📝 Please edit .env and add your O*NET credentials:"
    echo "   1. Get credentials from: https://services.onetcenter.org/"
    echo "   2. Update ONET_USERNAME and ONET_PASSWORD in .env"
    echo "   3. Update MONGO_URI with your MongoDB connection"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if credentials are configured
if grep -q "your_username_here" .env || grep -q "your_password_here" .env; then
    echo "❌ O*NET credentials not configured!"
    echo ""
    echo "Please update your .env file with:"
    echo "   ONET_USERNAME=your_actual_username"
    echo "   ONET_PASSWORD=your_actual_password"
    echo ""
    echo "Get credentials from: https://services.onetcenter.org/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "What would you like to do?"
echo ""
echo "0. Test API connection - RECOMMENDED FIRST"
echo "1. Test import (10 occupations)"
echo "2. Import 2000 occupations (takes ~30-40 minutes)"
echo "3. Import all occupations (~1000 total)"
echo "4. Check database statistics"
echo "5. Start API server"
echo "6. Exit"
echo ""
read -p "Enter your choice (0-6): " choice

case $choice in
    0)
        echo ""
        echo "🧪 Testing O*NET API connection..."
        npm test
        ;;
    1)
        echo ""
        echo "🧪 Starting test import (10 occupations)..."
        echo "This will help verify your setup is working correctly."
        echo ""
        npm run import:test
        ;;
    2)
        echo ""
        echo "⚠️  This will import 2000 occupations and take 30-40 minutes."
        echo "The process includes rate limiting (1 second between requests)."
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🚀 Starting import of 2000 occupations..."
            npm run import:2000
        else
            echo "Import cancelled."
        fi
        ;;
    3)
        echo ""
        echo "⚠️  This will import ALL occupations (~1000) and take ~20-30 minutes."
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🚀 Starting full import..."
            npm run import:all
        else
            echo "Import cancelled."
        fi
        ;;
    4)
        echo ""
        echo "📊 Checking database statistics..."
        npm run stats
        ;;
    5)
        echo ""
        echo "🌐 Starting API server..."
        echo "Server will run on: http://localhost:3002"
        echo ""
        echo "Test endpoints:"
        echo "  - http://localhost:3002/health"
        echo "  - http://localhost:3002/api/stats"
        echo "  - http://localhost:3002/api/occupations"
        echo ""
        npm start
        ;;
    6)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "✅ Done!"
echo "======================================"
