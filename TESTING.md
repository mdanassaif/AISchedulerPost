# Testing SchedulerPost Bot

This guide will help you test the SchedulerPost Bot locally before deploying it to Render.com.

## Prerequisites

Before testing, make sure you have:

1. Node.js installed (v14 or higher)
2. A Telegram bot token from [@BotFather](https://t.me/BotFather)
3. A Gemini API key for text generation
4. A Hugging Face API key for image generation
5. (Optional) A Telegram channel where you want to post content

## Setup for Testing

1. Clone the repository to your local machine
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   CHANNEL_ID=your_channel_id_optional
   ```

## Running the Tests

1. Run the test script to verify API connections:
   ```
   node test.js
   ```
   This will check:
   - Bot connection
   - Gemini API connection
   - Hugging Face API connection
   - Channel access (if configured)

2. If all tests pass, start the bot:
   ```
   npm start
   ```

## Testing the Bot on Telegram

1. Start a chat with your bot on Telegram
2. Send the `/start` command to see the welcome message
3. Test the channel setup:
   - Add your bot as an admin to your Telegram channel
   - Use the `/set_channel` command in your chat with the bot
   - Send your channel username (e.g., @yourchannel) when prompted
   - The bot will verify access by sending a test message

4. Test content generation:
   - Use `/generate_post` to create a post
   - Follow the prompts to generate text and optionally an image
   - Choose to post now or schedule for later

5. Test scheduling:
   - Use `/schedule` to schedule a post
   - Choose the type of content (text, image, or custom)
   - Set a time (e.g., 1 minute from now for testing)
   - Verify that the post is sent at the scheduled time

6. Test scheduled post management:
   - Use `/list_scheduled` to see all scheduled posts
   - Use `/cancel_scheduled` to cancel a scheduled post

## Common Issues

1. **Bot not responding**: Make sure your bot token is correct and the bot is running
2. **API errors**: Verify your API keys are correct and have the necessary permissions
3. **Channel access errors**: Ensure the bot is an admin in your channel
4. **Image generation errors**: Hugging Face models sometimes need time to load, retry if it fails
5. **Rate limit errors (429)**: Telegram has rate limits on how many requests you can make in a short period. The bot now has built-in handling for this:
   - It will automatically pause and resume after the required waiting period
   - You'll see a message like: `⏳ Rate limited by Telegram. Waiting X seconds before retrying...`
   - Just wait for the cooldown period to end and the bot will resume automatically

## Next Steps

Once you've verified that everything works locally, you can deploy the bot to Render.com following the instructions in DEPLOYMENT.md.