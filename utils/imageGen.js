const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');

class ImageService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.defaultModel = 'stabilityai/stable-diffusion-xl-base-1.0'; // High quality model
        this.fallbackModel = 'runwayml/stable-diffusion-v1-5'; // Fallback model
    }

    async generateImage(prompt, negativePrompt = '') {
        try {
            // First try with the high-quality model
            try {
                return await this._generateWithModel(this.defaultModel, prompt, negativePrompt);
            } catch (error) {
                console.log('Falling back to alternative model...');
                return await this._generateWithModel(this.fallbackModel, prompt, negativePrompt);
            }
        } catch (error) {
            console.error('Error generating image:', error);
            throw error;
        }
    }

    async _generateWithModel(model, prompt, negativePrompt) {
        const response = await fetch(`${this.baseUrl}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                negative_prompt: negativePrompt || 'blurry, low quality, distorted, ugly, bad anatomy, watermark',
                parameters: {
                    num_inference_steps: 50,
                    guidance_scale: 7.5,
                    width: 1024,
                    height: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const imageBuffer = await response.buffer();
        return imageBuffer;
    }

    async downloadImage(imageBuffer) {
        return imageBuffer; // Already have the buffer from Hugging Face
    }

    async getTechImage(prompt) {
        try {
            // Enhance the prompt for better tech-related images
            const enhancedPrompt = `professional tech photography, ${prompt}, high quality, 4k, detailed, professional lighting, studio quality`;
            const negativePrompt = 'cartoon, illustration, painting, drawing, text, watermark, signature, blurry, low quality, distorted';

            const imageBuffer = await this.generateImage(enhancedPrompt, negativePrompt);
            return imageBuffer;
        } catch (error) {
            console.error('Error getting tech image:', error);
            throw error;
        }
    }
}

module.exports = ImageService;
