#!/bin/bash

echo "🧪 Testing Yuksalish Attendance System"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test Python Service
echo "🐍 Testing Python Face Recognition Service..."
response=$(curl -s http://localhost:5000/health)
if [[ $response == *"Face Recognition Service"* ]]; then
    echo -e "${GREEN}✅ Python service is running${NC}"
else
    echo -e "${RED}❌ Python service not responding${NC}"
    echo "   Start with: cd python && source venv/bin/activate && python main.py"
fi

# Test Node.js Backend
echo "📦 Testing Node.js Backend..."
response=$(curl -s http://localhost:3001/health)
if [[ $response == *"Attendance Backend"* ]]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend not responding${NC}"
    echo "   Start with: cd backend && npm run dev"
fi

# Test Frontend
echo "⚛️  Testing Next.js Frontend..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ $response -eq 200 ]; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend not responding${NC}"
    echo "   Start with: cd frontend && npm run dev"
fi

# Test Database Connection
echo "🗄️  Testing Database Connection..."
if PGPASSWORD=secure_password_123 psql -h localhost -U attendance_user -d yuksalish_attendance -c "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "   Setup with: ./setup.sh"
fi

# Test Camera (if Python service is running)
if [[ $response == *"Face Recognition Service"* ]]; then
    echo "📹 Testing Camera Connection..."
    cd python
    python test_camera.py
    cd ..
fi

echo ""
echo "📊 System Status Summary:"
echo "  Python Service: http://localhost:5000"
echo "  Backend API: http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo ""
echo "💡 If any tests failed, run ./setup.sh first, then ./start.sh"
