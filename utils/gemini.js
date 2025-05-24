const { GoogleGenerativeAI } = require('@google/generative-ai');
// Import node-fetch at the top level
let fetch;
try {
    // Try to use the global fetch if available (Node.js 18+)
    if (typeof global.fetch === 'function') {
        fetch = global.fetch;
    } else {
        // Otherwise use node-fetch
        fetch = require('node-fetch');
    }
} catch (error) {
    console.error('Error importing fetch:', error);
    // Fallback to dynamic import if needed
    fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}
const { categories } = require('./config');

class GeminiService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.lastRequestTime = 0;
        this.minRequestInterval = 2000; // 2 seconds for free tier
        this.model = "gemini-2.0-flash"; // Updated to current model
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
            await this.sleep(this.minRequestInterval - timeSinceLastRequest);
        }
        
        this.lastRequestTime = Date.now();
    }

    async handleApiCall(apiCall, statusCallback) {
        let retries = 0;
        const maxRetries = 3;
        const baseDelay = 2000;

        while (retries <= maxRetries) {
            try {
                await this.waitForRateLimit();
                return await apiCall();
            } catch (error) {
                console.error('API call error:', error);
                if (error.status === 429 && retries < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retries);
                    const message = `⏳ Rate limit hit. Retrying in ${delay/1000} seconds...`;
                    if (statusCallback) {
                        await statusCallback(message);
                    }
                    console.log(message);
                    await this.sleep(delay);
                    retries++;
                } else {
                    throw error;
                }
            }
        }
    }

    async generateContent(prompt, statusCallback) {
        try {
            if (!this.genAI) {
                throw new Error('Gemini API not initialized');
            }

            const model = this.genAI.getGenerativeModel({ model: this.model });
            
            return await this.handleApiCall(async () => {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            }, statusCallback);
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    async generateImagePrompt(content, statusCallback) {
        try {
            const prompt = `You are a professional photographer creating an image for this content: ${content.title}
            
            Generate a search query for an AI image generator that will create the perfect image for this content.
            The image should be:
            - High quality and professional
            - Relevant to the content
            - Suitable for social media
            - Modern and visually appealing
            
            Requirements:
            - Use specific, searchable terms
            - Include style keywords (e.g., minimalist, modern, professional)
            - Include color preferences if relevant
            - Keep it under 5 words for best results
            
            Return only the search query, nothing else.`;

            return await this.generateContent(prompt, statusCallback);
        } catch (error) {
            console.error('Error generating image prompt:', error);
            throw error;
        }
    }
}

module.exports = GeminiService;
