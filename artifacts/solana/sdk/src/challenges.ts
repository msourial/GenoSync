import { Keypair } from '@solana/web3.js';

export enum ChallengeMetric {
  HRV = 0,
  Steps = 1,
  MeditationMinutes = 2,
  Strain = 3,
  APM = 4,
}

export enum ChallengeStatus {
  Pending = 0,
  Active = 1,
  AwaitingScores = 2,
  Settled = 3,
  Cancelled = 4,
}

export interface Challenge {
  pda: string;
  creator: string;
  opponent: string;
  metric: ChallengeMetric;
  target: number;
  wager: number;
  expiry: number;
  creatorScore: number;
  opponentScore: number;
  status: ChallengeStatus;
}

export interface MockStore {
  get(key: string): Promise<Challenge | null>;
  set(key: string, value: Challenge): Promise<void>;
  list(): Promise<Challenge[]>;
}

class InMemoryMockStore implements MockStore {
  private readonly map = new Map<string, Challenge>();

  async get(key: string): Promise<Challenge | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, value: Challenge): Promise<void> {
    this.map.set(key, value);
  }

  async list(): Promise<Challenge[]> {
    return Array.from(this.map.values());
  }
}

export interface ChallengesClientOptions {
  mock?: boolean;
  connection?: any;
  wallet?: any;
  programId?: string;
  store?: MockStore;
  idl?: any;
}

type LeaderboardEntry = { pubkey: string; wins: number; losses: number; net: number };

export class ChallengesClient {
  private readonly mock: boolean;
  private readonly connection: any;
  private readonly wallet: any;
  private readonly programId?: string;
  private readonly idl: any;
  private readonly store: MockStore;

  constructor(opts: ChallengesClientOptions) {
    this.mock = opts.mock ?? true;
    this.connection = opts.connection;
    this.wallet = opts.wallet;
    this.programId = opts.programId;
    this.idl = opts.idl;
    this.store = opts.store ?? new InMemoryMockStore();
  }

  async listForWallet(pubkey: string): Promise<Challenge[]> {
    const all = await this.listAll();
    return all.filter((c) => c.creator === pubkey || c.opponent === pubkey);
  }

  async listAll(): Promise<Challenge[]> {
    this.requireMockMode();
    const all = await this.store.list();
    return [...all].sort((a, b) => b.expiry - a.expiry);
  }

  async create(params: {
    opponent: string;
    metric: ChallengeMetric;
    target: number;
    wager: number;
    expiryDays: number;
  }): Promise<Challenge> {
    this.requireMockMode();

    const creator = this.resolveWalletPubkey();
    if (!creator) {
      throw new Error('Missing wallet public key for challenge creator');
    }

    const now = this.nowSec();
    const expiry = now + Math.max(1, Math.floor(params.expiryDays)) * 86_400;

    let pda = this.randomPda();
    while (await this.store.get(pda)) {
      pda = this.randomPda();
    }

    const challenge: Challenge = {
      pda,
      creator,
      opponent: params.opponent,
      metric: params.metric,
      target: params.target,
      wager: params.wager,
      expiry,
      creatorScore: 0,
      opponentScore: 0,
      status: ChallengeStatus.Pending,
    };

    await this.store.set(challenge.pda, challenge);
    return challenge;
  }

  async accept(pda: string, signerPubkey: string): Promise<Challenge> {
    this.requireMockMode();
    const challenge = await this.requireChallenge(pda);

    if (challenge.status !== ChallengeStatus.Pending) {
      throw new Error('InvalidStatus');
    }
    if (challenge.opponent !== signerPubkey) {
      throw new Error('Unauthorized');
    }

    const next: Challenge = { ...challenge, status: ChallengeStatus.Active };
    await this.store.set(pda, next);
    return next;
  }

  async submitScore(pda: string, signerPubkey: string, score: number): Promise<Challenge> {
    this.requireMockMode();
    const challenge = await this.requireChallenge(pda);

    if (challenge.status !== ChallengeStatus.Active) {
      throw new Error('InvalidStatus');
    }

    let next: Challenge = { ...challenge };

    if (signerPubkey === challenge.creator) {
      if (challenge.creatorScore > 0) {
        throw new Error('AlreadySubmitted');
      }
      next.creatorScore = score;
    } else if (signerPubkey === challenge.opponent) {
      if (challenge.opponentScore > 0) {
        throw new Error('AlreadySubmitted');
      }
      next.opponentScore = score;
    } else {
      throw new Error('Unauthorized');
    }

    if (next.creatorScore > 0 && next.opponentScore > 0) {
      next = { ...next, status: ChallengeStatus.AwaitingScores };
    }

    await this.store.set(pda, next);
    return next;
  }

  async settle(pda: string): Promise<Challenge> {
    this.requireMockMode();
    const challenge = await this.requireChallenge(pda);

    if (challenge.status === ChallengeStatus.Settled) {
      throw new Error('AlreadySettled');
    }
    if (challenge.status === ChallengeStatus.Cancelled) {
      throw new Error('InvalidStatus');
    }

    const bothSubmitted = challenge.creatorScore > 0 && challenge.opponentScore > 0;
    const expired = this.nowSec() >= challenge.expiry;

    if (!bothSubmitted && !expired && challenge.status !== ChallengeStatus.AwaitingScores) {
      throw new Error('NotExpired');
    }

    if (
      challenge.status !== ChallengeStatus.Active &&
      challenge.status !== ChallengeStatus.AwaitingScores
    ) {
      throw new Error('InvalidStatus');
    }

    const next: Challenge = { ...challenge, status: ChallengeStatus.Settled };
    await this.store.set(pda, next);
    return next;
  }

  async cancel(pda: string, signerPubkey: string): Promise<Challenge> {
    this.requireMockMode();
    const challenge = await this.requireChallenge(pda);

    if (challenge.creator !== signerPubkey) {
      throw new Error('Unauthorized');
    }
    if (challenge.status !== ChallengeStatus.Pending) {
      throw new Error('InvalidStatus');
    }

    const next: Challenge = { ...challenge, status: ChallengeStatus.Cancelled };
    await this.store.set(pda, next);
    return next;
  }

  async leaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    this.requireMockMode();
    const all = await this.store.list();
    const table = new Map<string, LeaderboardEntry>();

    const getRow = (pubkey: string): LeaderboardEntry => {
      const existing = table.get(pubkey);
      if (existing) return existing;
      const row: LeaderboardEntry = { pubkey, wins: 0, losses: 0, net: 0 };
      table.set(pubkey, row);
      return row;
    };

    for (const ch of all) {
      if (ch.status !== ChallengeStatus.Settled) continue;

      const winner = this.computeWinner(ch);
      if (winner === 'creator') {
        getRow(ch.creator).wins += 1;
        getRow(ch.opponent).losses += 1;
      } else if (winner === 'opponent') {
        getRow(ch.opponent).wins += 1;
        getRow(ch.creator).losses += 1;
      }
    }

    const rows = Array.from(table.values()).map((row) => ({
      ...row,
      net: row.wins - row.losses,
    }));

    rows.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.pubkey.localeCompare(b.pubkey);
    });

    return rows.slice(0, Math.max(1, limit));
  }

  private requireMockMode(): void {
    if (this.mock) return;
    if (!this.programId || !this.connection || !this.wallet || !this.idl) {
      throw new Error('On-chain mode requires deployed program');
    }
    throw new Error('On-chain mode requires deployed program');
  }

  private async requireChallenge(pda: string): Promise<Challenge> {
    const challenge = await this.store.get(pda);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    return challenge;
  }

  private resolveWalletPubkey(): string | null {
    if (!this.wallet) return null;

    const direct = this.asPubkeyString(this.wallet);
    if (direct) return direct;

    const maybePublicKey = this.asPubkeyString(this.wallet.publicKey);
    if (maybePublicKey) return maybePublicKey;

    const maybeWalletPublicKey = this.asPubkeyString(this.wallet.walletPublicKey);
    if (maybeWalletPublicKey) return maybeWalletPublicKey;

    const maybeAddress =
      typeof this.wallet.walletAddress === 'string' ? this.wallet.walletAddress : null;
    return maybeAddress;
  }

  private asPubkeyString(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.toBase58 === 'function') {
      try {
        return value.toBase58();
      } catch {
        return null;
      }
    }
    return null;
  }

  private randomPda(): string {
    return Keypair.generate().publicKey.toBase58();
  }

  private nowSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  private computeWinner(challenge: Challenge): 'creator' | 'opponent' | 'tie' {
    if (challenge.metric === ChallengeMetric.Strain) {
      if (challenge.creatorScore < challenge.opponentScore) return 'creator';
      if (challenge.opponentScore < challenge.creatorScore) return 'opponent';
      return 'tie';
    }

    if (challenge.creatorScore > challenge.opponentScore) return 'creator';
    if (challenge.opponentScore > challenge.creatorScore) return 'opponent';
    return 'tie';
  }
}
