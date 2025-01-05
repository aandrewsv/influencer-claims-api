// src/entities/influencer.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ResearchTask } from './research-task.entity';

@Entity()
export class Influencer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  handle: string;

  @Column()
  mainName: string;

  @Column({ length: 400 })
  description: string;

  @Column('simple-array')
  aliases: string[];

  @Column('simple-array')
  contentTags: string[]; // Limited to 10 tags

  @Column('bigint') // Using bigint for large numbers
  yearlyRevenueUsd: number;

  @Column('integer')
  totalFollowers: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastVerified: Date;

  @OneToMany(() => ResearchTask, (task) => task.influencer)
  researchTasks: ResearchTask[];
}
