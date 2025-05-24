require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// SchedulerPost Bot
class SchedulerPostBot {
    constructor() {
        console.log('=== Starting SchedulerPost Bot ===');
        // Initialize scheduled posts array
        this.scheduledPosts = [];
        // Initialize daily post counter
        this.dailyPostCount = 0;
        this.lastPostDate = new Date().toDateString();
        // Initialize user channels map (userId -> channelId)
        this.userChannels = new Map();
        this.initBot();
    }

    // Helper function to verify channel access
    async verifyChannelAccess(userId, chatId) {
        // Get the user's configured channel
        const userChannel = this.userChannels.get(userId);
        
        if (!userChannel) {
            await this.bot.sendMessage(chatId, 
                '⚠️ No channel configured. Please use /set_channel to configure your channel first.'
            );
            return null;
        }
        
        try {
            // Get bot info first to ensure we have the bot ID
            const botInfo = await this.bot.getMe();
            
            // Check if the bot is an admin in the channel
            const chatMember = await this.bot.getChatMember(userChannel, botInfo.id);
            
            if (!['administrator', 'creator'].includes(chatMember.status)) {
                await this.bot.sendMessage(chatId, 
                    '❌ The bot is not an administrator in your channel.\n' +
                    'Please add the bot as an admin to your channel and use /set_channel again.'
                );
                return null;
            }
            
            return userChannel;
        } catch (error) {
            console.error('Channel access verification failed:', error.message);
            await this.bot.sendMessage(chatId, 
                '❌ Failed to verify channel access: ' + error.message + '\n' +
                'Please make sure:\n' +
                '1. The bot is an admin in your channel\n' +
                '2. The channel username/ID is correct\n' +
                'Use /set_channel to reconfigure your channel.'
            );
            return null;
        }
    }

    async initBot() {
        // Check environment variables
        console.log('Environment Check:');
        console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ MISSING');
        console.log('CHANNEL_ID:', process.env.CHANNEL_ID || '❌ MISSING');
        console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ SET' : '❌ MISSING');
        console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? '✅ SET' : '❌ MISSING');

        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.error('❌ TELEGRAM_BOT_TOKEN is required!');
            process.exit(1);
        }

        try {
            // Initialize bot
            this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
                polling: true
            });

            // Test bot connection
            const botInfo = await this.bot.getMe();
            console.log('✅ Bot connected:', botInfo.username);

            // Set up basic commands
            this.setupCommands();

            console.log('🤖 SchedulerPost bot is ready!');
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error.message);
            process.exit(1);
        }
    }

    // Check daily post limit and update counter
    checkDailyPostLimit() {
        const currentDate = new Date().toDateString();
        
        // Reset counter if it's a new day
        if (this.lastPostDate !== currentDate) {
            this.dailyPostCount = 0;
            this.lastPostDate = currentDate;
        }
        
        // Check if limit reached
        if (this.dailyPostCount >= 3) {
            return false;
        }
        
        // Increment counter and return true
        this.dailyPostCount++;
        return true;
    }

    setupCommands() {
        // Start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`📱 /start from chat: ${chatId}`);
            
            try {
                await this.bot.sendMessage(chatId, 
                    '🤖 SchedulerPost Bot is here!\n\n' +
                    '⚙️ Setup:\n' +
                    '/set_channel - Set your channel for posting\n\n' +
                    '📝 Content Generation:\n' +
                    '/generate_post - Generate a complete post with text and image\n\n' +
                    '📅 Scheduling:\n' +
                    '/schedule - Schedule a post\n' +
                    '/list_scheduled - List all scheduled posts\n' +
                    '/cancel_scheduled - Cancel a scheduled post'
                );
            } catch (error) {
                console.error('Error sending start message:', error.message);
            }
        });

        // Test command
        this.bot.onText(/\/test/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`🧪 /test from chat: ${chatId}`);
            
            try {
                await this.bot.sendMessage(chatId, '✅ Bot is working correctly!');
            } catch (error) {
                console.error('Error in test command:', error.message);
            }
        });

        // Set channel command
        this.bot.onText(/\/set_channel/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            console.log(`⚙️ /set_channel from chat: ${chatId}, user: ${userId}`);
            
            await this.bot.sendMessage(chatId, 
                '📢 To set up your channel, please follow these steps:\n\n' +
                '1. Make sure you\'ve added this bot as an admin to your channel\n' +
                '2. Send me your channel username (e.g., @yourchannel) or channel ID\n\n' +
                'Note: The bot needs admin rights to post content to your channel.'
            );
            
            // Set up a one-time listener for the channel ID
            this.bot.once('message', async (channelMsg) => {
                if (channelMsg.chat.id !== chatId) return;
                
                const channelInput = channelMsg.text.trim();
                
                // Validate channel format
                if (!channelInput.startsWith('@') && !/^-100\d+$/.test(channelInput)) {
                    await this.bot.sendMessage(chatId, 
                        '❌ Invalid channel format. Please provide a channel username starting with @ (e.g., @yourchannel) or a channel ID.'
                    );
                    return;
                }
                
                try {
                    // Get bot info
                    const botInfo = await this.bot.getMe();
                    
                    // First check if the bot is an admin in the channel
                    try {
                        const chatMember = await this.bot.getChatMember(channelInput, botInfo.id);
                        
                        if (!['administrator', 'creator'].includes(chatMember.status)) {
                            await this.bot.sendMessage(chatId, 
                                '❌ The bot is not an administrator in your channel.\n' +
                                'Please add the bot as an admin to your channel and try again.'
                            );
                            return;
                        }
                    } catch (adminError) {
                        // If we can't check admin status, the bot likely doesn't have access
                        await this.bot.sendMessage(chatId, 
                            '❌ Could not verify admin status: ' + adminError.message + '\n' +
                            'Please make sure:\n' +
                            '1. The bot is an admin in your channel\n' +
                            '2. The channel username/ID is correct\n' +
                            'Then try again.'
                        );
                        return;
                    }
                    
                    // Try to send a test message to verify access
                    await this.bot.sendMessage(channelInput, '🧪 Test message from SchedulerPost Bot');
                    
                    // Store the channel ID for this user
                    this.userChannels.set(userId, channelInput);
                    
                    await this.bot.sendMessage(chatId, 
                        '✅ Channel setup successful!\n\n' +
                        `Your posts will now be sent to ${channelInput}\n\n` +
                        'You can now use /generate_post to create and post content to your channel.'
                    );
                } catch (error) {
                    await this.bot.sendMessage(chatId, 
                        `❌ Channel setup failed: ${error.message}\n\n` +
                        'Possible reasons:\n' +
                        '- The bot is not an admin in your channel\n' +
                        '- The channel username/ID is incorrect\n' +
                        '- The channel is private and the bot doesn\'t have access\n\n' +
                        'Please add the bot as an admin to your channel and try again.'
                    );
                    console.error('Channel setup failed:', error.message);
                }
            });
        });
        
        // Channel test command
        this.bot.onText(/\/channel/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            console.log(`📺 /channel from chat: ${chatId}`);
            
            // Verify channel access using our helper function
            const channelId = await this.verifyChannelAccess(userId, chatId);
            
            if (!channelId) {
                // Error message already sent by verifyChannelAccess
                return;
            }

            try {
                await this.bot.sendMessage(channelId, '🧪 Test message from SchedulerPost Bot');
                await this.bot.sendMessage(chatId, `✅ Channel access working! Messages will be sent to ${channelId}`);
            } catch (error) {
                await this.bot.sendMessage(chatId, `❌ Channel access failed: ${error.message}`);
                console.error('Channel test failed:', error.message);
            }
        });

        // API test command
        this.bot.onText(/\/apis/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`🔗 /apis from chat: ${chatId}`);
            
            let results = '🔍 API Test Results:\n\n';

            // Test Gemini API
            if (process.env.GEMINI_API_KEY) {
                try {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    // Use the latest model version
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                    const result = await model.generateContent("Say hello in one word");
                    const response = await result.response;
                    results += '✅ Gemini API: Working\n';
                } catch (error) {
                    results += `❌ Gemini API: ${error.message}\n`;
                }
            } else {
                results += '⚠️ Gemini API: Not configured\n';
            }

            // Test Hugging Face API
            if (process.env.HUGGINGFACE_API_KEY) {
                try {
                    // Using axios instead of fetch
                    
                    // Try a different approach - use a text-to-image model which is more likely to be available
                    const response = await axios({
                        method: 'post',
                        url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                        headers: {
                            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        data: { 
                            inputs: "a photo of an astronaut riding a horse on mars"
                        },
                        responseType: 'arraybuffer'
                    });
                    
                    if (response.status === 200) {
                        results += '✅ Hugging Face API: Working\n';
                    } else {
                        const errorText = response.data.toString();
                        results += `❌ Hugging Face API: HTTP ${response.status}\n`;
                        results += `Error details: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}\n`;
                        
                        // If we get a 404, try one more model as a fallback
                        if (response.status === 404) {
                            try {
                                const fallbackResponse = await axios({
                                    method: 'post',
                                    url: 'https://api-inference.huggingface.co/models/bert-base-uncased',
                                    headers: {
                                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                                        'Content-Type': 'application/json',
                                    },
                                    data: { 
                                        inputs: "Hello world"
                                    }
                                });
                                
                                if (fallbackResponse.status === 200) {
                                    results += '✅ Fallback Hugging Face API: Working\n';
                                } else {
                                    results += `❌ Fallback also failed: HTTP ${fallbackResponse.status}\n`;
                                }
                            } catch (fallbackError) {
                                results += `❌ Fallback error: ${fallbackError.message}\n`;
                            }
                        }
                    }
                } catch (error) {
                    results += `❌ Hugging Face API: ${error.message}\n`;
                }
            } else {
                results += '⚠️ Hugging Face API: Not configured\n';
            }

            await this.bot.sendMessage(chatId, results);
        });

        // Info command
        this.bot.onText(/\/info/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`ℹ️ /info from chat: ${chatId}`);
            
            try {
                const botInfo = await this.bot.getMe();
                await this.bot.sendMessage(chatId, 
                    `🤖 Bot Information:\n\n` +
                    `Name: ${botInfo.first_name}\n` +
                    `Username: @${botInfo.username}\n` +
                    `ID: ${botInfo.id}\n` +
                    `Can Join Groups: ${botInfo.can_join_groups}\n` +
                    `Can Read Messages: ${botInfo.can_read_all_group_messages}\n` +
                    `Channel ID: ${process.env.CHANNEL_ID || 'Not set'}`
                );
            } catch (error) {
                console.error('Error getting bot info:', error.message);
            }
        });

        // Error handlers
        this.bot.on('polling_error', (error) => {
            console.error('❌ Polling error:', error.message);
            
            if (error.message.includes('409')) {
                console.log('🔄 Another instance might be running. Stopping...');
                process.exit(1);
            }
            
            // Handle rate limiting
            if (error.message.includes('429')) {
                const retryAfterMatch = error.message.match(/retry after (\d+)/);
                if (retryAfterMatch && retryAfterMatch[1]) {
                    const retryAfterSeconds = parseInt(retryAfterMatch[1]);
                    console.log(`⏳ Rate limited by Telegram. Waiting ${retryAfterSeconds} seconds before retrying...`);
                    
                    // Pause polling for the specified time
                    this.bot.stopPolling();
                    
                    setTimeout(() => {
                        console.log('🔄 Resuming polling after rate limit cooldown');
                        this.bot.startPolling();
                    }, (retryAfterSeconds + 1) * 1000);
                }
            }
        });

        this.bot.on('error', (error) => {
            console.error('❌ Bot error:', error.message);
        });

        // Generate complete post (text + image) command
        this.bot.onText(/\/generate_post/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            console.log(`🔄 /generate_post from chat: ${chatId}, user: ${userId}`);
            
            // Verify channel access using our helper function
            const channelId = await this.verifyChannelAccess(userId, chatId);
            
            if (!channelId) {
                // Error message already sent by verifyChannelAccess
                return;
            }
            
            // Check daily post limit
            if (!this.checkDailyPostLimit()) {
                await this.bot.sendMessage(chatId, '❌ Daily post limit reached (3/3). Try again tomorrow.');
                return;
            }
            
            // Check if APIs are configured
            if (!process.env.GEMINI_API_KEY || !process.env.HUGGINGFACE_API_KEY) {
                await this.bot.sendMessage(chatId, 
                    '❌ API configuration missing:\n' +
                    `${!process.env.GEMINI_API_KEY ? '- Gemini API not configured\n' : ''}` +
                    `${!process.env.HUGGINGFACE_API_KEY ? '- Hugging Face API not configured' : ''}`
                );
                return;
            }
            
            try {
                // Step 1: Ask for the post title/topic
                await this.bot.sendMessage(chatId, 
                    '📝 What would you like to write about?\n' +
                    'Send a title or topic for your post.'
                );
                
                // Set up a one-time listener for the title
                this.bot.once('message', async (titleMsg) => {
                    if (titleMsg.chat.id !== chatId) return;
                    
                    const title = titleMsg.text;
                    if (!title) {
                        await this.bot.sendMessage(chatId, '❌ Please provide a valid title');
                        return;
                    }
                    
                    await this.bot.sendMessage(chatId, '⏳ Generating text content...');
                    
                    try {
                        // Generate text content
                        const { GoogleGenerativeAI } = require('@google/generative-ai');
                        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                        
                        // Generate content with specific instructions for shorter post
                        const textPrompt = `Write a short, engaging post about: ${title}. 
                        Make it suitable for a Telegram channel post.
                        IMPORTANT REQUIREMENTS:
                        1. Use simple, straightforward language - avoid flowery or complex words
                        2. Keep it STRICTLY to 2 short paragraphs only
                        3. Focus only on the main points - be direct and concise
                        4. Do NOT include any hashtags, asterisks, or formatting
                        5. Total length should be around 3-5 sentences total`;
                        
                        const textResult = await model.generateContent(textPrompt);
                        const textResponse = await textResult.response;
                        const postText = textResponse.text();
                        
                        // Send the generated text
                        await this.bot.sendMessage(chatId, postText);
                        
                        // Step 2: Ask if they want to add an image
                        await this.bot.sendMessage(chatId, 
                            '🖼️ Would you like to add an image to this post?\n\n' +
                            '1. Yes, generate an image based on the title\n' +
                            '2. Yes, I\'ll describe a specific image\n' +
                            '3. No, text only\n\n' +
                            'Reply with the number of your choice.'
                        );
                        
                        // Set up a one-time listener for the image choice
                        this.bot.once('message', async (imageChoiceMsg) => {
                            if (imageChoiceMsg.chat.id !== chatId) return;
                            
                            const imageChoice = imageChoiceMsg.text;
                            
                            // Handle text-only post
                            if (imageChoice === '3') {
                                // Show options for text-only post
                                await this.bot.sendMessage(chatId, '✅ Here\'s your text-only post:');
                                await this.bot.sendMessage(chatId, postText);
                                
                                await this.showPostOptions(chatId, postText, null, null);
                                return;
                            }
                            
                            let imagePrompt = '';
                            
                            // Handle image generation based on title
                            if (imageChoice === '1') {
                                imagePrompt = title;
                                await this.bot.sendMessage(chatId, `⏳ Generating image based on: "${title}"... This may take a minute.`);
                            }
                            // Handle custom image description
                            else if (imageChoice === '2') {
                                await this.bot.sendMessage(chatId, 
                                    '🎨 Please describe the image you want:\n' +
                                    'What image would complement this content?'
                                );
                                
                                // Wait for image description
                                const imageDescriptionPromise = new Promise(resolve => {
                                    this.bot.once('message', (imageDescMsg) => {
                                        if (imageDescMsg.chat.id !== chatId) return;
                                        resolve(imageDescMsg.text);
                                    });
                                });
                                
                                imagePrompt = await imageDescriptionPromise;
                                
                                if (!imagePrompt) {
                                    await this.bot.sendMessage(chatId, '❌ Please provide a valid image description');
                                    return;
                                }
                                
                                await this.bot.sendMessage(chatId, `⏳ Generating image... This may take a minute.`);
                            }
                            // Handle invalid choice
                            else {
                                await this.bot.sendMessage(chatId, '❌ Invalid choice. Using text-only post.');
                                await this.showPostOptions(chatId, postText, null, null);
                                return;
                            }
                            
                            try {
                                // Generate image
                                // Using axios instead of fetch
                                const response = await axios({
                                    method: 'post',
                                    url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                                    headers: {
                                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                                        'Content-Type': 'application/json',
                                    },
                                    data: { 
                                        inputs: imagePrompt
                                    },
                                    responseType: 'arraybuffer'
                                });
                                
                                if (response.status === 200) {
                                    // Get the image data
                                    const imageBuffer = Buffer.from(response.data);
                                    
                                    // Send the complete post preview
                                    await this.bot.sendMessage(chatId, '✅ Here\'s your complete post:');
                                    
                                    console.log('Sending preview photo with caption');
                                    // Make sure we're explicitly setting the caption option
                                    const previewOptions = {
                                        caption: postText
                                    };
                                    console.log('Preview caption options:', previewOptions);
                                    
                                    // Send preview
                                    await this.bot.sendPhoto(chatId, imageBuffer, previewOptions);
                                    
                                    // Show post options
                                    await this.showPostOptions(chatId, postText, imageBuffer, imagePrompt);
                                } else {
                                    const errorText = response.data.toString();
                                    await this.bot.sendMessage(chatId, `❌ Failed to generate image: ${response.status} ${errorText.substring(0, 100)}`);
                                    // Show options for text-only post as fallback
                                    await this.bot.sendMessage(chatId, '✅ Proceeding with text-only post:');
                                    await this.showPostOptions(chatId, postText, null, null);
                                }
                            } catch (error) {
                                await this.bot.sendMessage(chatId, `❌ Error generating image: ${error.message}`);
                                // Show options for text-only post as fallback
                                await this.bot.sendMessage(chatId, '✅ Proceeding with text-only post:');
                                await this.showPostOptions(chatId, postText, null, null);
                            }
                        });
                    } catch (error) {
                        await this.bot.sendMessage(chatId, `❌ Error generating text: ${error.message}`);
                        // Decrement the post count since we failed
                        this.dailyPostCount--;
                    }
                });
            } catch (error) {
                console.error('Error in generate_post command:', error.message);
                // Decrement the post count since we failed
                this.dailyPostCount--;
            }
        });
        
        // Generate text command
        this.bot.onText(/\/generate_text/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`📝 /generate_text from chat: ${chatId}`);
            
            // Check if Gemini API is configured
            if (!process.env.GEMINI_API_KEY) {
                await this.bot.sendMessage(chatId, '❌ Gemini API not configured');
                return;
            }
            
            try {
                // Ask for the prompt
                await this.bot.sendMessage(chatId, 
                    '🤖 What would you like me to write about?\n' +
                    'Send a topic or prompt, and I\'ll generate content using Gemini AI.'
                );
                
                // Set up a one-time listener for the next message
                this.bot.once('message', async (promptMsg) => {
                    if (promptMsg.chat.id !== chatId) return; // Ensure it's from the same chat
                    
                    const prompt = promptMsg.text;
                    if (!prompt) {
                        await this.bot.sendMessage(chatId, '❌ Please provide a valid prompt');
                        return;
                    }
                    
                    await this.bot.sendMessage(chatId, '⏳ Generating content...');
                    
                    try {
                        const { GoogleGenerativeAI } = require('@google/generative-ai');
                        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                        
                        // Generate content with a more specific instruction
                        const fullPrompt = `Write a short, engaging post about: ${prompt}. 
                        Make it suitable for a Telegram channel post.
                        IMPORTANT REQUIREMENTS:
                        1. Use simple, straightforward language - avoid flowery or complex words
                        2. Keep it STRICTLY to 2 short paragraphs only
                        3. Focus only on the main points - be direct and concise
                        4. Do NOT include any hashtags, asterisks, or formatting
                        5. Total length should be around 3-5 sentences total`;
                        
                        const result = await model.generateContent(fullPrompt);
                        const response = await result.response;
                        const text = response.text();
                        
                        // Send the generated content
                        await this.bot.sendMessage(chatId, text);
                        
                        // Ask if they want to post it to the channel
                        if (process.env.CHANNEL_ID) {
                            await this.bot.sendMessage(chatId, 
                                '📢 Would you like to post this to your channel?\n' +
                                'Reply with "yes" to post now or "no" to cancel.'
                            );
                            
                            // Set up a one-time listener for the confirmation
                            this.bot.once('message', async (confirmMsg) => {
                                if (confirmMsg.chat.id !== chatId) return;
                                
                                const confirmation = confirmMsg.text.toLowerCase();
                                if (confirmation === 'yes') {
                                    try {
                                        await this.bot.sendMessage(process.env.CHANNEL_ID, text);
                                        await this.bot.sendMessage(chatId, '✅ Posted to channel successfully!');
                                    } catch (error) {
                                        await this.bot.sendMessage(chatId, `❌ Failed to post to channel: ${error.message}`);
                                    }
                                } else {
                                    await this.bot.sendMessage(chatId, '❌ Post cancelled');
                                }
                            });
                        }
                    } catch (error) {
                        await this.bot.sendMessage(chatId, `❌ Error generating content: ${error.message}`);
                    }
                });
            } catch (error) {
                console.error('Error in generate_text command:', error.message);
            }
        });
        
        // Generate image command
        this.bot.onText(/\/generate_image/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`🖼️ /generate_image from chat: ${chatId}`);
            
            // Check if Hugging Face API is configured
            if (!process.env.HUGGINGFACE_API_KEY) {
                await this.bot.sendMessage(chatId, '❌ Hugging Face API not configured');
                return;
            }
            
            try {
                // Ask for the prompt
                await this.bot.sendMessage(chatId, 
                    '🎨 What image would you like me to generate?\n' +
                    'Describe the image you want, and I\'ll generate it using AI.'
                );
                
                // Set up a one-time listener for the next message
                this.bot.once('message', async (promptMsg) => {
                    if (promptMsg.chat.id !== chatId) return; // Ensure it's from the same chat
                    
                    const prompt = promptMsg.text;
                    if (!prompt) {
                        await this.bot.sendMessage(chatId, '❌ Please provide a valid description');
                        return;
                    }
                    
                    await this.bot.sendMessage(chatId, '⏳ Generating image... This may take a minute.');
                    
                    try {
                        // Using axios instead of fetch
                        const response = await axios({
                            method: 'post',
                            url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                            headers: {
                                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            data: { 
                                inputs: prompt
                            },
                            responseType: 'arraybuffer'
                        });
                        
                        if (response.status === 200) {
                            // Get the image data
                            const imageBuffer = Buffer.from(response.data);
                            
                            // Send the image
                            await this.bot.sendPhoto(chatId, imageBuffer, { caption: `Generated image for: "${prompt}"` });
                            
                            // Ask if they want to post it to the channel
                            if (process.env.CHANNEL_ID) {
                                await this.bot.sendMessage(chatId, 
                                    '📢 Would you like to post this to your channel?\n' +
                                    'Reply with "yes" to post now or "no" to cancel.'
                                );
                                
                                // Set up a one-time listener for the confirmation
                                this.bot.once('message', async (confirmMsg) => {
                                    if (confirmMsg.chat.id !== chatId) return;
                                    
                                    const confirmation = confirmMsg.text.toLowerCase();
                                    if (confirmation === 'yes') {
                                        try {
                                            await this.bot.sendPhoto(process.env.CHANNEL_ID, imageBuffer, { caption: prompt });
                                            await this.bot.sendMessage(chatId, '✅ Posted to channel successfully!');
                                        } catch (error) {
                                            await this.bot.sendMessage(chatId, `❌ Failed to post to channel: ${error.message}`);
                                        }
                                    } else {
                                        await this.bot.sendMessage(chatId, '❌ Post cancelled');
                                    }
                                });
                            }
                        } else {
                            const errorText = await response.text();
                            await this.bot.sendMessage(chatId, `❌ Failed to generate image: ${response.status} ${errorText.substring(0, 100)}`);
                        }
                    } catch (error) {
                        await this.bot.sendMessage(chatId, `❌ Error generating image: ${error.message}`);
                    }
                });
            } catch (error) {
                console.error('Error in generate_image command:', error.message);
            }
        });
        
        // Schedule post command
        this.bot.onText(/\/schedule/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            console.log(`📅 /schedule from chat: ${chatId}, user: ${userId}`);
            
            // Verify channel access using our helper function
            const channelId = await this.verifyChannelAccess(userId, chatId);
            
            if (!channelId) {
                // Error message already sent by verifyChannelAccess
                return;
            }
            
            try {
                // Ask what type of content to schedule
                await this.bot.sendMessage(chatId, 
                    '📝 What type of content would you like to schedule?\n\n' +
                    '1. Text post (AI-generated)\n' +
                    '2. Image post (AI-generated)\n' +
                    '3. Custom message\n\n' +
                    'Reply with the number of your choice.'
                );
                
                // Set up a one-time listener for content type
                this.bot.once('message', async (typeMsg) => {
                    if (typeMsg.chat.id !== chatId) return;
                    
                    const contentType = typeMsg.text;
                    if (!['1', '2', '3'].includes(contentType)) {
                        await this.bot.sendMessage(chatId, '❌ Invalid choice. Please use /schedule to try again.');
                        return;
                    }
                    
                    // Handle different content types
                    if (contentType === '1') {
                        // AI-generated text
                        await this.bot.sendMessage(chatId, 
                            '🤖 What topic would you like the AI to write about?\n' +
                            'Send a topic or prompt for the AI-generated text.'
                        );
                        
                        this.bot.once('message', async (promptMsg) => {
                            if (promptMsg.chat.id !== chatId) return;
                            
                            const prompt = promptMsg.text;
                            if (!prompt) {
                                await this.bot.sendMessage(chatId, '❌ Please provide a valid prompt');
                                return;
                            }
                            
                            // Now ask for scheduling time
                            await this.askForScheduleTime(chatId, {
                                type: 'text',
                                prompt: prompt,
                                contentType: 'ai-text'
                            });
                        });
                    } else if (contentType === '2') {
                        // AI-generated image
                        await this.bot.sendMessage(chatId, 
                            '🎨 What image would you like the AI to generate?\n' +
                            'Describe the image you want for the scheduled post.'
                        );
                        
                        this.bot.once('message', async (promptMsg) => {
                            if (promptMsg.chat.id !== chatId) return;
                            
                            const prompt = promptMsg.text;
                            if (!prompt) {
                                await this.bot.sendMessage(chatId, '❌ Please provide a valid description');
                                return;
                            }
                            
                            // Now ask for scheduling time
                            await this.askForScheduleTime(chatId, {
                                type: 'image',
                                prompt: prompt,
                                contentType: 'ai-image'
                            });
                        });
                    } else if (contentType === '3') {
                        // Custom message
                        await this.bot.sendMessage(chatId, 
                            '✏️ Please enter the custom message you want to schedule:'
                        );
                        
                        this.bot.once('message', async (contentMsg) => {
                            if (contentMsg.chat.id !== chatId) return;
                            
                            const content = contentMsg.text;
                            if (!content) {
                                await this.bot.sendMessage(chatId, '❌ Please provide valid content');
                                return;
                            }
                            
                            // Now ask for scheduling time
                            await this.askForScheduleTime(chatId, {
                                type: 'text',
                                content: content,
                                contentType: 'custom'
                            });
                        });
                    }
                });
            } catch (error) {
                console.error('Error in schedule command:', error.message);
                await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        });
        
        // List scheduled posts command
        this.bot.onText(/\/list_scheduled/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`📋 /list_scheduled from chat: ${chatId}`);
            
            try {
                if (this.scheduledPosts.length === 0) {
                    await this.bot.sendMessage(chatId, '📅 No scheduled posts found.');
                    return;
                }
                
                let message = '📅 Scheduled Posts:\n\n';
                
                this.scheduledPosts.forEach((post, index) => {
                    const date = new Date(post.timestamp);
                    message += `${index + 1}. [${post.contentType}] - ${date.toLocaleString()}\n`;
                    
                    if (post.contentType === 'custom') {
                        message += `Content: ${post.content.substring(0, 30)}${post.content.length > 30 ? '...' : ''}\n`;
                    } else if (post.contentType === 'ai-text' || post.contentType === 'ai-image') {
                        message += `Prompt: ${post.prompt.substring(0, 30)}${post.prompt.length > 30 ? '...' : ''}\n`;
                    } else if (post.contentType === 'combined-post') {
                        message += `Combined post (text + image)\n`;
                        message += `Text: ${post.text.substring(0, 30)}${post.text.length > 30 ? '...' : ''}\n`;
                    }
                    
                    message += '\n';
                });
                
                await this.bot.sendMessage(chatId, message);
            } catch (error) {
                console.error('Error listing scheduled posts:', error.message);
                await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        });
        
        // Cancel scheduled post command
        this.bot.onText(/\/cancel_scheduled/, async (msg) => {
            const chatId = msg.chat.id;
            console.log(`❌ /cancel_scheduled from chat: ${chatId}`);
            
            try {
                if (this.scheduledPosts.length === 0) {
                    await this.bot.sendMessage(chatId, '📅 No scheduled posts to cancel.');
                    return;
                }
                
                let message = '📅 Select a post to cancel:\n\n';
                
                this.scheduledPosts.forEach((post, index) => {
                    const date = new Date(post.timestamp);
                    message += `${index + 1}. [${post.contentType}] - ${date.toLocaleString()}\n`;
                    
                    if (post.contentType === 'custom') {
                        message += `Content: ${post.content.substring(0, 30)}${post.content.length > 30 ? '...' : ''}\n`;
                    } else if (post.contentType === 'ai-text' || post.contentType === 'ai-image') {
                        message += `Prompt: ${post.prompt.substring(0, 30)}${post.prompt.length > 30 ? '...' : ''}\n`;
                    } else if (post.contentType === 'combined-post') {
                        message += `Combined post (text + image)\n`;
                        message += `Text: ${post.text.substring(0, 30)}${post.text.length > 30 ? '...' : ''}\n`;
                    }
                    
                    message += '\n';
                });
                
                message += 'Reply with the number of the post you want to cancel.';
                
                await this.bot.sendMessage(chatId, message);
                
                // Set up a one-time listener for the selection
                this.bot.once('message', async (selectionMsg) => {
                    if (selectionMsg.chat.id !== chatId) return;
                    
                    const selection = parseInt(selectionMsg.text);
                    if (isNaN(selection) || selection < 1 || selection > this.scheduledPosts.length) {
                        await this.bot.sendMessage(chatId, '❌ Invalid selection. Please try again.');
                        return;
                    }
                    
                    const index = selection - 1;
                    const post = this.scheduledPosts[index];
                    
                    // Clear the scheduled job
                    if (post.job) {
                        clearTimeout(post.job);
                    }
                    
                    // Remove from the array
                    this.scheduledPosts.splice(index, 1);
                    
                    await this.bot.sendMessage(chatId, '✅ Scheduled post cancelled successfully.');
                });
            } catch (error) {
                console.error('Error cancelling scheduled post:', error.message);
                await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
            }
        });
        
        // Log all messages for debugging
        this.bot.on('message', (msg) => {
            if (msg.text) {
                console.log(`📩 Message from ${msg.from.first_name} (${msg.chat.id}): ${msg.text}`);
            } else {
                console.log(`📩 Non-text message from ${msg.from.first_name} (${msg.chat.id})`);
            }
        });
    }
    
    // Helper method to ask for schedule time
    async askForScheduleTime(chatId, postData) {
        try {
            // Get user ID from chat ID (assuming private chat)
            const userId = chatId;
            
            await this.bot.sendMessage(chatId, 
                '⏰ When would you like to schedule this post?\n\n' +
                'Please enter the number of minutes from now (e.g., 5 for 5 minutes from now).\n' +
                'For testing purposes, we recommend using a small value like 1-5 minutes.'
            );
            
            this.bot.once('message', async (timeMsg) => {
                if (timeMsg.chat.id !== chatId) return;
                
                const minutes = parseInt(timeMsg.text);
                if (isNaN(minutes) || minutes < 1) {
                    await this.bot.sendMessage(chatId, '❌ Please provide a valid number of minutes');
                    return;
                }
                
                const timestamp = Date.now() + (minutes * 60 * 1000);
                const scheduledTime = new Date(timestamp);
                
                // Schedule the post
                await this.schedulePost(chatId, {
                    ...postData,
                    timestamp,
                    userId // Store the user ID with the post data
                });
                
                await this.bot.sendMessage(chatId, 
                    `✅ Post scheduled for ${scheduledTime.toLocaleString()}.\n` +
                    `(${minutes} minutes from now)`
                );
            });
        } catch (error) {
            console.error('Error asking for schedule time:', error.message);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }
    
    // Helper method to show post options (post now, schedule, cancel)
    async showPostOptions(chatId, postText, imageBuffer, imagePrompt) {
        try {
            // Get user ID from chat ID (assuming private chat)
            const userId = chatId;
            
            // Verify channel access using our helper function
            const channelId = await this.verifyChannelAccess(userId, chatId);
            
            if (!channelId) {
                // Error message already sent by verifyChannelAccess
                return;
            }
            
            // We have a verified channel
            const hasChannel = true;
            
            // Ask what to do with the post
            await this.bot.sendMessage(chatId, 
                '📢 What would you like to do with this post?\n\n' +
                (hasChannel ? `1. Post now to channel ${channelId}\n` : '1. Post now to this chat\n') +
                '2. Schedule for later\n' +
                '3. Cancel\n\n' +
                'Reply with the number of your choice.'
            );
            
            // Set up a one-time listener for the action choice
            this.bot.once('message', async (actionMsg) => {
                if (actionMsg.chat.id !== chatId) return;
                
                const action = actionMsg.text;
                
                if (action === '1') {
                    // Post now
                    try {
                        // Determine target chat ID (channel or current chat)
                        const targetChatId = hasChannel ? channelId : chatId;
                        
                        // If we have an image, send it with the text as caption
                        if (imageBuffer) {
                            console.log(`Sending photo with caption to ${hasChannel ? 'channel' : 'chat'}`);
                            // Make sure we're explicitly setting the caption option
                            const options = {
                                caption: postText
                            };
                            console.log('Caption options:', options);
                            
                            // Send to target
                            await this.bot.sendPhoto(targetChatId, imageBuffer, options);
                        } else {
                            // Otherwise just send the text
                            await this.bot.sendMessage(targetChatId, postText);
                        }
                        
                        await this.bot.sendMessage(chatId, hasChannel ? 
                            `✅ Posted to channel ${channelId} successfully!` : 
                            '✅ Posted to this chat successfully!');
                    } catch (error) {
                        console.error(`Error posting to ${hasChannel ? 'channel' : 'chat'}:`, error);
                        await this.bot.sendMessage(chatId, `❌ Failed to post: ${error.message}`);
                        
                        if (hasChannel) {
                            await this.bot.sendMessage(chatId, 
                                'Please make sure:\n' +
                                '1. The bot is an admin in your channel\n' +
                                '2. The channel username/ID is correct\n' +
                                'You can use /set_channel to reconfigure your channel.'
                            );
                        }
                    }
                } else if (action === '2') {
                    // Schedule for later
                    if (!hasChannel) {
                        await this.bot.sendMessage(chatId, 
                            '⚠️ No channel configured. Posts will be scheduled to this chat instead.\n' +
                            'Use /set_channel to configure a channel for posting.'
                        );
                        // Continue with scheduling to the current chat
                    }
                    
                    if (imageBuffer) {
                        // Store image buffer as base64 for scheduling
                        const base64Image = imageBuffer.toString('base64');
                        
                        // Ask for scheduling time
                        await this.askForScheduleTime(chatId, {
                            type: 'combined',
                            text: postText,
                            imageBase64: base64Image,
                            imagePrompt: imagePrompt,
                            contentType: 'combined-post'
                        });
                    } else {
                        // Schedule text-only post
                        await this.askForScheduleTime(chatId, {
                            type: 'text',
                            content: postText,
                            contentType: 'custom'
                        });
                    }
                } else {
                    // Cancel
                    await this.bot.sendMessage(chatId, '❌ Post cancelled');
                    // Decrement the post count since we're not using it
                    this.dailyPostCount--;
                }
            });
        } catch (error) {
            console.error('Error showing post options:', error.message);
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }
    
    // Helper method to schedule a post
    async schedulePost(chatId, postData) {
        try {
            const timeUntilPost = postData.timestamp - Date.now();
            
            // Get user ID from post data or fallback to chat ID
            const userId = postData.userId || chatId;
            
            // Verify channel access using our helper function
            const targetChatId = await this.verifyChannelAccess(userId, chatId);
            if (!targetChatId) {
                // Error message already sent by verifyChannelAccess
                return;
            }
            
            
            // Create a timeout for the scheduled post
            const job = setTimeout(async () => {
                try {
                    // Generate and post content based on type
                    if (postData.contentType === 'ai-text') {
                        // Generate AI text
                        const { GoogleGenerativeAI } = require('@google/generative-ai');
                        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
                        
                        const fullPrompt = `Write a short, engaging post about: ${postData.prompt}. 
                        Make it suitable for a Telegram channel post.
                        IMPORTANT REQUIREMENTS:
                        1. Use simple, straightforward language - avoid flowery or complex words
                        2. Keep it STRICTLY to 2 short paragraphs only
                        3. Focus only on the main points - be direct and concise
                        4. Do NOT include any hashtags, asterisks, or formatting
                        5. Total length should be around 3-5 sentences total`;
                        
                        const result = await model.generateContent(fullPrompt);
                        const response = await result.response;
                        const text = response.text();
                        
                        // Post to target chat/channel
                        await this.bot.sendMessage(targetChatId, text);
                        
                        // Notify user
                        await this.bot.sendMessage(chatId, `✅ Scheduled AI text post has been sent to ${targetChatId === chatId ? 'this chat' : 'your channel'}!`);
                    } else if (postData.contentType === 'ai-image') {
                        // Generate AI image
                        // Using axios instead of fetch
                        const response = await axios({
                            method: 'post',
                            url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                            headers: {
                                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            data: { 
                                inputs: postData.prompt
                            },
                            responseType: 'arraybuffer'
                        });
                        
                        if (response.status === 200) {
                            // Get the image data
                            const imageBuffer = Buffer.from(response.data);
                            
                            // Post to target chat/channel
                            await this.bot.sendPhoto(targetChatId, imageBuffer, { caption: postData.prompt });
                            
                            // Notify user
                            await this.bot.sendMessage(chatId, `✅ Scheduled AI image post has been sent to ${targetChatId === chatId ? 'this chat' : 'your channel'}!`);
                        } else {
                            const errorText = await response.text();
                            await this.bot.sendMessage(chatId, `❌ Failed to generate scheduled image: ${response.status} ${errorText.substring(0, 100)}`);
                        }
                    } else if (postData.contentType === 'custom') {
                        // Post custom content
                        await this.bot.sendMessage(targetChatId, postData.content);
                        
                        // Notify user
                        await this.bot.sendMessage(chatId, `✅ Scheduled custom post has been sent to ${targetChatId === chatId ? 'this chat' : 'your channel'}!`);
                    } else if (postData.contentType === 'combined-post') {
                        // Post combined text and image
                        
                        // Convert base64 image back to buffer
                        const imageBuffer = Buffer.from(postData.imageBase64, 'base64');
                        
                        console.log(`Sending scheduled photo with caption to ${targetChatId === chatId ? 'chat' : 'channel'}`);
                        // Make sure we're explicitly setting the caption option
                        const options = {
                            caption: postData.text
                        };
                        console.log('Scheduled caption options:', options);
                        
                        // Send image with text as caption
                        await this.bot.sendPhoto(targetChatId, imageBuffer, options);
                        
                        // Notify user
                        await this.bot.sendMessage(chatId, `✅ Scheduled combined post (text + image) has been sent to ${targetChatId === chatId ? 'this chat' : 'your channel'}!`);
                    }
                    
                    // Remove from scheduled posts
                    const index = this.scheduledPosts.findIndex(post => post.timestamp === postData.timestamp);
                    if (index !== -1) {
                        this.scheduledPosts.splice(index, 1);
                    }
                } catch (error) {
                    console.error('Error executing scheduled post:', error.message);
                    await this.bot.sendMessage(chatId, `❌ Error executing scheduled post: ${error.message}`);
                }
            }, timeUntilPost);
            
            // Store the scheduled post
            this.scheduledPosts.push({
                ...postData,
                job
            });
        } catch (error) {
            console.error('Error scheduling post:', error.message);
            throw error;
        }
    }
}

// Start the SchedulerPost bot
try {
    new SchedulerPostBot();
} catch (error) {
    console.error('❌ Failed to start SchedulerPost bot:', error);
    process.exit(1);
}