// Polyfill for fetch in Node.js v14
global.fetch = require('node-fetch');
global.Request = require('node-fetch').Request;
global.Response = require('node-fetch').Response;
global.Headers = require('node-fetch').Headers;

console.log('✅ Fetch polyfill loaded successfully');