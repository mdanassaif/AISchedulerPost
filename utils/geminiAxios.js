const axios = require('axios');

class GeminiAxiosService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.model = 'gemini-1.5-pro';
    }

    async generateContent(prompt) {
        try {
            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                }
            });

            // Extract the text from the response
            if (response.data && 
                response.data.candidates && 
                response.data.candidates[0] && 
                response.data.candidates[0].content && 
                response.data.candidates[0].content.parts && 
                response.data.candidates[0].content.parts[0]) {
                return response.data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Unexpected response format from Gemini API');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            throw error;
        }
    }
}

module.exports = GeminiAxiosService;