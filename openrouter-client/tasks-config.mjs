// Builds the tasks JSON for dispatcher. Run: node tasks-config.mjs | node dispatcher.mjs
// Note: dispatcher reads stdin; this script emits the wrapper object.

const ROOT = '/Users/m/Documents/Per/easya2026/GenoSync-main';
const APP = `${ROOT}/artifacts/solana/app`;
const PROGRAMS = `${ROOT}/artifacts/solana/programs`;
const SDK = `${ROOT}/artifacts/solana/sdk`;

const COMMON_CTX = `
GenoSync is a Solana-native wellness mobile app built with React Native 0.76 + Expo SDK 52, located at ${APP}.
The wallet adapter exposes \`useMobileWallet()\` from \`${APP}/src/solana/MobileWalletAdapter.tsx\` returning:
  { authorization, walletPublicKey: PublicKey|null, walletAddress: string|null, isConnecting, connect, disconnect }
The connection provider exposes \`useConnection()\` from \`${APP}/src/solana/ConnectionProvider.tsx\` returning:
  { connection: Connection, cluster: 'mainnet-beta'|'testnet'|'devnet'|'localnet', isDevnet, isMainnet }
Theme tokens at \`${APP}/src/theme/colors.ts\` (Colors.solana.{purple,green,...}, Colors.background='#000', Colors.surface='#0B0F19', Colors.textPrimary='#fff', Colors.textSecondary='#94A3B8')
and \`${APP}/src/theme/tokens.ts\` (spacing.xs..xxxl, typography.h1..caption, borderRadius.sm..xl, shadows.sm..glow).
RN libs already installed: react-native-vector-icons (Ionicons), react-native-linear-gradient, react-native-reanimated, react-native-svg, lottie-react-native, react-native-haptic-feedback, @tanstack/react-query, zustand, bs58, @solana/web3.js, @solana/spl-token, @solana-mobile/mobile-wallet-adapter-protocol-web3js, @coral-xyz/anchor.
DO NOT use any web-only libs (no framer-motion, no lucide-react, no tailwind classes, no DOM APIs).
The hook contracts the other tasks depend on (use these exact signatures):
  useBiometrics() -> { hrv: number; strain: number; focus: number; apm: number; steps: number; isMeasuring: boolean; start: ()=>void; stop: ()=>void }
  useNFTs() -> { nfts: { mint: string; name: string; image?: string; grade?: 'S'|'A'|'B'|'C'|'D' }[]; loading: boolean; refetch: ()=>void }
  useStakeInfo() -> { stakeInfo: StakeInfo|null; loading: boolean; refetch: ()=>void }
  useGovernance() -> { proposals: Proposal[]; loading: boolean; vote: (id:string, support:boolean)=>Promise<void> }
  useHistory() -> { records: SessionRecord[]; loading: boolean }
  useAuraBalance() -> { balance: number; loading: boolean; refetch: ()=>void }
Types (define and export from ../types):
  Proposal { id: string; title: string; description: string; status: 'active'|'passed'|'rejected'|'pending'; votesFor: number; votesAgainst: number; quorum: number; endTime: number; }
  SessionRecord { id: string; date: string; duration: number; grade: 'S'|'A'|'B'|'C'|'D'; hrv: number; strain: number; auraEarned: number; challenges: string[]; }
  StakeInfo (already at stores/stakingStore.ts export).
`;

const TASKS = [
  {
    name: 'A1_hooks_store',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 14000,
    prompt: `${COMMON_CTX}

TASK A1: Generate REAL DATA hooks + rewritten stakingStore. Replace fake/mock data with device sensors + Solana on-chain reads.

Output files (absolute paths):
1. ${APP}/src/types/index.ts — exports Proposal, SessionRecord, NFTItem types listed above.
2. ${APP}/src/hooks/useBiometrics.ts — uses expo-sensors Accelerometer (and Pedometer if available). Compute:
   - apm: variance of accel magnitude over 5s window -> approximate "activity per minute"
   - strain: low-pass-filtered cumulative absolute accel above gravity baseline
   - focus: inverse of gyro angular-velocity variance (high stability -> high focus). If no gyro, use accel-derived stillness.
   - hrv: 50 + 20*tanh(focus/100) as a derived proxy (no sensor for true HRV on phones — document this honestly with a small inline comment)
   - steps: from Pedometer.watchStepCount if available, else 0.
   Return { hrv, strain, focus, apm, steps, isMeasuring, start, stop }. start() registers listeners, stop() unsubscribes. Use refs for subscriptions. Polyfill if Pedometer missing on platform.
3. ${APP}/src/hooks/useNFTs.ts — uses @solana/spl-token getParsedTokenAccountsByOwner-equivalent (use connection.getParsedTokenAccountsByOwner with TOKEN_PROGRAM_ID filter), filter to (decimals===0 && amount==="1"), map to { mint, name: shorten(mint), image: undefined, grade: undefined }. Best-effort metadata decode is OK to skip (return name as truncated mint). Use @tanstack/react-query with key ['nfts', walletAddress, cluster]. Return { nfts, loading, refetch }.
4. ${APP}/src/hooks/useStakeInfo.ts — derives a stake PDA from the staking program id (use a placeholder PROGRAM_ID = new PublicKey('GNSYstk111111111111111111111111111111111111') — note this is intentionally a placeholder and the program is undeployed). Attempts connection.getAccountInfo; if account exists, deserialize fields amount(u64), lockup_period(u8), lockup_end(i64), boost_multiplier(u16), staked_at(i64) using Buffer.readBigUInt64LE etc. If no account, returns null gracefully. Use react-query. Export { stakeInfo, loading, refetch }.
5. ${APP}/src/hooks/useGovernance.ts — returns proposals array. Implement as: try to fetch SPL Governance Realm proposals via @coral-xyz/anchor if available; if any error, return []. Wrap with react-query. Expose vote(id, support) as a no-op for now that just toasts/logs.
6. ${APP}/src/hooks/useHistory.ts — uses connection.getSignaturesForAddress(walletPubkey, { limit: 20 }) and maps each signature into a SessionRecord stub (date from blockTime, duration estimate 0, grade unknown -> 'C', hrv/strain/auraEarned derived from on-chain memo if present else 0). If no wallet, return []. Use react-query.
7. ${APP}/src/hooks/useAuraBalance.ts — REWRITE: read mint from process.env.EXPO_PUBLIC_AURA_MINT (fallback to undefined), if mint missing return { balance: 0, loading: false, refetch: noop }. Otherwise use connection.getTokenAccountBalance on the ATA derived via getAssociatedTokenAddress. Use react-query.
8. ${APP}/src/stores/stakingStore.ts — REWRITE: remove the mockStakingClient. Keep the StakeInfo + StakingState types. Initial state: stakeInfo=null, auraBalance=0. Add setters. The stake/unstake actions remain as TODO that throw a "Program not deployed" error (so screens can call them and show a friendly error). The refresh() reads from useAuraBalance + useStakeInfo via getState injection — but since hooks can't be called in zustand, expose setStakeInfo/setAuraBalance only and let screens push values in via useEffect.
9. ${APP}/package.json — add "expo-sensors": "~14.0.0" to dependencies. Output the FULL package.json content; do not omit existing fields. Read the existing package.json content provided in this prompt and add the dep without removing anything.

Existing package.json content (preserve all of this; add expo-sensors):
\`\`\`json
{
  "name": "genosync-solana",
  "version": "1.0.0",
  "description": "GenoSync - AI Wellness Companion for Solana Phone (Saga/Seeker)",
  "private": true,
  "scripts": {
    "android": "expo run:android",
    "ios": "expo run:ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.28.0",
    "@expo/metro-runtime": "^4.0.1",
    "@react-native-community/cli-platform-android": "^20.1.3",
    "@react-native/gradle-plugin": "^0.84.1",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@shadow-drive/sdk": "^4.0.0",
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.0.0",
    "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.0.0",
    "@solana/spl-token": "^0.3.9",
    "@solana/wallet-adapter-react": "^0.15.32",
    "@solana/web3.js": "^1.87.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "bs58": "^5.0.0",
    "buffer": "^6.0.3",
    "date-fns": "^2.30.0",
    "expo": "~52.0.0",
    "expo-updates": "~0.27.5",
    "lottie-react-native": "7.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-native": "^0.76.9",
    "react-native-biometrics": "^3.0.0",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-get-random-values": "^2.0.0",
    "react-native-haptic-feedback": "^2.2.0",
    "react-native-linear-gradient": "^2.8.0",
    "react-native-permissions": "^3.10.0",
    "react-native-reanimated": "~3.16.1",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-svg": "15.8.0",
    "react-native-url-polyfill": "^3.0.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-web": "^0.19.13",
    "tweetnacl": "^1.0.3",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "@babel/runtime": "^7.23.0",
    "@react-native-community/cli": "^20.1.3",
    "@react-native/eslint-config": "^0.72.0",
    "@react-native/metro-config": "^0.72.11",
    "@tsconfig/react-native": "^3.0.0",
    "@types/react": "^18.2.0",
    "@types/react-native-vector-icons": "^6.4.18",
    "@types/react-test-renderer": "^18.0.0",
    "babel-jest": "^29.2.0",
    "eslint": "^8.19.0",
    "jest": "^29.2.0",
    "metro-react-native-babel-preset": "0.76.8",
    "prettier": "^2.4.0",
    "react-test-renderer": "18.2.0",
    "typescript": "^5.3.3"
  },
  "engines": { "node": ">=16" }
}
\`\`\`

CRITICAL: Use TypeScript strict-friendly code. Imports must be valid. Wrap react-query usage in try/catch where appropriate. Never throw on missing wallet; return safe defaults.`,
  },
  {
    name: 'A2_screen_rewires',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 14000,
    prompt: `${COMMON_CTX}

TASK A2: Rewrite 4 screens to use the new REAL DATA hooks (defined in A1, signatures listed above). Preserve all existing visual structure (do not remove sections), just swap data sources. Keep StyleSheets, Animated values, and layout intact. The whole point is REPLACING mock data and hardcoded fluctuating Math.random() with real hook values.

Output files (FULL contents, not patches):
1. ${APP}/src/screens/Dashboard.tsx — Use useBiometrics() to drive sessionStats. Replace the simulated setInterval that does Math.random hrv/strain with: on isSessionActive change, call start()/stop(); read live values from useBiometrics in render. Use useAuraBalance() for balance. Use useStakeInfo() for stakeInfo. Keep all the rendering, the toggleSession, calculateGrade, ActionButton/BiometricCard children. The screen must compile against the hooks listed in CONTEXT. Don't introduce new visual elements; just rewire data. Roughly 500 lines, preserve existing styles.
2. ${APP}/src/screens/NFTCollection.tsx — Remove MOCK_NFTS. Use useNFTs() hook. Map nft.grade ?? 'C' for the grade badge. If nfts.length===0, show an "earn S-grade sessions to mint compressed NFTs" empty state. Keep FlatList + styles. Roughly 400 lines.
3. ${APP}/src/screens/Governance.tsx — Remove MOCK_PROPOSALS. Use useGovernance(). If proposals.length===0, show "No active proposals" empty state. Calling vote() should call the hook's vote method and show a toast/alert.
4. ${APP}/src/screens/History.tsx — Remove MOCK_HISTORY. Use useHistory(). Keep grade color logic, totals computation. If records.length===0, show empty state.

CRITICAL:
- Do NOT modify Profile.tsx, Staking.tsx, or LockScreen.tsx in this task.
- Preserve all StyleSheet.create calls and JSX structure as faithfully as possible.
- Use react-native-vector-icons/Ionicons for icons (already imported).
- DO NOT introduce new dependencies.
- The Dashboard imports must include the new hooks: import { useBiometrics } from '../hooks/useBiometrics'; import { useAuraBalance } from '../hooks/useAuraBalance'; import { useStakeInfo } from '../hooks/useStakeInfo';
- DO NOT use the useStakingStore anymore in these screens — use the new hooks directly.`,
  },
  {
    name: 'B1_theme_chat_breath_brain_provenance',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 12000,
    prompt: `${COMMON_CTX}

TASK B1: Generate polished RN components ported from the web app at ${ROOT}/artifacts/web/src/components/. Use existing theme tokens. NO web libs.

Output files (absolute paths, full contents):
1. ${APP}/src/components/AuraChat.tsx — In-screen chat UI. Props: { onSend?: (msg: string) => Promise<string>; initialGreeting?: string }. Uses FlatList for messages, TextInput for composing, Send TouchableOpacity. Bubble styles: user (purple), assistant (dark with green border). If onSend is undefined, internal mock responds with a delay using preset wellness coach replies (varied). Use react-native-linear-gradient for the header bar.
2. ${APP}/src/components/BreathingExercise.tsx — Animated circle that scales 1->1.5->1 with 4-7-8 breathing cadence (inhale 4s, hold 7s, exhale 8s). Use Animated API (RN built-in) with useRef. Props: { durationSec?: number; onComplete?: () => void }. Show countdown timer. Show phase label ("Inhale", "Hold", "Exhale"). Use LinearGradient for the circle. Auto-completes after durationSec.
3. ${APP}/src/components/BrainwaveVisualizer.tsx — Animated wave bars (5-9 bars in a row) using Animated.Value array; each bar oscillates with random-ish phase. Props: { intensity?: number (0-1); colors?: string[] }. Used in MeditationMode and ProfileScreen.
4. ${APP}/src/components/ProvenanceModal.tsx — RN Modal showing on-chain provenance for a metric. Props: { visible: boolean; onClose: () => void; metric: { key: string; label: string; value: string | number; signature?: string; cluster?: string; timestamp?: number } }. Renders metric details, signature truncation, "View on Solscan" link (uses Linking.openURL with the Solscan URL — provide a helper). Use the existing getSolscanUrl pattern (signature is hash, cluster from useConnection). Styled card with backdrop.
5. ${APP}/src/components/MetricTile.tsx — NEW small reusable tile: { icon: string; label: string; value: string; unit?: string; color?: string; onPress?: () => void; pulse?: boolean }. Used to standardize Dashboard biometric tiles.

CRITICAL: Each file must export the component as named export. Use proper TypeScript types. Use theme tokens (Colors, spacing, typography, borderRadius, shadows). Ionicons names from \`react-native-vector-icons/Ionicons\`.`,
  },
  {
    name: 'B2_meditation_exercise_movement_receipt',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 12000,
    prompt: `${COMMON_CTX}

TASK B2: Generate 4 more polished RN components ported from the web app.

Output files (full contents):
1. ${APP}/src/components/MeditationMode.tsx — Full-screen-able meditation card with start button. Tracks elapsed time, integrates with BrainwaveVisualizer (assume import { BrainwaveVisualizer } from './BrainwaveVisualizer'). Props: { onComplete?: (result: { durationSec: number; focusScore: number }) => void; targetSec?: number }. Phase 1: idle (CTA "Begin"). Phase 2: active (timer + visualizer + "End" button). Phase 3: complete (focus score 0-100 derived from time held). Use Animated for smooth transitions.
2. ${APP}/src/components/ExerciseBreakModal.tsx — RN Modal with a list of exercises to choose from (preset 4-6: e.g., Wrist Stretch, Eye Roll, Shoulder Shrug, Deep Breath, Neck Rotation, Posture Reset). Each shows name, target reps, duration. Tapping starts a countdown for that exercise. Props: { visible: boolean; onClose: () => void; onCompleted: (exerciseId: string) => void }. Export const EXERCISES.
3. ${APP}/src/components/MovementChallenge.tsx — Shows a movement prompt (e.g., "Stand up and stretch") with random selection function. Export getRandomMovement(): Movement. Props: { onCompleted?: () => void }. Has a "Done" button with celebration animation.
4. ${APP}/src/components/ReceiptChainCard.tsx — Vertical list of recent bio-receipts. Props: { receipts: { hash: string; timestamp: number; metric: string; value: string }[]; onTapReceipt?: (r) => void; emptyMessage?: string }. Uses FlatList with truncated hash and tap-to-view (optional). Pretty card styling matching the dark theme.

CRITICAL: TypeScript types. Theme tokens. Ionicons. No web libs.`,
  },
  {
    name: 'B3_screens_coach_meditation_exercises',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 10000,
    prompt: `${COMMON_CTX}

TASK B3: Generate 3 new RN screens that host the components from B1+B2.

Output files (full contents):
1. ${APP}/src/screens/Coach.tsx — Imports AuraChat from '../components/AuraChat'. Renders a SafeAreaView with header "Aura Coach" and the chat below. Optionally wires onSend to a placeholder async function returning canned responses (no external API). Provide a few suggested-prompt chips above the input ("How can I improve my HRV?", "Suggest a 5-min break", etc.).
2. ${APP}/src/screens/Meditation.tsx — Imports MeditationMode and BrainwaveVisualizer. Renders a clean meditation screen. On completion shows a "Mint Receipt" button (no-op alert for now). Header with "Meditation" + subtitle.
3. ${APP}/src/screens/Exercises.tsx — Imports ExerciseBreakModal and MovementChallenge. A simple list/grid of category cards: "Take a stretch break" (opens ExerciseBreakModal), "Random movement challenge" (renders MovementChallenge inline or in modal), "Breathing" (links/buttons to Meditation screen via navigation prop).

CRITICAL: Export as named React.FC. Use SafeAreaView from 'react-native-safe-area-context'. Use theme tokens. Use NavigationProp from '@react-navigation/native' where needed (the screens are tab children but can use useNavigation()). Don't add new deps.`,
  },
  {
    name: 'C1_challenges_program_sdk',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 12000,
    prompt: `${COMMON_CTX}

TASK C1: Build the Anchor program + TypeScript SDK for the new "user-vs-user wellness challenges" feature.

Output files (full contents):
1. ${PROGRAMS}/challenges/Anchor.toml — Anchor 0.28 config, mirror format of programs/staking/Anchor.toml. Program name "challenges", id placeholder "GNSYch111111111111111111111111111111111111".
2. ${PROGRAMS}/challenges/Cargo.toml — workspace + program declaration, mirror programs/staking/Cargo.toml.
3. ${PROGRAMS}/challenges/programs/challenges/Cargo.toml — program crate Cargo.toml. anchor-lang = "0.28.0", anchor-spl = "0.28.0".
4. ${PROGRAMS}/challenges/programs/challenges/src/lib.rs — Anchor program. Pseudocode:
   - declare_id!("GNSYch111111111111111111111111111111111111");
   - #[program] mod challenges { create_challenge, accept_challenge, submit_score, settle_challenge, cancel_challenge }
   - State: Challenge { creator: Pubkey, opponent: Pubkey, metric_kind: u8, target: u64, wager: u64, expiry: i64, creator_score: u64, opponent_score: u64, status: u8, bump: u8 }
   - status enum: Pending=0, Active=1, AwaitingScores=2, Settled=3, Cancelled=4
   - PDA seeds: [b"challenge", creator.key().as_ref(), &[counter_bytes]] — keep it simple, use timestamp byte slice
   - Escrow: a token account owned by a PDA seeded [b"escrow", challenge.key().as_ref()]
   - In create_challenge: transfer wager AURA from creator to escrow, set status Pending, store opponent.
   - In accept_challenge: transfer wager AURA from opponent to escrow, set status Active.
   - In submit_score: only creator OR opponent signer, update their score, if both submitted set status AwaitingScores -> Settled by anyone.
   - In settle_challenge: compare scores by metric (kind 3=strain: lower wins; else higher wins). Winner gets all escrow. If tie, refund both. Set status Settled.
   - In cancel_challenge: only creator, only if status Pending and not yet accepted, refunds creator.
   - Use anchor_spl::token::{Transfer, transfer} for SPL transfers.
   - Errors: Unauthorized, AlreadySubmitted, NotExpired, AlreadySettled, InvalidStatus.
5. ${SDK}/src/challenges.ts — TypeScript SDK exporting:
   \`\`\`
   export enum ChallengeMetric { HRV=0, Steps=1, MeditationMinutes=2, Strain=3, APM=4 }
   export enum ChallengeStatus { Pending=0, Active=1, AwaitingScores=2, Settled=3, Cancelled=4 }
   export interface Challenge { pda: string; creator: string; opponent: string; metric: ChallengeMetric; target: number; wager: number; expiry: number; creatorScore: number; opponentScore: number; status: ChallengeStatus }
   export interface ChallengesClientOptions { mock?: boolean; connection?: any; wallet?: any; programId?: string }
   export class ChallengesClient {
     constructor(opts: ChallengesClientOptions) { this.mock = opts.mock ?? true; ... }
     async listForWallet(pubkey: string): Promise<Challenge[]>
     async listAll(): Promise<Challenge[]>
     async create({ opponent, metric, target, wager, expiryDays }): Promise<Challenge>
     async accept(pda: string, signerPubkey: string): Promise<Challenge>
     async submitScore(pda: string, signerPubkey: string, score: number): Promise<Challenge>
     async settle(pda: string): Promise<Challenge>
     async cancel(pda: string, signerPubkey: string): Promise<Challenge>
     // leaderboard (mock): aggregate wins per pubkey
     async leaderboard(limit?: number): Promise<{ pubkey: string; wins: number; losses: number; net: number }[]>
   }
   \`\`\`
   - In mock mode, all state lives in an in-memory Map keyed by pda. Persistence layer is OPTIONAL — provide a small abstraction \`MockStore\` interface with get/set/list; default to in-memory. The store will be injected from the RN side using AsyncStorage (see C3).
   - In on-chain mode (mock=false), use @coral-xyz/anchor (don't import the IDL — accept it as a parameter or fail gracefully). For now, when mock=false, methods can throw 'On-chain mode requires deployed program' — this is acceptable.
   - PDAs in mock mode: generate a random 32-byte base58 string.

CRITICAL: Rust must be syntactically correct Anchor 0.28 code. The TS SDK must compile under tsconfig.json (strict-ish). Do NOT depend on any new npm packages.`,
  },
  {
    name: 'C2_challenges_screens',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 12000,
    prompt: `${COMMON_CTX}

TASK C2: Build 3 new RN screens for the challenges feature. These import from \`../stores/challengesStore\` (built in C3), which exposes:
  useChallengesStore() -> { challenges: Challenge[]; isLoading: boolean; create(input): Promise<Challenge>; accept(pda): Promise<Challenge>; submitScore(pda, score): Promise<Challenge>; settle(pda): Promise<Challenge>; cancel(pda): Promise<Challenge>; refresh(): Promise<void>; leaderboard(): Promise<{pubkey:string;wins:number;losses:number;net:number}[]> }
Use the ChallengeMetric/ChallengeStatus enums imported from '../../../sdk/src/challenges' (relative path: '../sdk/challenges' — see C3 for re-export — for now import via '../stores/challengesStore').

Output files (full contents):
1. ${APP}/src/screens/Challenges.tsx — Header with title "Challenges" and segmented control (Active / Pending / History). Lists ChallengeCard items via FlatList. FAB bottom-right opens CreateChallenge (use useNavigation). Pull-to-refresh. Empty state CTA.
2. ${APP}/src/screens/ChallengeDetail.tsx — Reads route.params.pda. Shows matchup card (creator avatar/pubkey vs opponent avatar/pubkey), wager, metric label, target, time remaining (computed from expiry), live scores. Bottom action button changes by state: Pending+opponentIsMe -> "Accept" (calls accept); Active+isParticipant -> "Submit Score" (input + submitScore); AwaitingScores -> "Settle" (anyone); Settled -> "View Result" disabled. Creator-only "Cancel" button when Pending.
3. ${APP}/src/screens/CreateChallenge.tsx — Form: opponent pubkey TextInput (with paste shortcut), metric Picker (use TouchableOpacity rows since no react-native-picker installed), target number input, wager number input, expiry slider (1-30 days, fall back to TouchableOpacity buttons since no Slider in deps... wait, react-native-reanimated is installed but no Slider — use TouchableOpacity row of 1/3/7/14/30 day chips). On submit, call create() and navigate back.

CRITICAL: Use useNavigation<NativeStackNavigationProp<any>>() for navigation. Use existing theme. SafeAreaView. KeyboardAvoidingView around the form. No new deps. Format pubkeys as 'Xxx...Yyy'. Show alerts for errors.`,
  },
  {
    name: 'C3_challenges_components_store_hook',
    model: 'openai/gpt-5.3-codex',
    max_tokens: 10000,
    prompt: `${COMMON_CTX}

TASK C3: Build the components, store, and hook for the challenges feature, plus update package.json.

Output files:
1. ${APP}/src/components/ChallengeCard.tsx — Compact tile: avatar circles for both participants, metric label, wager AURA, status pill, time remaining. Props: { challenge: Challenge; mySide?: 'creator'|'opponent'|null; onPress?: () => void }.
2. ${APP}/src/components/Leaderboard.tsx — Top-N players list. Props: { entries: { pubkey: string; wins: number; losses: number; net: number }[]; title?: string; max?: number }. Rank badge gold/silver/bronze for top 3.
3. ${APP}/src/stores/challengesStore.ts — Zustand store wrapping ChallengesClient from '../sdk/challenges' OR from the dedicated SDK location. Since the SDK lives at \`${SDK}/src/challenges\`, import as: \`import { ChallengesClient, Challenge, ChallengeMetric, ChallengeStatus } from '../../../sdk/src/challenges'\` (relative from ${APP}/src/stores). Re-export the enums from this module so screens can import them via '../stores/challengesStore'.
   - Construct ChallengesClient with mock: true.
   - State: { challenges: Challenge[], isLoading: boolean, leaderboardEntries: [] }
   - Actions: refresh (calls listAll + leaderboard), create, accept, submitScore, settle, cancel. After each mutating action, call refresh.
   - Wire an AsyncStorage-backed MockStore: implement an object { get, set, list } that reads/writes a single key '@genosync/challenges' as a JSON map. Pass it to ChallengesClient if the SDK accepts a store (graceful fallback to in-memory if SDK doesn't accept one).
4. ${APP}/src/hooks/useChallenges.ts — Thin wrapper around useChallengesStore that also calls refresh() on mount.
5. ${APP}/src/screens/index.ts — APPEND export lines for the new screens (Challenges, ChallengeDetail, CreateChallenge, Coach, Meditation, Exercises). Provide the FULL file: it currently exports DashboardScreen, StakingScreen, NFTCollectionScreen, GovernanceScreen, HistoryScreen, ProfileScreen, LockScreen — keep those AND add the new ones.

ALSO output:
6. ${APP}/package.json — Same as A1 but include "@react-native-async-storage/async-storage": "1.23.1" as a dep too. Provide the FULL package.json (we'll reconcile with A1's version downstream).

CRITICAL: Use react-native-vector-icons/Ionicons. Theme tokens. Pubkey formatting helper. Don't add other new deps. NEVER throw on mount — initial empty state, refresh fills.`,
  },
];

process.stdout.write(JSON.stringify({ tasks: TASKS, write: true }, null, 2));
