// src/utils/influencer-verification.ts
import { PerplexityClient } from './perplexity-client';

interface InfluencerValidation {
  isHealthInfluencer: boolean;
  details?: {
    handle: string;
    mainName: string;
    description: string;
    aliases: string[];
    contentTags: string[];
    yearlyRevenueUsd: number;
    totalFollowers: number;
  };
  reason?: string;
}

export class InfluencerVerification {
  private perplexity: PerplexityClient;

  constructor(apiKey: string) {
    this.perplexity = new PerplexityClient(apiKey);
  }

  async validateInfluencer(inputHandle: string): Promise<InfluencerValidation> {
    try {
      const prompt = `Task: Analyze if "${inputHandle}" is a legitimate health influencer and provide detailed information in the specified JSON format.
  
  Follow these rules:
  1. Determine if "${inputHandle}" is a verified health influencer and respond with a boolean value for 'isHealthInfluencer'.
  2. If 'isHealthInfluencer' is false, provide a concise reason (max 400 characters) explaining why they are not considered a health influencer and respond only with:
     {
       "isHealthInfluencer": false,
       "reason": "Explain why they are not considered a health influencer"
     }
  3. If 'isHealthInfluencer' is true, provide detailed information in the 'details' object, including:
     - handle: primary social media handle
     - mainName: full recognized name
     - description: concise description (max 400 characters) highlighting credentials and focus
     - aliases: list of known aliases/handles
     - contentTags: exactly 10 specific tags describing content focus
     - yearlyRevenueUsd: estimated yearly revenue in USD (as an integer number)
     - totalFollowers: total followers across all platforms (as an integer number)
  
  Ensure responses adhere strictly to the specified JSON format
  
  Example responses:
  
  Not a health influencer:

  {
    "isHealthInfluencer": false,
    "reason": "This account appears to be a gaming content creator with no focus on health-related topics"
  }
  
  Valid health influencer:
  
  {
    "isHealthInfluencer": true,
    "details": {
      "handle": "hubermanlab",
      "mainName": "Andrew Huberman",
      "description": "Stanford Professor of Neurobiology and Ophthalmology, focusing on neural development, brain plasticity, and neural regeneration. Host of the Huberman Lab Podcast, translating neuroscience into practical tools for everyday life. Known for evidence-based approaches to performance, sleep, stress management, and brain optimization.",
      "aliases": ["hubermanlab", "andrewhuberman", "hubermanandrew"],
      "contentTags": ["neuroscience", "sleep", "hormones", "performance", "stress-management", "exercise", "mental-health", "nutrition", "circadian-rhythm", "productivity"],
      "yearlyRevenueUsd": 5000000,
      "totalFollowers": 4200000
    },
  }`;

      return await this.perplexity.queryJSON<InfluencerValidation>(prompt, {
        systemPrompt:
          'You are an AI assistant specialized in verifying health influencer identities and analyzing their market presence.',
        temperature: 0.3,
      });
    } catch (error) {
      console.error('Influencer validation failed:', error);
      throw new Error('Failed to validate influencer');
    }
  }

  async findMatchingInfluencer(
    validation: InfluencerValidation,
    existingInfluencers: Array<{
      id: number;
      handle: string;
      aliases?: string[];
    }>,
  ): Promise<{ id: number; handle: string } | null> {
    if (!validation.isHealthInfluencer || !validation.details) {
      return null;
    }

    const allHandlesToCheck = [
      validation.details.handle,
      ...validation.details.aliases,
    ];

    for (const existing of existingInfluencers) {
      const existingHandles = [existing.handle, ...(existing.aliases || [])];

      const hasMatch = allHandlesToCheck.some((handle) =>
        existingHandles.some(
          (existing) => existing.toLowerCase() === handle.toLowerCase(),
        ),
      );

      if (hasMatch) {
        return {
          id: existing.id,
          handle: existing.handle,
        };
      }
    }

    return null;
  }
}
