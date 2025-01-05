// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResearchTask } from './entities/research-task.entity';
import { ResearchService } from './services/research.service';
import { ResearchController } from './controllers/research.controller';
import { ConfigModule } from '@nestjs/config';
import { Influencer } from './entities/influencer.entity';
import { Claim } from './entities/claim.entity';
import { InfluencerService } from './services/influencer.service';
import { InfluencerController } from './controllers/influencer.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      entities: [Influencer, ResearchTask, Claim],
      synchronize: true, // Be careful with this in production
    }),
    TypeOrmModule.forFeature([Influencer, ResearchTask, Claim]),
  ],
  controllers: [ResearchController, InfluencerController],
  providers: [ResearchService, InfluencerService],
})
export class AppModule {}
