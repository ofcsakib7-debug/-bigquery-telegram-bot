// telegram_bot/bot.js with debugging and Express setup
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
