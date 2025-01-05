// src/services/influencer.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Influencer } from '../entities/influencer.entity';
import { InfluencerVerification } from '../utils/influencer-verification';

@Injectable()
export class InfluencerService {
  private influencerVerification: InfluencerVerification;

  constructor(
    @InjectRepository(Influencer)
    private influencerRepo: Repository<Influencer>,
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
      throw new Error('Failed to verify influencer');
    }
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
