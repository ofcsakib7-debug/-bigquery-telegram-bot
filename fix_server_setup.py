#!/usr/bin/env python3
"""
Fix Silent Server Startup Issues
This script implements all necessary fixes for the Node.js server that exits silently:
1. Creates/updates index.js with debugging and proper server setup
2. Creates/updates telegram_bot/bot.js with debugging and Express setup
3. Creates minimal-server.js for testing
4. Creates test-app.js to verify app export
5. Creates package.json if missing
"""

import os
import sys
from pathlib import Path

def create_directory_structure():
    """Create the telegram_bot directory if it doesn't exist"""
    telegram_bot_dir = Path('telegram_bot')
    if not telegram_bot_dir.exists():
        telegram_bot_dir.mkdir()
        print("? Created telegram_bot directory")
    else:
        print("? telegram_bot directory already exists")

def create_index_js():
    """Create or update index.js with debugging and proper server setup"""
    index_js_content = """// index.js with debugging and proper server setup
console.log("index.js is being executed");

const app = require("./telegram_bot/bot");
console.log("app required:", typeof app);

// Add process exit handlers
process.on("exit", (code) => {
  console.log(`Process exiting with code: ${code}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});

// Check if this is the main module
console.log("require.main === module:", require.main === module);

// Start the server if this file is run directly
if (require.main === module) {
  console.log("Starting server because this is the main module");
  const PORT = process.env.PORT || 8080;
  
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bot is running on port ${PORT}`);
    console.log(`Server accessible at: http://localhost:${PORT}`);
  });
  
  server.on("error", (err) => {
    console.error("Server error:", err);
  });
  
  // Keep the process alive
  process.stdin.resume();
} else {
  console.log("Not starting server because this is not the main module");
}

// Export the app for Cloud Functions
exports.bot = app;
console.log("index.js execution completed");
"""
    
    with open('index.js', 'w') as f:
        f.write(index_js_content)
    print("? Created/updated index.js with debugging and proper server setup")

def create_bot_js():
    """Create or update telegram_bot/bot.js with debugging and Express setup"""
    bot_js_content = """// telegram_bot/bot.js with debugging and Express setup
console.log("telegram_bot/bot.js is being executed");

try {
  const express = require("express");
  console.log("express required:", typeof express);

  const app = express();
  console.log("app created:", typeof app);

  // Middleware to parse JSON bodies
  app.use(express.json());
  console.log("JSON middleware added");

  // Health check endpoint
  app.get("/health", (req, res) => {
    console.log("Health check endpoint called");
    res.status(200).send("OK");
  });

  // Webhook endpoint for Telegram
  app.post("/webhook", (req, res) => {
    console.log("Webhook endpoint called");
    console.log("Request body:", req.body);
    // Your existing bot logic here
    res.status(200).send("Webhook received");
  });

  console.log("Routes set up");

  // Export the Express app
  module.exports = app;
  console.log("app exported successfully");
} catch (error) {
  console.error("Error in bot.js:", error);
  console.error("Stack trace:", error.stack);
}
"""
    
    with open('telegram_bot/bot.js', 'w') as f:
        f.write(bot_js_content)
    print("? Created/updated telegram_bot/bot.js with debugging and Express setup")

def create_minimal_server():
    """Create minimal-server.js for testing basic Node.js server functionality"""
    minimal_server_content = """// minimal-server.js - Basic Node.js HTTP server for testing
const http = require("http");

console.log("Creating minimal server");

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  res.writeHead(200, { "Content-Type": "text/plain" });
  
  if (req.url === "/health") {
    res.end("OK - Minimal Server");
  } else {
    res.end("Hello World - Minimal Server");
  }
});

const PORT = 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Minimal server running at http://localhost:${PORT}/`);
  console.log("Test with: curl http://localhost:8080/health");
});

server.on("error", (err) => {
  console.error("Minimal server error:", err);
});
"""
    
    with open('minimal-server.js', 'w') as f:
        f.write(minimal_server_content)
    print("? Created minimal-server.js for testing")

def create_test_app():
    """Create test-app.js to verify Express app export"""
    test_app_content = """// test-app.js - Verify Express app export
console.log("Testing app export");

try {
  const app = require("./telegram_bot/bot");
  console.log("App type:", typeof app);
  console.log("App is a function:", typeof app === "function");
  
  if (typeof app === "function") {
    console.log("App methods:", Object.getOwnPropertyNames(app).slice(0, 10));
    console.log("App has listen method:", typeof app.listen);
    
    // Test if app has Express methods
    const hasGet = typeof app.get === "function";
    const hasPost = typeof app.post === "function";
    const hasUse = typeof app.use === "function";
    
    console.log("App has .get():", hasGet);
    console.log("App has .post():", hasPost);
    console.log("App has .use():", hasUse);
    
    if (hasGet && hasPost && hasUse) {
      console.log("? App appears to be a valid Express app");
    } else {
      console.log("? App does not appear to be a valid Express app");
    }
  } else {
    console.log("? App is not a function");
  }
} catch (error) {
  console.error("Error loading app:", error);
}
"""
    
    with open('test-app.js', 'w') as f:
        f.write(test_app_content)
    print("? Created test-app.js to verify Express app export")

def create_package_json():
    """Create package.json if it doesn't exist"""
    package_json_content = """{
  "name": "telegram-bot",
  "version": "1.0.0",
  "description": "BigQuery Telegram Bot",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1",
    "test-minimal": "node minimal-server.js",
    "test-app": "node test-app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-telegram-bot-api": "^0.64.0"
  },
  "engines": {
    "node": "20"
  },
  "author": "",
  "license": "ISC"
}
"""
    
    if not Path('package.json').exists():
        with open('package.json', 'w') as f:
            f.write(package_json_content)
        print("? Created package.json")
    else:
        print("? package.json already exists")

def create_test_script():
    """Create a test script to run all tests"""
    test_script_content = """@echo off
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
"""
    
    with open('test_setup.bat', 'w') as f:
        f.write(test_script_content)
    print("? Created test_setup.bat for easy testing")

def main():
    """Main function to run all fixes"""
    print("?? Starting Node.js server setup fixes...")
    
    try:
        # Create directory structure
        create_directory_structure()
        
        # Create all necessary files
        create_index_js()
        create_bot_js()
        create_minimal_server()
        create_test_app()
        create_package_json()
        create_test_script()
        
        print("\n?? All fixes implemented successfully!")
        print("\nNext steps:")
        print("1. Run 'npm install' to install dependencies")
        print("2. Run 'node test-app.js' to verify app export")
        print("3. Run 'node minimal-server.js' to test basic server")
        print("4. Run 'node index.js' to start the main server")
        print("5. Test with: curl http://localhost:8080/health")
        print("6. Or run: test_setup.bat for automated testing")
        
    except Exception as e:
        print(f"\n? Error implementing fixes: {str(e)}")
        print("Please check the error messages above and try again.")

if __name__ == "__main__":
    main()