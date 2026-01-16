#!/bin/bash

echo "🚀 Starting Yuksalish Attendance System..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create logs directory
mkdir -p logs

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "Starting PostgreSQL..."
    brew services start postgresql@15
    sleep 2
fi

echo -e "${GREEN}✅ PostgreSQL running${NC}"

# Start Python service
echo "Starting Python Face Recognition Service (Port 5000)..."
cd python
source venv/bin/activate
nohup python main.py > ../logs/python.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > ../logs/python.pid
echo -e "${GREEN}✅ Python service started (PID: $PYTHON_PID)${NC}"
cd ..

sleep 2

# Start Node.js backend
echo "Starting Node.js Backend (Port 3001)..."
cd backend
nohup npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
cd ..

sleep 3

# Start Next.js frontend
echo "Starting Next.js Frontend (Port 3000)..."
cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
cd ..

echo ""
echo -e "${GREEN}🎉 All services started!${NC}"
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
echo "⏹️  Stop services: ./stop.sh"
echo ""
echo "Opening browser in 5 seconds..."
sleep 5
open http://localhost:3000
