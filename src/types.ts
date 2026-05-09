export type EntryType = 'ACTION' | 'DECISION' | 'OBSERVATION' | 'METADATA';

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: EntryType;
  agentId: string;
  parentEntryId?: string;
  content: Record<string, any>;
  metadata?: Record<string, any>;
  previousHash: string;
  hash: string;
}

export interface AuditResult {
  isValid: boolean;
  tamperedEntryId?: string;
  error?: string;
  totalEntries: number;
}

export interface ProvenanceChain {
  rootEntryId: string;
  entries: LedgerEntry[];
  depth: number;
}

export interface LedgerOptions {
  storagePath: string;
  autoSave?: boolean;
  signingSecret?: string;
}
