#!/bin/bash

cd /Users/wiut/Desktop/Recognition/python
source venv/bin/activate

echo "🚀 Starting Python Face Recognition Service with auto-restart..."

while true; do
    echo "$(date): Starting service..."
    python main.py
    EXIT_CODE=$?
    echo "$(date): Service exited with code $EXIT_CODE"
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "Service stopped normally"
        break
    fi
    
    echo "Service crashed, restarting in 3 seconds..."
    sleep 3
done
