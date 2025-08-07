# Extract the release APK from the Docker container
$containerName = "barbuddy-extract-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Starting container to extract APK..."
docker run --name $containerName -d barbuddy-android-fixed-v2:latest tail -f /dev/null

Write-Host "Waiting for container to start..."
Start-Sleep -Seconds 2

Write-Host "Checking for APK in container..."
docker exec $containerName ls -la /app/android/app/build/outputs/apk/release/

Write-Host "Extracting release APK from container..."
docker cp ${containerName}:/app/android/app/build/outputs/apk/release/app-release.apk d:\CascadeProjects\BarBuddyPrototype\app-release-window-polyfill.apk

Write-Host "Cleaning up container..."
docker stop $containerName
docker rm $containerName

Write-Host "Verifying extracted APK..."
Get-Item d:\CascadeProjects\BarBuddyPrototype\app-release-window-polyfill.apk | Select-Object FullName, Length, LastWriteTime
