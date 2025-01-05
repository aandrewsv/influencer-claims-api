// src/types/influencer.types.ts
export interface InfluencerMatch {
  isMatch: boolean;
  matchedHandle?: string;
  confidence: number;
  reason: string;
}

export interface InfluencerVerification {
  isHealthInfluencer: boolean;
  name?: string;
  primaryHandle?: string;
  alternateHandles?: string[];
  confidence: number;
  details: string;
}
