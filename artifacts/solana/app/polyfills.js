// Loaded as the VERY FIRST import in index.js, before App and therefore before
// any @solana/web3.js / spl-token module evaluates. ES import order guarantees
// this module fully executes before ./App is required, so the Buffer / crypto
// / URL globals exist before web3.js touches them (Hermes has no Buffer).
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
