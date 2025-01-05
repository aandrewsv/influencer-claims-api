// src/utils/perplexity-client.ts
import fetch from 'node-fetch';

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
}

interface PerplexityConfig {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export class PerplexityClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.perplexity.ai/chat/completions';
  }

  async query(prompt: string, config: PerplexityConfig = {}): Promise<string> {
    const {
      systemPrompt = 'You are a helpful AI assistant that analyzes health-related content.',
      maxTokens = 1024,
      temperature = 0.7,
    } = config;

    try {
      console.log('Making API request with prompt:', prompt);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false,
        }),
      });

      const responseText = await response.text();
      console.log('Raw API response:', responseText);

      if (!response.ok) {
        throw new Error(
          `API request failed with status ${response.status}: ${responseText}`,
        );
      }

      const data = JSON.parse(responseText) as PerplexityResponse;

      if (!data.choices?.[0]?.message?.content) {
        console.error('Unexpected API response structure:', data);
        throw new Error('Invalid API response format');
      }

      const content = data.choices[0].message.content;

      if (data.choices[0].finish_reason === 'length') {
        const error = new Error(
          'Response was cut off due to max_tokens limit. Consider increasing max_tokens.',
        );
        error.name = 'MaxTokensError';
        throw error;
      }

      return content;
    } catch (error) {
      console.error('Perplexity API error:', error);
      if (error.response) {
        console.error('Response headers:', error.response.headers);
        console.error('Response body:', await error.response.text());
      }
      throw error;
    }
  }

  async queryJSON<T>(prompt: string, config?: PerplexityConfig): Promise<T> {
    const response = await this.query(prompt, config);
    try {
      // Remove markdown code block delimiters
      const cleanResponse = response.replace(/```json|```/g, '').trim();

      // Attempt to extract the JSON object from the response content
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No valid JSON objects found in the response');
      }

      const jsonString = cleanResponse.substring(jsonStart, jsonEnd);
      const result = JSON.parse(jsonString) as T;

      return result;
    } catch (error) {
      if (
        error.name === 'MaxTokensError' ||
        error.message.includes('Response was cut off due to max_tokens limit')
      ) {
        const maxTokensError = new Error(
          'Response was cut off due to max_tokens limit. Consider increasing max_tokens.',
        );
        maxTokensError.name = 'MaxTokensError';
        throw maxTokensError;
      }
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }
}
