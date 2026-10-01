import { createHash } from 'node:crypto';
import type { LedgerEntry } from './types.js';

export function calculateHash(entry: Omit<LedgerEntry, 'hash'>): string {
  const data = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    type: entry.type,
    agentId: entry.agentId,
    parentEntryId: entry.parentEntryId,
    content: entry.content,
    metadata: entry.metadata,
    previousHash: entry.previousHash
  });
  
  return createHash('sha256').update(data).digest('hex');
}

export function verifyHash(entry: LedgerEntry): boolean {
  const { hash, ...rest } = entry;
  return calculateHash(rest) === hash;
}
