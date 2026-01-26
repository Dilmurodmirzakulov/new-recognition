#!/bin/bash

echo "🚀 Starting WIUT Attendance System..."
echo ""

GREEN='\033[0;32m'
NC='\033[0m'

# Create logs directory
mkdir -p logs

# Start Python Face Recognition Service
echo "Starting Python Face Recognition Service (Port 5000)..."
cd python
source venv/bin/activate
nohup python main.py > ../logs/python.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > ../logs/python.pid
echo -e "${GREEN}✅ Python service started (PID: $PYTHON_PID)${NC}"
cd ..

sleep 2

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
echo "  Python:   http://localhost:5000 (PID: $PYTHON_PID)"
echo "  Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "📝 Logs:"
echo "  tail -f logs/python.log"
echo "  tail -f logs/frontend.log"
echo ""
echo "⏹️  Stop: ./stop.sh"
echo ""
echo "Opening browser..."
sleep 3
open http://localhost:3000
