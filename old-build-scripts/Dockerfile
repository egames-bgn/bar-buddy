FROM ubuntu:22.04

WORKDIR /app

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=20.x
ENV JAVA_VERSION=17

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    python3 \
    build-essential \
    openjdk-${JAVA_VERSION}-jdk \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=${ANDROID_HOME}
ENV PATH=${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O /tmp/android-tools.zip \
    && unzip -q /tmp/android-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm /tmp/android-tools.zip

# Accept Android SDK licenses
RUN yes | sdkmanager --licenses

# Install required Android SDK packages
RUN sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# Install Expo CLI and EAS CLI
RUN npm install -g expo-cli eas-cli

# Create app directory and set permissions
RUN mkdir -p /app && chmod 777 /app
WORKDIR /app

# Copy package files first
COPY package.json package-lock.json ./

# Copy the prebuild script
COPY prebuild.js ./

# Copy the rest of the application
COPY . .

# Install dependencies after copying all files
RUN npm install

# Fix the use-latest-callback package
RUN mkdir -p node_modules/use-latest-callback/lib
RUN echo 'const React = require("react"); \
function useLatestCallback(callback) { \
  const ref = React.useRef(callback); \
  ref.current = callback; \
  return React.useCallback((...args) => ref.current(...args), []); \
} \
module.exports = useLatestCallback; \
module.exports.default = useLatestCallback;' > node_modules/use-latest-callback/lib/index.js
RUN echo '{"name":"use-latest-callback","version":"0.1.3","main":"lib/index.js"}' > node_modules/use-latest-callback/package.json

# Expose ports for Metro bundler
EXPOSE 19000 19001 19002 8081

# Create a build script
RUN echo '#!/bin/bash\n\
echo "Patching use-latest-callback package..."\n\
mkdir -p node_modules/use-latest-callback/lib\n\
echo "const React = require(\"react\"); \
function useLatestCallback(callback) { \
  const ref = React.useRef(callback); \
  ref.current = callback; \
  return React.useCallback((...args) => ref.current(...args), []); \
} \
module.exports = useLatestCallback; \
module.exports.default = useLatestCallback;" > node_modules/use-latest-callback/lib/index.js\n\
echo "{\"name\":\"use-latest-callback\",\"version\":\"0.1.3\",\"main\":\"lib/index.js\"}" > node_modules/use-latest-callback/package.json\n\
echo "Building Android APK..."\n\
npx expo prebuild --platform android --clean\n\
cd android\n\
./gradlew assembleDebug\n\
echo "\nBuild completed! APK location: android/app/build/outputs/apk/debug/app-debug.apk"' > /app/build-android.sh

RUN chmod +x /app/build-android.sh

# Default command
CMD ["bash"]
