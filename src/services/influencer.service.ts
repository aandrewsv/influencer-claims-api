// src/services/influencer.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Influencer } from '../entities/influencer.entity';
import { Claim } from '../entities/claim.entity';
import { InfluencerVerification } from '../utils/influencer-verification';
import {
  LeaderboardStats,
  InfluencerListItem,
} from '../types/leaderboard.types';

@Injectable()
export class InfluencerService {
  private influencerVerification: InfluencerVerification;

  constructor(
    @InjectRepository(Influencer)
    private influencerRepo: Repository<Influencer>,
    @InjectRepository(Claim)
    private claimRepo: Repository<Claim>,
  ) {
    this.influencerVerification = new InfluencerVerification(
      process.env.PERPLEXITY_API_KEY,
    );
  }

  async verifyAndCreateInfluencer(handle: string): Promise<Influencer> {
    // Get all existing influencers for deduplication check
    const existingInfluencers = await this.influencerRepo.find({
      select: ['id', 'handle', 'aliases'],
    });

    try {
      // Verify and check for duplicates
      const verification =
        await this.influencerVerification.validateInfluencer(handle);

      if (!verification.isHealthInfluencer) {
        throw new NotFoundException(
          `${handle} is not a recognized health influencer`,
        );
      }

      // Find matching influencer if any
      const matchedInfluencer =
        await this.influencerVerification.findMatchingInfluencer(
          verification,
          existingInfluencers,
        );

      if (matchedInfluencer && verification.details) {
        // Update existing influencer with fresh verification data
        await this.influencerRepo.update(matchedInfluencer.id, {
          mainName: verification.details.mainName,
          description: verification.details.description,
          aliases: verification.details.aliases,
          contentTags: verification.details.contentTags,
          yearlyRevenueUsd: verification.details.yearlyRevenueUsd,
          totalFollowers: verification.details.totalFollowers,
          lastVerified: new Date(),
        });

        return await this.influencerRepo.findOneBy({
          id: matchedInfluencer.id,
        });
      }

      // Create new influencer if no match found
      if (verification.details) {
        const influencer = this.influencerRepo.create({
          handle: verification.details.mainName
            .toLowerCase()
            .replace(/\s+/g, ''),
          mainName: verification.details.mainName,
          description: verification.details.description,
          aliases: verification.details.aliases,
          contentTags: verification.details.contentTags,
          yearlyRevenueUsd: verification.details.yearlyRevenueUsd,
          totalFollowers: verification.details.totalFollowers,
          lastVerified: new Date(),
        });

        return await this.influencerRepo.save(influencer);
      }

      throw new Error('Verification succeeded but no details were provided');
    } catch (error) {
      if (
        error.message.includes(
          'Response was cut off due to max_tokens limit',
        ) ||
        error.name === 'MaxTokensError'
      ) {
        const maxTokensError = new Error(
          'Response was cut off due to max_tokens limit. Consider increasing max_tokens for the verification.',
        );
        maxTokensError.name = 'MaxTokensError';
        throw maxTokensError;
      }
      console.error('Influencer verification failed:', error);
      // Extract name from handle by converting to title case
      const name = handle
        .split(/[-_]/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(' ');
      throw new NotFoundException(
        `${name} is not a recognized health influencer`,
      );
    }
  }

  async getLeaderboardStats(): Promise<LeaderboardStats> {
    const totalInfluencers = await this.influencerRepo.count();
    const totalClaims = await this.claimRepo.count();

    const result = await this.claimRepo
      .createQueryBuilder('claim')
      .select('AVG(claim.score)', 'averageScore')
      .getRawOne();

    return {
      totalInfluencers,
      totalClaims,
      averageTrustScore: Number((Number(result.averageScore) || 0).toFixed(1)),
    };
  }

  async getInfluencersList(): Promise<InfluencerListItem[]> {
    const influencers = await this.influencerRepo.find({
      relations: ['researchTasks'],
    });

    const influencerClaims = await Promise.all(
      influencers.map(async (influencer) => {
        const claims = await this.claimRepo.find({
          where: { influencer: { id: influencer.id } },
          order: { firstDetectedAt: 'DESC' },
        });

        const trustScore = Number(
          (claims.length > 0
            ? claims.reduce((sum, claim) => sum + claim.score, 0) /
              claims.length
            : 0
          ).toFixed(1),
        );

        // Calculate trend based on comparing recent claims' scores with older ones
        let trend: 'up' | 'down' = 'up';
        if (claims.length >= 2) {
          const midPoint = Math.floor(claims.length / 2);
          const recentScores = claims.slice(0, midPoint);
          const olderScores = claims.slice(midPoint);

          const recentAvg =
            recentScores.reduce((sum, claim) => sum + claim.score, 0) /
            recentScores.length;
          const olderAvg =
            olderScores.reduce((sum, claim) => sum + claim.score, 0) /
            olderScores.length;

          trend = recentAvg >= olderAvg ? 'up' : 'down';
        }

        return {
          id: influencer.id,
          mainName: influencer.mainName,
          description: influencer.description,
          contentTags: influencer.contentTags.slice(0, 3),
          trustScore,
          trend,
          totalFollowers: influencer.totalFollowers,
          verifiedClaims: claims.length,
        };
      }),
    );

    return influencerClaims;
  }

  async findAll(): Promise<Influencer[]> {
    return this.influencerRepo.find();
  }

  async findOne(id: number): Promise<Influencer> {
    const influencer = await this.influencerRepo.findOne({
      where: { id },
      relations: ['researchTasks'],
    });

    if (!influencer) {
      throw new NotFoundException(`Influencer with ID ${id} not found`);
    }

    return influencer;
  }
}
