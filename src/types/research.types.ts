// src/types/research.types.ts
export interface HealthClaim {
  text: string;
  category: string;
  source: string;
  verificationStatus: string;
  journalsVerified: string[];
  journalsQuestioned: string[];
  journalsDebunked: string[];
  score: number;
}

export interface AnalysisResult {
  influencer: string;
  requestedClaimsCount: number;
  totalClaimsFound: number;
  uniqueClaimsCount: number;
  claims: HealthClaim[];
  message?: string;
}
