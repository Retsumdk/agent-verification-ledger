import { randomUUID } from 'node:crypto';
import { calculateHash, verifyHash } from './crypto';
import { StorageProvider } from './storage';
import type { 
  LedgerEntry, 
  EntryType, 
  AuditResult, 
  ProvenanceChain, 
  LedgerOptions 
} from './types';

export class VerificationLedger {
  private entries: LedgerEntry[] = [];
  private lastHash: string = '0'.repeat(64);
  private storage?: StorageProvider;
  private options: LedgerOptions;

  constructor(options: LedgerOptions) {
    this.options = options;
    if (options.storagePath) {
      this.storage = new StorageProvider(options.storagePath);
      this.load();
    }
  }

  private load(): void {
    if (!this.storage) return;
    this.entries = this.storage.loadAll();
    if (this.entries.length > 0) {
      this.lastHash = this.entries[this.entries.length - 1].hash;
    }
  }

  public record(
    agentId: string, 
    type: EntryType, 
    content: Record<string, any>, 
    parentEntryId?: string,
    metadata?: Record<string, any>
  ): LedgerEntry {
    const entry: Omit<LedgerEntry, 'hash'> = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      agentId,
      parentEntryId,
      content,
      metadata,
      previousHash: this.lastHash
    };

    const hash = calculateHash(entry);
    const fullEntry: LedgerEntry = { ...entry, hash };

    this.entries.push(fullEntry);
    this.lastHash = hash;

    if (this.options.autoSave && this.storage) {
      this.storage.append(fullEntry);
    }

    return fullEntry;
  }

  public audit(): AuditResult {
    let currentPrevHash = '0'.repeat(64);
    
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      
      // Verify link to previous entry
      if (entry.previousHash !== currentPrevHash) {
        return {
          isValid: false,
          tamperedEntryId: entry.id,
          error: `Hash chain broken at entry ${entry.id}. Expected previous hash ${currentPrevHash}, got ${entry.previousHash}`,
          totalEntries: this.entries.length
        };
      }

      // Verify entry content integrity
      if (!verifyHash(entry)) {
        return {
          isValid: false,
          tamperedEntryId: entry.id,
          error: `Content hash mismatch at entry ${entry.id}.`,
          totalEntries: this.entries.length
        };
      }

      currentPrevHash = entry.hash;
    }

    return {
      isValid: true,
      totalEntries: this.entries.length
    };
  }

  public getProvenance(entryId: string): ProvenanceChain {
    const chain: LedgerEntry[] = [];
    let currentId: string | undefined = entryId;

    while (currentId) {
      const entry = this.entries.find(e => e.id === currentId);
      if (!entry) break;
      
      chain.unshift(entry);
      currentId = entry.parentEntryId;
    }

    if (chain.length === 0) {
      throw new Error(`Entry with ID ${entryId} not found in ledger.`);
    }

    return {
      rootEntryId: chain[0].id,
      entries: chain,
      depth: chain.length
    };
  }

  public findByAgent(agentId: string): LedgerEntry[] {
    return this.entries.filter(e => e.agentId === agentId);
  }

  public findByType(type: EntryType): LedgerEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  public getEntry(entryId: string): LedgerEntry | undefined {
    return this.entries.find(e => e.id === entryId);
  }

  /**
   * Returns a summary of the ledger's contents grouped by entry type.
   */
  public getStats(): Record<string, number> {
    return this.entries.reduce((stats, entry) => {
      stats[entry.type] = (stats[entry.type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
  }

  /**
   * Searches the ledger for entries matching specific criteria.
   */
  public search(query: {
    agentId?: string;
    type?: EntryType;
    startTime?: string;
    endTime?: string;
    contentKeywords?: string[];
  }): LedgerEntry[] {
    return this.entries.filter(entry => {
      if (query.agentId && entry.agentId !== query.agentId) return false;
      if (query.type && entry.type !== query.type) return false;
      
      if (query.startTime && new Date(entry.timestamp) < new Date(query.startTime)) return false;
      if (query.endTime && new Date(entry.timestamp) > new Date(query.endTime)) return false;
      
      if (query.contentKeywords) {
        const contentStr = JSON.stringify(entry.content).toLowerCase();
        if (!query.contentKeywords.every(kw => contentStr.includes(kw.toLowerCase()))) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Verifies that the ledger has not been tampered with and that the chain is consistent.
   * This is a deeper check than the basic audit as it also checks for orphaned chains.
   */
  public verifyIntegrity(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const audit = this.audit();
    
    if (!audit.isValid) {
      issues.push(audit.error || 'Audit failed');
    }

    // Check for duplicate IDs
    const ids = new Set<string>();
    for (const entry of this.entries) {
      if (ids.has(entry.id)) {
        issues.push(`Duplicate ID found: ${entry.id}`);
      }
      ids.add(entry.id);
    }

    // Check for parent entries that don't exist
    for (const entry of this.entries) {
      if (entry.parentEntryId && !ids.has(entry.parentEntryId)) {
        issues.push(`Orphaned entry ${entry.id}: Parent ${entry.parentEntryId} not found`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Exports the ledger to a formatted JSON string.
   */
  public export(): string {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      entries: this.entries,
      stats: this.getStats()
    }, null, 2);
  }

  /**
   * Imports entries from an exported JSON string.
   * Note: This will overwrite current entries if successful and chain is valid.
   */
  public import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        throw new Error('Invalid export format: missing entries array');
      }

      const originalEntries = [...this.entries];
      const originalLastHash = this.lastHash;

      this.entries = parsed.entries;
      const audit = this.audit();
      
      if (!audit.isValid) {
        this.entries = originalEntries;
        this.lastHash = originalLastHash;
        throw new Error(`Import failed: chain integrity verification failed. ${audit.error}`);
      }

      if (this.entries.length > 0) {
        this.lastHash = this.entries[this.entries.length - 1].hash;
      }

      if (this.options.autoSave && this.storage) {
        this.save();
      }
    } catch (err: any) {
      throw new Error(`Import failed: ${err.message}`);
    }
  }

  public size(): number {
    return this.entries.length;
  }

  public save(): void {
    if (!this.storage) {
      throw new Error('Storage path not configured for this ledger.');
    }
    
    // For manual save, we rewrite the whole file to ensure sync if not auto-saving
    this.storage.clear();
    for (const entry of this.entries) {
      this.storage.append(entry);
    }
  }
}
