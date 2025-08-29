// test-app.js - Verify Express app export
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
