#!/bin/bash

echo "🚀 Starting Exam Proctor with HTTPS support..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Installing..."
    npm install -g ngrok
fi

# Start backend in background
echo "📡 Starting backend server..."
cd ../exam-proctor-backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🖥️  Starting frontend server..."
cd ../exam-proctor
npm start &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

echo "✅ Servers started!"
echo "📱 To test on mobile:"
echo "1. Run: ngrok http 3000"
echo "2. Use the HTTPS URL provided by ngrok"
echo "3. Update your API configuration to use the ngrok backend URL"
echo ""
echo "🔗 Frontend should be running on: http://localhost:3000"
echo "🔗 Backend should be running on: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait 