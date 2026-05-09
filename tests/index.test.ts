import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { VerificationLedger } from '../src/ledger';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEST_STORAGE = join(import.meta.dir, 'test-ledger.jsonl');

describe('VerificationLedger', () => {
  let ledger: VerificationLedger;

  beforeEach(() => {
    if (existsSync(TEST_STORAGE)) {
      rmSync(TEST_STORAGE);
    }
    ledger = new VerificationLedger({
      storagePath: TEST_STORAGE,
      autoSave: true
    });
  });

  afterEach(() => {
    if (existsSync(TEST_STORAGE)) {
      rmSync(TEST_STORAGE);
    }
  });

  it('should record an entry', () => {
    const entry = ledger.record('agent-1', 'ACTION', { action: 'move', target: 'x' });
    expect(entry.agentId).toBe('agent-1');
    expect(entry.type).toBe('ACTION');
    expect(ledger.size()).toBe(1);
  });

  it('should maintain a hash chain', () => {
    const e1 = ledger.record('agent-1', 'ACTION', { step: 1 });
    const e2 = ledger.record('agent-1', 'ACTION', { step: 2 });
    const e3 = ledger.record('agent-1', 'ACTION', { step: 3 });

    expect(e2.previousHash).toBe(e1.hash);
    expect(e3.previousHash).toBe(e2.hash);
    expect(ledger.audit().isValid).toBe(true);
  });

  it('should detect tampering', () => {
    ledger.record('agent-1', 'ACTION', { step: 1 });
    ledger.record('agent-1', 'ACTION', { step: 2 });
    
    // Simulate tampering (accessing private members for test)
    (ledger as any).entries[0].content.step = 999;
    
    expect(ledger.audit().isValid).toBe(false);
  });

  it('should track provenance', () => {
    const root = ledger.record('agent-1', 'DECISION', { goal: 'test' });
    const action1 = ledger.record('agent-1', 'ACTION', { task: 1 }, root.id);
    const action2 = ledger.record('agent-1', 'ACTION', { task: 2 }, action1.id);

    const provenance = ledger.getProvenance(action2.id);
    expect(provenance.depth).toBe(3);
    expect(provenance.entries[0].id).toBe(root.id);
    expect(provenance.entries[1].id).toBe(action1.id);
    expect(provenance.entries[2].id).toBe(action2.id);
  });

  it('should search entries correctly', () => {
    ledger.record('agent-1', 'ACTION', { key: 'val1' });
    ledger.record('agent-2', 'DECISION', { key: 'val2' });
    ledger.record('agent-1', 'OBSERVATION', { key: 'val3' });

    const agent1Entries = ledger.search({ agentId: 'agent-1' });
    expect(agent1Entries.length).toBe(2);

    const decisionEntries = ledger.search({ type: 'DECISION' });
    expect(decisionEntries.length).toBe(1);

    const keywordEntries = ledger.search({ contentKeywords: ['val2'] });
    expect(keywordEntries.length).toBe(1);
  });

  it('should persist and reload entries', () => {
    ledger.record('agent-1', 'ACTION', { persisted: true });
    
    const newLedger = new VerificationLedger({
      storagePath: TEST_STORAGE,
      autoSave: true
    });
    
    expect(newLedger.size()).toBe(1);
    expect(newLedger.audit().isValid).toBe(true);
    expect(newLedger.getEntry(ledger.search({})[0].id)).toBeDefined();
  });

  it('should export and import correctly', () => {
    ledger.record('agent-1', 'ACTION', { data: 'x' });
    const exported = ledger.export();
    
    const emptyLedger = new VerificationLedger({
      storagePath: join(import.meta.dir, 'empty.jsonl'),
      autoSave: false
    });
    
    emptyLedger.import(exported);
    expect(emptyLedger.size()).toBe(1);
    expect(emptyLedger.audit().isValid).toBe(true);
  });
});
