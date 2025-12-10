#!/bin/bash

echo "🚀 WhatsApp Simulator Frontend - Setup Script"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Recommended version: v18 or later"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/frontend" || exit

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Ensure backend services are running:"
    echo "   kubectl port-forward svc/key-service 5000:5000 -n cloud-demo"
    echo "   kubectl port-forward svc/connection-service 8000:8000 -n cloud-demo"
    echo ""
    echo "2. Start the development server:"
    echo "   cd frontend"
    echo "   npm run dev"
    echo ""
    echo "3. Open your browser to http://localhost:5173"
else
    echo ""
    echo "❌ Installation failed!"
    echo "Please check the error messages above."
    exit 1
fi
