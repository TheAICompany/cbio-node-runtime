import { rm } from 'node:fs/promises';

try {
  await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
} catch (error) {
  console.warn('clean-dist: failed to remove dist/', error);
  process.exitCode = 1;
}
