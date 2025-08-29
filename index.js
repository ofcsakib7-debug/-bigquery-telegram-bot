// index.js with debugging and proper server setup
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
