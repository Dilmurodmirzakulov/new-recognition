#!/bin/bash

echo "🔍 Yuksalish Attendance System - Setup Verification"
echo "===================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
total=0
passed=0
failed=0

check() {
    ((total++))
    if [ $1 -eq 0 ]; then
        ((passed++))
        echo -e "${GREEN}✅ $2${NC}"
    else
        ((failed++))
        echo -e "${RED}❌ $2${NC}"
        if [ ! -z "$3" ]; then
            echo -e "${YELLOW}   → $3${NC}"
        fi
    fi
}

# Check system requirements
echo -e "${BLUE}System Requirements:${NC}"
command -v node &> /dev/null
check $? "Node.js installed" "Install: brew install node"

command -v python3 &> /dev/null
check $? "Python 3 installed" "Install: brew install python@3.11"

command -v psql &> /dev/null
check $? "PostgreSQL installed" "Install: brew install postgresql@15"

command -v git &> /dev/null
check $? "Git installed" "Install: brew install git"

echo ""

# Check project structure
echo -e "${BLUE}Project Structure:${NC}"
[ -d "python" ]
check $? "Python directory exists"

[ -d "backend" ]
check $? "Backend directory exists"

[ -d "frontend" ]
check $? "Frontend directory exists"

[ -f "python/main.py" ]
check $? "Python main.py exists"

[ -f "backend/src/server.ts" ]
check $? "Backend server.ts exists"

[ -f "frontend/app/page.tsx" ]
check $? "Frontend page.tsx exists"

echo ""

# Check Python setup
echo -e "${BLUE}Python Environment:${NC}"
[ -f "python/requirements.txt" ]
check $? "requirements.txt exists"

[ -d "python/encodings" ]
check $? "Encodings directory exists"

[ -d "python/photos" ]
check $? "Photos directory exists"

[ -d "python/uploads" ]
check $? "Uploads directory exists"

[ -f "python/face_detector.py" ]
check $? "face_detector.py exists"

[ -f "python/camera_stream.py" ]
check $? "camera_stream.py exists"

echo ""

# Check Backend setup
echo -e "${BLUE}Backend Setup:${NC}"
[ -f "backend/package.json" ]
check $? "Backend package.json exists"

[ -f "backend/tsconfig.json" ]
check $? "Backend tsconfig.json exists"

[ -d "backend/node_modules" ]
check $? "Backend dependencies installed" "Run: cd backend && npm install"

[ -d "backend/src/models" ]
check $? "Backend models directory exists"

[ -d "backend/src/api" ]
check $? "Backend api directory exists"

echo ""

# Check Frontend setup
echo -e "${BLUE}Frontend Setup:${NC}"
[ -f "frontend/package.json" ]
check $? "Frontend package.json exists"

[ -d "frontend/node_modules" ]
check $? "Frontend dependencies installed" "Run: cd frontend && npm install"

[ -d "frontend/app" ]
check $? "Frontend app directory exists"

[ -d "frontend/lib" ]
check $? "Frontend lib directory exists"

[ -f "frontend/app/dashboard/page.tsx" ]
check $? "Dashboard page exists"

echo ""

# Check scripts
echo -e "${BLUE}Helper Scripts:${NC}"
[ -f "setup.sh" ] && [ -x "setup.sh" ]
check $? "setup.sh exists and executable" "Run: chmod +x setup.sh"

[ -f "start.sh" ] && [ -x "start.sh" ]
check $? "start.sh exists and executable" "Run: chmod +x start.sh"

[ -f "stop.sh" ] && [ -x "stop.sh" ]
check $? "stop.sh exists and executable" "Run: chmod +x stop.sh"

[ -f "test-system.sh" ] && [ -x "test-system.sh" ]
check $? "test-system.sh exists and executable" "Run: chmod +x test-system.sh"

echo ""

# Check documentation
echo -e "${BLUE}Documentation:${NC}"
[ -f "README.md" ]
check $? "README.md exists"

[ -f "QUICKSTART.md" ]
check $? "QUICKSTART.md exists"

[ -f "PROJECT-STATUS.md" ]
check $? "PROJECT-STATUS.md exists"

[ -f "Classroom-Attendance-MVP.md" ]
check $? "Original spec exists"

echo ""

# Check database
echo -e "${BLUE}Database:${NC}"
if pgrep -x "postgres" > /dev/null; then
    check 0 "PostgreSQL is running"
    
    # Check if database exists
    if PGPASSWORD=secure_password_123 psql -h localhost -U attendance_user -d yuksalish_attendance -c "SELECT 1;" &>/dev/null; then
        check 0 "Database 'yuksalish_attendance' accessible"
    else
        check 1 "Database 'yuksalish_attendance' accessible" "Run: ./setup.sh"
    fi
else
    check 1 "PostgreSQL is running" "Start: brew services start postgresql@15"
fi

echo ""

# Network check
echo -e "${BLUE}Camera Network:${NC}"
if ping -c 1 -W 1 192.168.34.196 &> /dev/null; then
    check 0 "Camera IP reachable (192.168.34.196)"
else
    check 1 "Camera IP reachable (192.168.34.196)" "Check network connection and camera IP"
fi

echo ""
echo "===================================================="
echo -e "${BLUE}Summary:${NC}"
echo -e "  Total checks: $total"
echo -e "  ${GREEN}Passed: $passed${NC}"
echo -e "  ${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! System is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./setup.sh (if not done yet)"
    echo "2. Enroll students: cd python && source venv/bin/activate && python enroll_students.py"
    echo "3. Start system: ./start.sh"
else
    echo -e "${YELLOW}⚠️  Some checks failed. Please review the errors above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Missing dependencies: Run ./setup.sh"
    echo "- Database issues: Check PostgreSQL is running"
    echo "- Camera network: Verify camera IP and network connection"
fi

echo ""
