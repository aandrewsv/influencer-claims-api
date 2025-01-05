// src/entities/research-task.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import {
  IsNotEmpty,
  IsArray,
  IsInt,
  Min,
  IsString,
  validate,
} from 'class-validator';
import { AnalysisResult } from 'src/types/research.types';
import { Influencer } from './influencer.entity';
import { Claim } from './claim.entity';

@Entity()
export class ResearchTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Influencer, (influencer) => influencer.researchTasks)
  influencer: Influencer;

  @Column()
  @IsNotEmpty()
  timeRange: string;

  @Column()
  @IsInt()
  @Min(1)
  claimsCount: number;

  @Column('simple-array')
  @IsArray()
  selectedJournals: string[];

  @Column({ nullable: true })
  @IsString()
  notes?: string;

  @Column({ type: 'text', nullable: true })
  analysisResults?: string;

  @ManyToMany(() => Claim)
  @JoinTable()
  claims: Claim[];

  @CreateDateColumn()
  createdAt: Date;

  getAnalysis(): AnalysisResult | null {
    if (!this.analysisResults) return null;
    return JSON.parse(this.analysisResults);
  }

  async validate() {
    const errors = await validate(this);
    if (errors.length > 0) {
      throw new Error(errors.toString());
    }
  }
}
