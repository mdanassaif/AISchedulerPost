# Deploying SchedulerPost Bot on Render.com

This guide will help you deploy the SchedulerPost Bot on Render.com for 24/7 availability.

## Prerequisites

Before deploying, make sure you have:

1. A Telegram bot token from [@BotFather](https://t.me/BotFather)
2. A Gemini API key for text generation
3. A Hugging Face API key for image generation
4. (Optional) A Telegram channel where you want to post content

## Deployment Steps

### 1. Prepare Your Repository

1. Push your code to a GitHub repository
2. Make sure your repository includes:
   - All the code files
   - package.json
   - Procfile
   - render.yaml

### 2. Set Up on Render.com

1. Create an account on [Render.com](https://render.com) if you don't have one
2. Go to your Dashboard and click "New" > "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: SchedulerPost Bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

### 3. Configure Environment Variables

Add the following environment variables in the Render dashboard:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `GEMINI_API_KEY`: Your Gemini API key
- `HUGGINGFACE_API_KEY`: Your Hugging Face API key
- `CHANNEL_ID`: (Optional) Your default channel ID

### 4. Deploy the Service

1. Click "Create Web Service"
2. Wait for the deployment to complete
3. Your bot will be online and accessible 24/7

## Using the Bot

1. Start a chat with your bot on Telegram
2. Use the `/set_channel` command to configure your channel
3. Follow the instructions to add the bot to your channel as an admin
4. Start generating and scheduling posts!

## Troubleshooting

If you encounter any issues:

1. Check the logs in the Render dashboard
2. Make sure all API keys are correctly set
3. Verify that the bot has admin privileges in your channel
4. Try redeploying the service if needed

## Maintaining Your Bot

- Monitor your API usage to avoid hitting rate limits
- Update your API keys if they expire
- Check the Render dashboard for any service interruptions