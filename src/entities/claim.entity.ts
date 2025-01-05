// src/entities/claim.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Influencer } from './influencer.entity';
import { ResearchTask } from './research-task.entity';

@Entity()
export class Claim {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string;

  @Column()
  category: string;

  @Column()
  source: string;

  @Column()
  verificationStatus: string;

  @Column('simple-array')
  journalsVerified: string[];

  @Column('simple-array')
  journalsQuestioned: string[];

  @Column('simple-array')
  journalsDebunked: string[];

  @Column('float')
  score: number;

  @CreateDateColumn()
  firstDetectedAt: Date;

  @ManyToOne(() => Influencer)
  influencer: Influencer;

  @ManyToOne(() => ResearchTask)
  firstDetectedIn: ResearchTask;
}
