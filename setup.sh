#!/bin/bash

echo "🎓 Yuksalish Attendance System Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
echo "📊 Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
else
    echo -e "${RED}❌ PostgreSQL not found${NC}"
    echo "Install with: brew install postgresql@15"
    exit 1
fi

# Check if Python is installed
echo "🐍 Checking Python..."
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅ Python found ($(python3 --version))${NC}"
else
    echo -e "${RED}❌ Python not found${NC}"
    echo "Install with: brew install python@3.11"
    exit 1
fi

# Check if Node.js is installed
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js found ($(node -v))${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Install with: brew install node"
    exit 1
fi

echo ""
echo "🗄️  Setting up database..."
echo "Creating database and user..."

# Create database (ignore if exists)
psql postgres -c "CREATE DATABASE yuksalish_attendance;" 2>/dev/null || echo "Database already exists"
psql postgres -c "CREATE USER attendance_user WITH PASSWORD 'secure_password_123';" 2>/dev/null || echo "User already exists"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE yuksalish_attendance TO attendance_user;" 2>/dev/null

echo -e "${GREEN}✅ Database setup complete${NC}"

echo ""
echo "🐍 Setting up Python service..."
cd python

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

echo -e "${GREEN}✅ Python service setup complete${NC}"
cd ..

echo ""
echo "📦 Setting up Node.js backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install --silent
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << EOF
DB_USER=attendance_user
DB_PASSWORD=secure_password_123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yuksalish_attendance
PYTHON_SERVICE_URL=http://localhost:5000
PORT=3001
NODE_ENV=development
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
fi

echo -e "${GREEN}✅ Backend setup complete${NC}"
cd ..

echo ""
echo "⚛️  Setting up Next.js frontend..."
cd frontend

if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF
    echo -e "${GREEN}✅ Created .env.local file${NC}"
fi

echo -e "${GREEN}✅ Frontend setup complete${NC}"
cd ..

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Enroll students: cd python && source venv/bin/activate && python enroll_students.py"
echo "2. Start services: ./start.sh"
echo "3. Open browser: http://localhost:3000"
echo ""
echo "📹 Camera: rtsp://admin:1qaz2wsx%40@192.168.34.196:554/Streaming/Channels/101"
