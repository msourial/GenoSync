import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  ChallengesClient,
  Challenge,
  ChallengeMetric,
  ChallengeStatus,
} from '../sdk/challenges';

const STORAGE_KEY = '@genosync/challenges';

type JsonMap = Record<string, unknown>;

type MockStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  list: (prefix?: string) => Promise<{ key: string; value: unknown }[]>;
};

export type LeaderboardEntry = {
  pubkey: string;
  wins: number;
  losses: number;
  net: number;
};

type ChallengesStoreState = {
  challenges: Challenge[];
  isLoading: boolean;
  leaderboardEntries: LeaderboardEntry[];
  refresh: () => Promise<void>;
  create: (...args: any[]) => Promise<void>;
  accept: (...args: any[]) => Promise<void>;
  submitScore: (...args: any[]) => Promise<void>;
  settle: (...args: any[]) => Promise<void>;
  cancel: (...args: any[]) => Promise<void>;
};

const readMap = async (): Promise<JsonMap> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as JsonMap) : {};
  } catch {
    return {};
  }
};

const writeMap = async (map: JsonMap): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // no-op
  }
};

const mockStore: MockStore = {
  get: async (key: string) => {
    const map = await readMap();
    return map[key] ?? null;
  },
  set: async (key: string, value: unknown) => {
    const map = await readMap();
    map[key] = value;
    await writeMap(map);
  },
  list: async (prefix?: string) => {
    const map = await readMap();
    return Object.entries(map)
      .filter(([key]) => (prefix ? key.startsWith(prefix) : true))
      .map(([key, value]) => ({ key, value }));
  },
};

type AnyClient = {
  [key: string]: any;
};

const makeClient = (): AnyClient => {
  try {
    return new (ChallengesClient as any)({ mock: true, store: mockStore });
  } catch {
    try {
      return new (ChallengesClient as any)({ mock: true });
    } catch {
      try {
        return new (ChallengesClient as any)(true);
      } catch {
        return {};
      }
    }
  }
};

const client: AnyClient = makeClient();

const callMethod = async (names: string[], ...args: any[]): Promise<any> => {
  for (const name of names) {
    const fn = client?.[name];
    if (typeof fn === 'function') {
      return fn.apply(client, args);
    }
  }
  return undefined;
};

const normalizeLeaderboard = (input: any): LeaderboardEntry[] => {
  const raw = Array.isArray(input)
    ? input
    : Array.isArray(input?.entries)
      ? input.entries
      : [];

  return raw.map((entry: any) => ({
    pubkey: String(entry?.pubkey ?? entry?.wallet ?? entry?.address ?? ''),
    wins: Number(entry?.wins ?? 0),
    losses: Number(entry?.losses ?? 0),
    net: Number(entry?.net ?? entry?.netAura ?? 0),
  }));
};

const normalizeChallenges = (input: any): Challenge[] => {
  if (Array.isArray(input)) return input as Challenge[];
  if (Array.isArray(input?.challenges)) return input.challenges as Challenge[];
  return [];
};

const runMutationAndRefresh =
  (mutator: (...args: any[]) => Promise<any>) =>
  async (...args: any[]): Promise<void> => {
    try {
      await mutator(...args);
    } catch {
      // no-op
    }
    try {
      await useChallengesStore.getState().refresh();
    } catch {
      // no-op
    }
  };

export const useChallengesStore = create<ChallengesStoreState>((set) => ({
  challenges: [],
  isLoading: false,
  leaderboardEntries: [],

  refresh: async () => {
    set({ isLoading: true });
    try {
      const [allRes, boardRes] = await Promise.all([
        callMethod(['listAll', 'listChallenges', 'all']),
        callMethod(['leaderboard', 'getLeaderboard']),
      ]);

      set({
        challenges: normalizeChallenges(allRes),
        leaderboardEntries: normalizeLeaderboard(boardRes),
      });
    } catch {
      set({
        challenges: [],
        leaderboardEntries: [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  create: runMutationAndRefresh(async (...args: any[]) => {
    await callMethod(['create', 'createChallenge'], ...args);
  }),

  accept: runMutationAndRefresh(async (...args: any[]) => {
    await callMethod(['accept', 'acceptChallenge'], ...args);
  }),

  submitScore: runMutationAndRefresh(async (...args: any[]) => {
    await callMethod(['submitScore', 'recordScore'], ...args);
  }),

  settle: runMutationAndRefresh(async (...args: any[]) => {
    await callMethod(['settle', 'settleChallenge'], ...args);
  }),

  cancel: runMutationAndRefresh(async (...args: any[]) => {
    await callMethod(['cancel', 'cancelChallenge'], ...args);
  }),
}));

export { ChallengeMetric, ChallengeStatus };
export type { Challenge };
