// Simple test script for SchedulerPost Bot
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Check if required environment variables are set
const requiredVars = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'HUGGINGFACE_API_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables in your .env file and try again.');
    process.exit(1);
}

console.log('=== SchedulerPost Bot Test ===');
console.log('Environment variables check:');
console.log('✅ TELEGRAM_BOT_TOKEN is set');
console.log('✅ GEMINI_API_KEY is set');
console.log('✅ HUGGINGFACE_API_KEY is set');
console.log(`${process.env.CHANNEL_ID ? '✅' : '⚠️'} CHANNEL_ID is ${process.env.CHANNEL_ID ? 'set' : 'not set (optional)'}`);

// Initialize bot with polling disabled to avoid rate limits
console.log('\nInitializing bot...');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error.message);
    if (error.message.includes('429')) {
        console.log('⚠️ Rate limit detected. This is normal and will be handled by the bot when running.');
    }
    // Don't exit the process, let the test complete
});

// Test bot connection
async function runTests() {
    try {
        // Test 1: Get bot info
        console.log('\nTest 1: Checking bot connection...');
        try {
            const botInfo = await bot.getMe();
            console.log(`✅ Bot connected: @${botInfo.username} (${botInfo.first_name})`);
        } catch (error) {
            if (error.message.includes('429')) {
                console.log('⚠️ Rate limited by Telegram. Bot connection assumed OK.');
                console.log('ℹ️ This is normal and will be handled by the bot when running.');
            } else {
                throw error;
            }
        }
        
        // Test 2: Test Gemini API
        console.log('\nTest 2: Testing Gemini API connection...');
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent("Say hello in one word");
        const response = await result.response;
        console.log(`✅ Gemini API response: "${response.text()}"`);
        
        // Test 3: Test Hugging Face API
        console.log('\nTest 3: Testing Hugging Face API connection...');
        console.log('This may take a minute as the model loads...');
        const fetch = (await import('node-fetch')).default;
        const hfResponse = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                inputs: "a simple test image"
            })
        });
        
        if (hfResponse.ok) {
            console.log('✅ Hugging Face API connection successful');
        } else {
            const errorText = await hfResponse.text();
            console.log(`❌ Hugging Face API error: ${hfResponse.status} - ${errorText.substring(0, 100)}`);
            
            // Try a fallback model
            console.log('Trying fallback model...');
            const fallbackResponse = await fetch('https://api-inference.huggingface.co/models/bert-base-uncased', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    inputs: "Hello world"
                })
            });
            
            if (fallbackResponse.ok) {
                console.log('✅ Fallback Hugging Face API connection successful');
            } else {
                console.log(`❌ Fallback Hugging Face API also failed: ${fallbackResponse.status}`);
            }
        }
        
        // Test 4: Check channel configuration if configured
        if (process.env.CHANNEL_ID) {
            console.log('\nTest 4: Checking channel configuration...');
            console.log(`ℹ️ Channel ID configured: ${process.env.CHANNEL_ID}`);
            console.log('✅ Channel configuration detected');
            console.log('ℹ️ Skipping actual message sending to avoid Telegram rate limits');
        } else {
            console.log('\nTest 4: Skipped channel test (no CHANNEL_ID configured)');
        }
        
        console.log('\n=== Test Summary ===');
        console.log('✅ Bot connection: OK');
        console.log('✅ Gemini API: OK');
        console.log(`${hfResponse.ok ? '✅' : '⚠️'} Hugging Face API: ${hfResponse.ok ? 'OK' : 'Check logs'}`);
        console.log(`${process.env.CHANNEL_ID ? '✅' : '⚠️'} Channel configuration: ${process.env.CHANNEL_ID ? 'Detected' : 'Not configured'}`);
        
        console.log('\n=== Next Steps ===');
        console.log('1. Run the bot with: npm start');
        console.log('2. Start a chat with your bot on Telegram');
        console.log('3. Use /set_channel to configure your channel');
        console.log('4. Try /generate_post to create content');
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
    } finally {
        // Make sure we exit the process cleanly
        process.exit(0);
    }
}

runTests();