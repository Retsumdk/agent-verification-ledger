export * from './types.js';
export { VerificationLedger } from './ledger.js';
export { StorageProvider } from './storage.js';
export { calculateHash, verifyHash } from './crypto.js';

import { VerificationLedger } from './ledger.js';
import type { LedgerOptions } from './types.js';

/**
 * Creates a new VerificationLedger instance with standard options.
 */
export function createLedger(options: LedgerOptions): VerificationLedger {
  return new VerificationLedger({
    autoSave: true,
    ...options
  });
}
