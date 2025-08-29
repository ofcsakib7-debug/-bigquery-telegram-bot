@echo off
echo ===== Testing Node.js Server Setup =====

echo.
echo Step 1: Checking Node.js installation
node --version
npm --version

echo.
echo Step 2: Installing dependencies
npm install

echo.
echo Step 3: Testing app export
node test-app.js

echo.
echo Step 4: Testing minimal server (run in separate window)
echo Run: node minimal-server.js
echo Then test: curl http://localhost:8080/health

echo.
echo Step 5: Testing main server (run in separate window)
echo Run: node index.js
echo Then test: curl http://localhost:8080/health

echo.
echo ===== Testing Complete =====
pause
