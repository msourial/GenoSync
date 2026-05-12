#!/bin/bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
cd /Users/m/Documents/Per/easya2026/GenoSync-main/artifacts/solana/app

# Start Metro bundler in background
npx expo start &
METRO_PID=$!

sleep 5

# Try to open on Android (accepting Expo Go update prompt with 'y')
echo "y" | npx expo start --android

# Wait for Metro
wait $METRO_PID
