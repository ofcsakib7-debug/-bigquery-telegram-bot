// minimal-server.js - Basic Node.js HTTP server for testing
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
