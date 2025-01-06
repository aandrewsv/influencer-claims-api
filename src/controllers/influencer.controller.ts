// src/controllers/influencer.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InfluencerService } from '../services/influencer.service';
import { Influencer } from '../entities/influencer.entity';
import {
  LeaderboardStats,
  InfluencerListItem,
} from '../types/leaderboard.types';

class VerifyInfluencerDto {
  handle: string;
}

@Controller('influencers')
export class InfluencerController {
  constructor(private readonly influencerService: InfluencerService) {}

  @Post('verify')
  async verifyAndCreate(@Body() dto: VerifyInfluencerDto): Promise<Influencer> {
    try {
      return await this.influencerService.verifyAndCreateInfluencer(dto.handle);
    } catch (error) {
      console.error('Error verifying influencer:', error.message);
      if (
        error.message.includes(
          'Response was cut off due to max_tokens limit',
        ) ||
        error.name === 'MaxTokensError'
      ) {
        throw new HttpException(
          {
            message: 'Response was cut off due to max_tokens limit.',
            details:
              'To resolve this issue, you can either:\n' +
              '1. Increase the max_tokens parameter in your request (recommended range: 4096-8192)\n' +
              '2. Reduce the scope of content being analyzed for the influencer\n' +
              'The amount of tokens needed depends on the complexity and volume of content being verified.',
            error: 'MaxTokensError',
            statusCode: HttpStatus.BAD_REQUEST,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to verify influencer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getLeaderboardStats(): Promise<LeaderboardStats> {
    return this.influencerService.getLeaderboardStats();
  }

  @Get('list')
  async getInfluencersList(): Promise<InfluencerListItem[]> {
    return this.influencerService.getInfluencersList();
  }

  @Get()
  async findAll(): Promise<Influencer[]> {
    return this.influencerService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<Influencer> {
    return this.influencerService.findOne(id);
  }
}
