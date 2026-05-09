# agent-verification-ledger

Immutable ledger for tracking agent actions, decisions, and provenance for auditability.

## Features

- **Hash-Chained Records**: Every entry is cryptographically linked to the previous one using SHA-256, ensuring the entire history is tamper-evident.
- **Provenance Tracking**: Effortlessly reconstruct the decision tree that led to any specific action.
- **Semantic Search**: Filter and search through thousands of agent actions by agent ID, type, time range, or content keywords.
- **Persistence**: Lightweight JSONL storage designed for high-performance logging and easy auditability.
- **Integrity Auditing**: Built-in verification tools to detect tampering or data corruption across the entire chain.
- **Export/Import**: Securely share and verify agent histories across different systems.

## Installation

```bash
bun add agent-verification-ledger
```

## Usage

### Recording Actions

```typescript
import { createLedger } from 'agent-verification-ledger';

const ledger = createLedger({
  storagePath: './audit-log.jsonl',
  autoSave: true
});

// Record a high-level decision
const decision = ledger.record('compliance-agent', 'DECISION', {
  goal: 'analyze-risk',
  parameters: { threshold: 0.8 }
});

// Record an action linked to that decision
ledger.record('compliance-agent', 'ACTION', {
  operation: 'fetch-data',
  source: 'api.example.com'
}, decision.id);
```

### Auditing Integrity

```typescript
const audit = ledger.audit();
if (audit.isValid) {
  console.log(`Ledger is secure. Verified ${audit.totalEntries} entries.`);
} else {
  console.error(`Tampering detected at entry ${audit.tamperedEntryId}: ${audit.error}`);
}
```

### Provenance Tracking

```typescript
const provenance = ledger.getProvenance(lastActionId);
console.log('Decision Chain:');
provenance.entries.forEach(entry => {
  console.log(`[${entry.type}] ${entry.agentId}: ${JSON.stringify(entry.content)}`);
});
```

## Architecture

The ledger follows a blockchain-inspired design where each `LedgerEntry` contains:
- `id`: Unique UUID for the entry.
- `previousHash`: The SHA-256 hash of the preceding entry.
- `hash`: The SHA-256 hash of the current entry (including the `previousHash`).
- `content`: The actual data payload.
- `metadata`: Supplemental tracking data (IPs, versions, etc.).

This creates a linked list of records that cannot be modified without breaking all subsequent hashes.

## License

MIT