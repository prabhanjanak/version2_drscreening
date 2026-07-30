#!/usr/bin/env bash

# Route the connected Android device's localhost:5000 to the API server on this Mac.
# Run this after connecting the phone with USB debugging enabled.
set -euo pipefail

ANDROID_SDK_ROOT="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB=""

if command -v adb &> /dev/null; then
  ADB="$(command -v adb)"
elif [ -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]; then
  ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
fi

if [ -z "$ADB" ]; then
  echo "Error: adb executable was not found. Please install Android Platform Tools."
  exit 1
fi

DEVICE_ID="${1:-}"
if [ -z "$DEVICE_ID" ]; then
  DEVICE_ID="$("$ADB" devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"
fi

if [ -z "$DEVICE_ID" ]; then
  echo "No authorized Android device found. Connect the phone, ensure USB debugging is ON, and accept the prompt on screen."
  "$ADB" devices
  exit 1
fi

"$ADB" -s "$DEVICE_ID" reverse tcp:5000 tcp:5000
echo "✅ USB Reverse Tunnel Ready: Mobile localhost:5000 → Mac localhost:5000 ($DEVICE_ID)"

