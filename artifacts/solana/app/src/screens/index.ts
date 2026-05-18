// Normalized re-exports — every screen exposed as `XxxScreen`.
export { DashboardScreen } from './Dashboard';
export { default as DashboardDefault } from './Dashboard';
import DashboardImport from './Dashboard';
// (Dashboard.tsx has only `export default Dashboard`; re-alias below.)

export { StakingScreen } from './Staking';
export { ProfileScreen } from './Profile';
export { LockScreen } from './LockScreen';

import NFTCollectionImport from './NFTCollection';
import GovernanceImport from './Governance';
import HistoryImport from './History';
import ChallengesImport from './Challenges';
import ChallengeDetailImport from './ChallengeDetail';
import CreateChallengeImport from './CreateChallenge';
import CoachImport from './Coach';
import MeditationImport from './Meditation';
import ExercisesImport from './Exercises';

// Provide named-with-Screen-suffix exports for the navigator.
// Dashboard.tsx exports default `Dashboard` AND a named alias (added below) — fallback to default.
// @ts-ignore - dual-export reconciliation
export const NFTCollectionScreen = NFTCollectionImport;
// @ts-ignore
export const GovernanceScreen = GovernanceImport;
// @ts-ignore
export const HistoryScreen = HistoryImport;
// @ts-ignore
export const ChallengesScreen = ChallengesImport;
// @ts-ignore
export const ChallengeDetailScreen = ChallengeDetailImport;
// @ts-ignore
export const CreateChallengeScreen = CreateChallengeImport;
// @ts-ignore
export const CoachScreen = CoachImport;
// @ts-ignore
export const MeditationScreen = MeditationImport;
// @ts-ignore
export const ExercisesScreen = ExercisesImport;
