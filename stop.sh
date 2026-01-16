#!/bin/bash

echo "⏹️  Stopping Yuksalish Attendance System..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Stop Python service
if [ -f "logs/python.pid" ]; then
    PID=$(cat logs/python.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✅ Python service stopped${NC}"
    fi
    rm logs/python.pid
fi

# Stop Backend
if [ -f "logs/backend.pid" ]; then
    PID=$(cat logs/backend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✅ Backend stopped${NC}"
    fi
    rm logs/backend.pid
fi

# Stop Frontend
if [ -f "logs/frontend.pid" ]; then
    PID=$(cat logs/frontend.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
    rm logs/frontend.pid
fi

# Kill any remaining node/python processes on these ports
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo ""
echo -e "${GREEN}🎉 All services stopped!${NC}"
