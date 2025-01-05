// src/utils/health-claims-analyzer.ts
import { levenshtein } from 'string-distance';
import { HealthClaim, AnalysisResult } from '../types/research.types';
import { PerplexityClient } from './perplexity-client';

export class HealthClaimsAnalyzer {
  private perplexity: PerplexityClient;
  private similarityThreshold: number;

  constructor(apiKey: string) {
    this.perplexity = new PerplexityClient(apiKey);
    this.similarityThreshold = 0.75; // Adjusted for Levenshtein distance
  }

  private async getRecentHealthClaims(
    username: string,
    timeRange: string,
    claimsCount: number,
    journals: string[],
  ): Promise<HealthClaim[]> {
    try {
      const prompt = `Analyze the health-related content from "${username}" within the ${timeRange} and extract exactly ${claimsCount} most significant health claims without duplicates.

Follow these rules:
1. Focus on specific, verifiable health claims
2. Cross-reference exclusively with the following journals: ${journals.join(', ')}
3. Format each claim in JSON with these fields:
   - claim: the health claim text
   - category: one of [Nutrition, Medicine, Mental Health, Fitness, Alternative Medicine, General Wellness]
   - source: where the claim was found
   - date: approximate date of the claim within ${timeRange}
   - verificationStatus: Verified/Questionable/Debunked based on the provided journals references and consensus
   - journalsVerified: list of the provided cross-referenced journals that verify the claim (if any)
   - journalsQuestioned: list of the provided cross-referenced journals that question the claim (if any)
   - journalsDebunked: list of the provided cross-referenced journals that debunk the claim (if any)
   - score: Calculate a credibility score (0-1) based on the claim's verification status and general journal consensus

Respond with ONLY a JSON array of ${claimsCount} claims.
Example format:
[
  {
    "claim": "Vitamin D supplementation boosts immune system",
    "category": "Nutrition",
    "source": "Twitter post",
    "date": "2024-01-02",
    "verificationStatus": "Verified",
    "journalsVerified": ["PubMed Central", "Nature"],
    "journalsQuestioned": ["ScienceDirect"],
    "journalsDebunked": [],
    "score": 0.75
  }
]`;

      const response = await this.perplexity.query(prompt);
      try {
        // Remove markdown code block delimiters
        const cleanResponse = response.replace(/```json|```/g, '').trim();

        // Verifies that the response is complete and not truncated
        if (cleanResponse.endsWith('...') || !cleanResponse.endsWith(']')) {
          throw new Error('Response is incomplete or was truncated');
        }

        // Attempt to parse as many valid claims as possible
        const claims = [];
        const regex = /{[^}]*}/g;
        let match;
        while ((match = regex.exec(cleanResponse)) !== null) {
          try {
            const claim = JSON.parse(match[0]);

            // Validates that the claim has all the required fields
            const requiredFields = [
              'claim',
              'category',
              'source',
              'date',
              'verificationStatus',
              'journalsVerified',
              'journalsQuestioned',
              'journalsDebunked',
              'score',
            ];

            const missingFields = requiredFields.filter(
              (field) => !(field in claim),
            );
            if (missingFields.length > 0) {
              console.warn(
                `Incomplete claim, missing fields: ${missingFields.join(', ')}`,
              );
              continue;
            }

            claims.push({
              text: claim.claim,
              category: claim.category,
              source: `${claim.source} (${claim.date})`,
              verificationStatus: claim.verificationStatus,
              journalsVerified: claim.journalsVerified,
              journalsQuestioned: claim.journalsQuestioned,
              journalsDebunked: claim.journalsDebunked,
              score: claim.score,
            });
          } catch (error) {
            console.warn('Error processing individual claim:', match[0]);
            console.log(error);
          }
        }

        if (claims.length === 0) {
          throw new Error('No valid claims found in the response');
        }

        return claims;
      } catch (error) {
        console.error('Failed to parse claims JSON:', error);
        throw new Error('Invalid claims format received from AI');
      }
    } catch (error) {
      console.error('Error fetching health claims:', error);
      if (
        error.name === 'MaxTokensError' ||
        error.message.includes('max_tokens limit')
      ) {
        const maxTokensError = new Error(
          'Response was cut off due to max_tokens limit. Consider increasing max_tokens for the analysis.',
        );
        maxTokensError.name = 'MaxTokensError';
        throw maxTokensError;
      }
      throw new Error('Failed to fetch health claims');
    }
  }

  private async removeDuplicateClaims(
    claims: HealthClaim[],
  ): Promise<HealthClaim[]> {
    const uniqueClaims: HealthClaim[] = [];

    for (const claim of claims) {
      let isDuplicate = false;

      for (const uniqueClaim of uniqueClaims) {
        // Calculate Levenshtein distance and normalize it
        const distance = levenshtein(
          claim.text.toLowerCase(),
          uniqueClaim.text.toLowerCase(),
        );
        const maxLength = Math.max(claim.text.length, uniqueClaim.text.length);
        const similarity = 1 - distance / maxLength;

        if (similarity >= this.similarityThreshold) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueClaims.push(claim);
      }
    }

    return uniqueClaims;
  }

  async analyzeHealthClaims(
    username: string,
    options: {
      timeRange: string;
      claimsCount: number;
      journals: string[];
    },
  ): Promise<AnalysisResult> {
    try {
      console.log(`Starting analysis for ${username} with options:`, options);

      // Step 2: Get claims directly with categorization and verification
      const claims = await this.getRecentHealthClaims(
        username,
        options.timeRange,
        options.claimsCount,
        options.journals,
      );
      console.log(`Retrieved ${claims.length} claims`);

      // Step 3: Remove duplicates
      const uniqueClaims = await this.removeDuplicateClaims(claims);
      console.log(`Reduced to ${uniqueClaims.length} unique claims`);

      const result: AnalysisResult = {
        influencer: username,
        requestedClaimsCount: options.claimsCount,
        totalClaimsFound: claims.length,
        uniqueClaimsCount: uniqueClaims.length,
        claims: uniqueClaims,
      };

      // Add message if fewer claims were found than requested
      if (uniqueClaims.length < options.claimsCount) {
        result.message = `Perplexity API could not find ${options.claimsCount} claims in the given timeframe, however we found ${uniqueClaims.length} claims and successfully created the research`;
      }

      return result;
    } catch (error) {
      console.error('Analysis failed:', error);
      if (error.name === 'MaxTokensError') {
        throw error;
      }
      throw new Error('Failed to analyze health claims');
    }
  }
}
