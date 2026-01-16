#!/bin/bash

echo "📝 Creating environment configuration files..."
echo ""

# Backend .env
cat > backend/.env << 'EOF'
DB_USER=attendance_user
DB_PASSWORD=secure_password_123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yuksalish_attendance
PYTHON_SERVICE_URL=http://localhost:5000
PORT=3001
NODE_ENV=development
EOF
echo "✅ Created backend/.env"

# Frontend .env.local
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF
echo "✅ Created frontend/.env.local"

# Python .env (camera credentials)
cat > python/.env << 'EOF'
CAMERA_RTSP_URL=rtsp://admin:1qaz2wsx%40@192.168.34.196:554/Streaming/Channels/101
CONFIDENCE_THRESHOLD=0.6
FRAME_RATE=5
EOF
echo "✅ Created python/.env"

echo ""
echo "🎉 All environment files created!"
echo ""
echo "📹 Camera configured: rtsp://admin:1qaz2wsx@192.168.34.196:554/Streaming/Channels/101"
