// src/services/research.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { levenshtein } from 'string-distance';
import { ResearchTask } from '../entities/research-task.entity';
import { HealthClaimsAnalyzer } from '../utils/health-claims-analyzer';
import { Claim } from 'src/entities/claim.entity';
import { CreateResearchDto } from 'src/dto/create-research.dto';
import { Influencer } from 'src/entities/influencer.entity';

@Injectable()
export class ResearchService {
  private healthClaimsAnalyzer: HealthClaimsAnalyzer;

  constructor(
    @InjectRepository(ResearchTask)
    private researchTaskRepo: Repository<ResearchTask>,
    @InjectRepository(Claim)
    private claimRepo: Repository<Claim>,
    @InjectRepository(Influencer)
    private influencerRepo: Repository<Influencer>,
  ) {
    this.healthClaimsAnalyzer = new HealthClaimsAnalyzer(
      process.env.PERPLEXITY_API_KEY,
    );
  }

  async checkExistingClaim(
    text: string,
    influencerId: number,
  ): Promise<Claim | null> {
    const existingClaims = await this.claimRepo.find({
      where: { influencer: { id: influencerId } },
    });

    // Use the same similarity check from HealthClaimsAnalyzer
    for (const existing of existingClaims) {
      const similarity =
        1 -
        levenshtein(text.toLowerCase(), existing.text.toLowerCase()) /
          Math.max(text.length, existing.text.length);
      if (similarity >= 0.85) {
        return existing;
      }
    }
    return null;
  }

  async createTask(
    taskData: Partial<CreateResearchDto>,
  ): Promise<ResearchTask> {
    // First get the influencer to get their handle
    const influencer = await this.influencerRepo.findOne({
      where: { id: taskData.influencerId },
    });

    if (!influencer) {
      throw new NotFoundException(
        `Influencer with ID ${taskData.influencerId} not found`,
      );
    }

    let analysis;
    try {
      // Try to analyze claims using the influencer's handle
      analysis = await this.healthClaimsAnalyzer.analyzeHealthClaims(
        influencer.handle,
        {
          timeRange: taskData.timeRange,
          claimsCount: taskData.claimsCount,
          journals: taskData.selectedJournals,
          max_tokens: taskData.max_tokens,
        },
      );

      if (!analysis || !analysis.claims) {
        throw new Error('Analysis failed to return any results');
      }
    } catch (error) {
      if (
        error.name === 'MaxTokensError' ||
        error.message.includes('max_tokens limit')
      ) {
        const maxTokensError = new Error(
          'Response was cut off due to max_tokens limit. Consider increasing max_tokens or reducing the number of claims.',
        );
        maxTokensError.name = 'MaxTokensError';
        throw maxTokensError;
      }

      // In case of any other error, task will not be created
      throw new Error(
        `Error analyzing health claims: ${error.message}. Research task will not be created.`,
      );
    }

    // Create task only if claims were successfully analyzed
    const task = this.researchTaskRepo.create({
      influencer,
      timeRange: taskData.timeRange,
      claimsCount: taskData.claimsCount,
      selectedJournals: taskData.selectedJournals,
      notes: taskData.notes,
    });

    await task.validate();
    const savedTask = await this.researchTaskRepo.save(task);

    try {
      // Save new claims and link existing ones
      const claims = await Promise.all(
        analysis.claims.map(async (analyzedClaim) => {
          const existingClaim = await this.claimRepo.findOne({
            where: {
              text: analyzedClaim.text,
              influencer: { id: influencer.id },
            },
          });

          if (existingClaim) {
            return existingClaim;
          }

          const newClaim = this.claimRepo.create({
            text: analyzedClaim.text,
            category: analyzedClaim.category,
            source: analyzedClaim.source,
            verificationStatus: analyzedClaim.verificationStatus,
            journalsVerified: analyzedClaim.journalsVerified,
            journalsQuestioned: analyzedClaim.journalsQuestioned,
            journalsDebunked: analyzedClaim.journalsDebunked,
            score: analyzedClaim.score,
            influencer,
            firstDetectedIn: savedTask,
          });

          return this.claimRepo.save(newClaim);
        }),
      );

      savedTask.claims = claims;
      savedTask.analysisResults = JSON.stringify(analysis);
      return this.researchTaskRepo.save(savedTask);
    } catch (error) {
      // If there is any error while saving claims, delete the created task
      await this.researchTaskRepo.delete(savedTask.id);
      throw new Error(
        `Error saving claims: ${error.message}. The task has been deleted.`,
      );
    }
  }

  async findAll(): Promise<ResearchTask[]> {
    return this.researchTaskRepo.find();
  }

  async findTask(id: number): Promise<ResearchTask> {
    return this.researchTaskRepo.findOneBy({ id });
  }

  async deleteTask(id: number): Promise<void> {
    await this.researchTaskRepo.delete(id);
  }
}
