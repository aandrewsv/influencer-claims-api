// src/controllers/research.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ResearchService } from '../services/research.service';
import { ResearchTask } from '../entities/research-task.entity';
import { CreateResearchDto } from '../dto/create-research.dto';

@Controller('research')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post('tasks')
  async createTask(@Body() taskData: CreateResearchDto): Promise<ResearchTask> {
    try {
      return await this.researchService.createTask(taskData);
    } catch (error) {
      console.error('Error creating research task:', error.message);
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
              '1. Increase the max_tokens parameter in your request (range: 100-5000, recommended: 4000)\n' +
              '2. Reduce the claimsCount parameter in your request (ex: try 25 claims instead of 50)\n' +
              'The amount of tokens needed depends on the complexity and number of claims being analyzed. ' +
              'Your current request requires more tokens than the current limit.',
            error: 'MaxTokensError',
            statusCode: HttpStatus.BAD_REQUEST,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create research task. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('tasks')
  async getTasks(): Promise<ResearchTask[]> {
    return this.researchService.findAll();
  }

  @Get('tasks/:id')
  async getTask(@Param('id') id: number): Promise<ResearchTask> {
    return this.researchService.findTask(id);
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: number): Promise<void> {
    return this.researchService.deleteTask(id);
  }
}
