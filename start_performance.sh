#!/bin/bash

# Performance-optimized start script
# This version runs with reduced resource usage

echo "🚀 Starting Yuksalish Attendance System (Performance Mode)..."
echo ""

# Check if PostgreSQL is running
if ! pgrep -x postgres > /dev/null; then
    echo "❌ PostgreSQL is not running!"
    echo "Start it with: brew services start postgresql@14"
    exit 1
fi
echo "✅ PostgreSQL running"

# Create logs directory
mkdir -p logs

# Start Python Face Recognition Service (Port 5000)
echo "Starting Python Face Recognition Service (Port 5000)..."
cd python
nohup python3 main.py > ../logs/python.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > ../logs/python.pid
cd ..
sleep 2
echo "✅ Python service started (PID: $PYTHON_PID)"

# Start Node.js Backend (Port 3001)
echo "Starting Node.js Backend (Port 3001)..."
cd backend
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
cd ..
sleep 3
echo "✅ Backend started (PID: $BACKEND_PID)"

# Start Next.js Frontend (Port 3000) - Production mode for better performance
echo "Starting Next.js Frontend (Port 3000) in production mode..."
cd frontend
# Build for production first if not already built
if [ ! -d ".next" ]; then
    echo "Building Next.js for production..."
    npm run build
fi
nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..
sleep 3
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 All services started in Performance Mode!"
echo ""
echo "📊 Services:"
echo "  Python:  http://localhost:5000 (PID: $PYTHON_PID)"
echo "  Backend: http://localhost:3001 (PID: $BACKEND_PID)"
echo "  Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "📝 Logs:"
echo "  Python:  tail -f logs/python.log"
echo "  Backend: tail -f logs/backend.log"
echo "  Frontend: tail -f logs/frontend.log"
echo ""
echo "⚡ Performance Tips:"
echo "  - Detection runs every 5 seconds (reduced frequency)"
echo "  - Video feed at 5 FPS (reduced from 10 FPS)"
echo "  - Face detection with 1x upsampling (reduced from 3x)"
echo "  - Processing at 50% frame resolution (reduced from 75%)"
echo "  - Avoid opening /live feed when not needed"
echo ""
echo "⏹️  Stop services: ./stop.sh"
echo ""
