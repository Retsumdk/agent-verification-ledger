export * from './types';
export { VerificationLedger } from './ledger';
export { StorageProvider } from './storage';
export { calculateHash, verifyHash } from './crypto';

import { VerificationLedger } from './ledger';
import type { LedgerOptions } from './types';

/**
 * Creates a new VerificationLedger instance with standard options.
 */
export function createLedger(options: LedgerOptions): VerificationLedger {
  return new VerificationLedger({
    autoSave: true,
    ...options
  });
}
