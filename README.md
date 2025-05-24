# SchedulerPost Bot

A Telegram bot for generating and scheduling posts with AI-generated text and images.

## Features

- Generate complete posts with AI-generated text and images
- Schedule posts for later publication
- Manage scheduled posts (list, cancel)
- Daily post limit to prevent overuse

## Requirements

- Node.js 14+
- Telegram Bot Token (from @BotFather)
- Gemini API Key (for text generation)
- Hugging Face API Key (for image generation)
- Optional: Telegram Channel ID (if you want to post to a channel)

## Setup

1. Clone this repository
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
4. Start the bot:
   ```
   npm start
   ```

## Deploying to Render.com

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: SchedulerPost Bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

4. Add environment variables in the Render dashboard:
   - `TELEGRAM_BOT_TOKEN`
   - `GEMINI_API_KEY`
   - `HUGGINGFACE_API_KEY`
   - `CHANNEL_ID` (optional)

5. Deploy the service

## Usage

Start the bot by sending `/start` in Telegram. The bot will display available commands:

### Setting Up Your Channel

1. Add the bot as an administrator to your Telegram channel
2. Use the `/set_channel` command in your private chat with the bot
3. Send your channel username (e.g., @yourchannel) or channel ID when prompted
4. The bot will verify access by sending a test message

### Creating and Posting Content

- `/generate_post` - Generate a complete post with text and image
- `/schedule` - Schedule a post
- `/list_scheduled` - List all scheduled posts
- `/cancel_scheduled` - Cancel a scheduled post

## Notes

- Each user can configure their own channel for posting
- The bot must be an administrator in your channel to post content
- If no channel is configured, posts will be sent to the chat where the command was issued
- Daily post limit is set to 3 posts per day to prevent API overuse
