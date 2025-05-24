// Simple HTTP server to keep the Replit alive
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Bot is running!');
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Import and start the bot
require('./bot.js');