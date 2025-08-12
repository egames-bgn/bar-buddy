#!/bin/bash

echo "Patching use-latest-callback package..."
mkdir -p node_modules/use-latest-callback/lib

echo 'const React = require("react"); 
function useLatestCallback(callback) { 
  const ref = React.useRef(callback); 
  ref.current = callback; 
  return React.useCallback((...args) => ref.current(...args), []); 
} 
module.exports = useLatestCallback; 
module.exports.default = useLatestCallback;' > node_modules/use-latest-callback/lib/index.js

echo '{"name":"use-latest-callback","version":"0.1.3","main":"lib/index.js"}' > node_modules/use-latest-callback/package.json

echo "Building Android APK..."
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug

echo -e "\nBuild completed! APK location: android/app/build/outputs/apk/debug/app-debug.apk"
