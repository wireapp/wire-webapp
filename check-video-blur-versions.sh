#!/bin/bash
# Script to check versions of video blurring dependencies

echo "=== Video Blurring Dependencies Version Check ==="
echo ""

# Check @mediapipe/tasks-vision package version
echo "1. @mediapipe/tasks-vision Package:"
CURRENT_MP=$(grep '"@mediapipe/tasks-vision"' package.json | sed 's/.*"@mediapipe\/tasks-vision": *"\([^"]*\)".*/\1/')
echo "   Current installed: ${CURRENT_MP:-Not found}"
LATEST_MP=$(npm view @mediapipe/tasks-vision version 2>/dev/null || echo 'Unable to check')
echo "   Latest available: ${LATEST_MP}"
LATEST_STABLE=$(npm view @mediapipe/tasks-vision dist-tags.latest 2>/dev/null || echo 'Unable to check')
echo "   Latest stable: ${LATEST_STABLE}"
echo ""

# Check for outdated packages
echo "2. Outdated Packages Check:"
npm outdated @mediapipe/tasks-vision 2>/dev/null || echo "   Package is up to date or check failed"
echo ""

# Check TFLite model file
echo "3. Selfie Segmenter TFLite Model:"
if [ -f "assets/mediapipe-models/selfie_segmenter.tflite" ]; then
    echo "   File exists: assets/mediapipe-models/selfie_segmenter.tflite"
    echo "   File size: $(ls -lh assets/mediapipe-models/selfie_segmenter.tflite | awk '{print $5}')"
    echo "   Last modified: $(stat -c %y assets/mediapipe-models/selfie_segmenter.tflite 2>/dev/null || stat -f %Sm assets/mediapipe-models/selfie_segmenter.tflite 2>/dev/null || echo 'Unknown')"
    echo ""
    echo "   Note: TFLite model files don't contain embedded version information."
    echo "   The model should be downloaded from MediaPipe's official repository:"
    echo "   https://github.com/google/mediapipe/tree/master/mediapipe/models"
    echo "   or from the MediaPipe Solutions page:"
    echo "   https://developers.google.com/mediapipe/solutions/vision/selfie_segmenter"
else
    echo "   WARNING: Model file not found at assets/mediapipe-models/selfie_segmenter.tflite"
fi
echo ""

# Check WASM files
echo "4. MediaPipe WASM Files:"
if [ -d "node_modules/@mediapipe/tasks-vision/wasm" ]; then
    echo "   WASM files location: node_modules/@mediapipe/tasks-vision/wasm"
    echo "   Files:"
    ls -lh node_modules/@mediapipe/tasks-vision/wasm/*.wasm 2>/dev/null | awk '{print "     " $9 " (" $5 ")"}' || echo "     No WASM files found"
else
    echo "   WASM directory not found"
fi
echo ""

# Check other related dependencies
echo "5. Other Video Blurring Dependencies:"
WEBGL_VER=$(grep '"webgl-utils.js"' package.json | sed 's/.*"webgl-utils.js": *"\([^"]*\)".*/\1/')
echo "   webgl-utils.js: ${WEBGL_VER:-Not found}"
WEBRTC_VER=$(grep '"webrtc-adapter"' package.json | sed 's/.*"webrtc-adapter": *"\([^"]*\)".*/\1/')
echo "   webrtc-adapter: ${WEBRTC_VER:-Not found}"
echo ""

echo "=== Recommendations ==="
echo ""
echo "To update @mediapipe/tasks-vision:"
echo "  yarn upgrade @mediapipe/tasks-vision"
echo ""
echo "To check for the latest TFLite model:"
echo "  1. Visit: https://developers.google.com/mediapipe/solutions/vision/selfie_segmenter"
echo "  2. Download the latest selfie_segmenter.tflite model"
echo "  3. Replace: assets/mediapipe-models/selfie_segmenter.tflite"
echo ""
echo "To check all outdated packages:"
echo "  yarn outdated"
echo ""

