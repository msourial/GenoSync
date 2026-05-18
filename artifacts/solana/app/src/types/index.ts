export type ProposalStatus = 'active' | 'passed' | 'rejected' | 'pending';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  endTime: number;
}

export interface SessionRecord {
  id: string;
  date: string;
  duration: number;
  grade: Grade;
  hrv: number;
  strain: number;
  auraEarned: number;
  challenges: string[];
}

export interface NFTItem {
  mint: string;
  name: string;
  image?: string;
  grade?: Grade;
}
