#!/bin/bash

# O*NET Setup Script
# This script helps you set up O*NET integration

echo "======================================"
echo "O*NET Integration Setup"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file first."
    exit 1
fi

# Check if O*NET credentials are configured
if grep -q "ONET_USERNAME=your_username_here" .env || grep -q "ONET_PASSWORD=your_password_here" .env; then
    echo "⚠️  O*NET credentials not configured!"
    echo ""
    echo "To get your O*NET API credentials:"
    echo "1. Visit: https://services.onetcenter.org/"
    echo "2. Click 'Register' and fill out the form"
    echo "3. Check your email for username and password"
    echo "4. Update your .env file with:"
    echo "   ONET_USERNAME=your_actual_username"
    echo "   ONET_PASSWORD=your_actual_password"
    echo ""
    read -p "Have you updated your credentials? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please update your credentials and run this script again."
        exit 1
    fi
fi

# Check MongoDB connection
if ! grep -q "MONGO_URI=mongodb" .env; then
    echo "❌ Error: MongoDB URI not configured!"
    echo "Please set MONGO_URI in your .env file."
    exit 1
fi

echo "✓ Configuration looks good!"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1. Test import (10 occupations)"
echo "2. Import specific occupations"
echo "3. Full import (all ~1000 occupations, takes 1-2 hours)"
echo "4. Check database stats"
echo "5. Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "Starting test import (10 occupations)..."
        node onet-data-importer.js --limit 10
        ;;
    2)
        echo ""
        echo "Enter occupation codes separated by commas"
        echo "Example: 15-1252.00,11-1021.00,29-1141.00"
        read -p "Codes: " codes
        echo ""
        echo "Importing specific occupations..."
        node onet-data-importer.js --codes "$codes"
        ;;
    3)
        echo ""
        echo "⚠️  WARNING: This will take 1-2 hours due to rate limiting!"
        read -p "Are you sure you want to continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Starting full import..."
            node onet-data-importer.js
        else
            echo "Import cancelled."
        fi
        ;;
    4)
        echo ""
        echo "Checking database stats..."
        node -e "
        import mongoose from 'mongoose';
        import dotenv from 'dotenv';
        import { OnetOccupation } from './onet-data-importer.js';
        
        dotenv.config();
        
        mongoose.connect(process.env.MONGO_URI)
          .then(async () => {
            const count = await OnetOccupation.countDocuments();
            const latest = await OnetOccupation.findOne().sort({ lastUpdated: -1 });
            console.log('');
            console.log('Database Statistics:');
            console.log('-------------------');
            console.log('Total Occupations:', count);
            console.log('Last Updated:', latest?.lastUpdated || 'N/A');
            console.log('');
            await mongoose.connection.close();
            process.exit(0);
          })
          .catch(err => {
            console.error('Error:', err.message);
            process.exit(1);
          });
        "
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Start your server: npm start"
echo "2. Test the API endpoints:"
echo "   GET http://localhost:3001/api/onet/stats"
echo "   GET http://localhost:3001/api/onet/occupations"
echo ""
echo "See ONET_INTEGRATION_GUIDE.md for full documentation."
