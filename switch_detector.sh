#!/bin/bash
# Quick detector switch utility

echo "🎯 Face Detector Configuration"
echo "=============================="
echo ""
echo "Choose detector backend:"
echo "  1) HOG     - Fast, CPU-only (current default)"
echo "  2) CNN     - Better quality, slower"
echo "  3) YOLO    - Best quality, needs ultralytics"
echo ""
read -p "Select option (1-3): " choice

case $choice in
    1)
        BACKEND="hog"
        DEVICE="cpu"
        echo "✅ Selected: HOG (fast, CPU)"
        ;;
    2)
        BACKEND="cnn"
        read -p "Use GPU? (y/N): " gpu
        if [[ $gpu == "y" || $gpu == "Y" ]]; then
            DEVICE="cuda"
        else
            DEVICE="cpu"
        fi
        echo "✅ Selected: CNN on $DEVICE"
        ;;
    3)
        BACKEND="yolo"
        read -p "Use GPU? (y/N): " gpu
        if [[ $gpu == "y" || $gpu == "Y" ]]; then
            DEVICE="cuda"
        else
            DEVICE="cpu"
        fi
        echo "✅ Selected: YOLO on $DEVICE"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Update .env file
if grep -q "DETECTOR_BACKEND" .env; then
    # Update existing
    sed -i.bak "s/^DETECTOR_BACKEND=.*/DETECTOR_BACKEND=$BACKEND/" .env
    sed -i.bak "s/^DETECTOR_DEVICE=.*/DETECTOR_DEVICE=$DEVICE/" .env
    rm -f .env.bak
else
    # Add new
    echo "DETECTOR_BACKEND=$BACKEND" >> .env
    echo "DETECTOR_DEVICE=$DEVICE" >> .env
fi

echo ""
echo "📝 Configuration updated:"
echo "   DETECTOR_BACKEND=$BACKEND"
echo "   DETECTOR_DEVICE=$DEVICE"
echo ""
read -p "Restart services now? (Y/n): " restart

if [[ $restart != "n" && $restart != "N" ]]; then
    echo ""
    echo "♻️  Restarting services..."
    ./stop.sh
    sleep 1
    ./start.sh
    
    echo ""
    echo "✅ Services restarted with new detector!"
    echo "📊 Check logs: tail -f logs/python.log"
else
    echo ""
    echo "⚠️  Remember to restart services: ./stop.sh && ./start.sh"
fi
