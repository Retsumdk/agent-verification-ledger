import { appendFileSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { LedgerEntry } from './types';

export class StorageProvider {
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
    this.ensureDirectory();
  }

  private ensureDirectory() {
    const dir = dirname(this.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  append(entry: LedgerEntry): void {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(this.path, line, 'utf8');
  }

  loadAll(): LedgerEntry[] {
    if (!existsSync(this.path)) {
      return [];
    }
    
    const content = readFileSync(this.path, 'utf8');
    return content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => JSON.parse(line));
  }

  clear(): void {
    if (existsSync(this.path)) {
      writeFileSync(this.path, '', 'utf8');
    }
  }
}
