// Lints the .ts and .tsx files that differ from a git ref, plus new untracked files.
// Usage: npm run lint:changed [-- <ref>]. The default ref is HEAD.
import { execFileSync, spawnSync } from 'node:child_process';

const ref = process.argv[2] ?? 'HEAD';
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);

const files = [
  ...git('diff', '--name-only', '--diff-filter=ACMR', '--relative', ref, '--', '.'),
  ...git('ls-files', '--others', '--exclude-standard'),
].filter((f) => /\.(ts|tsx)$/.test(f));

if (files.length === 0) {
  console.log(`No changed .ts or .tsx files since ${ref}.`);
  process.exit(0);
}

const result = spawnSync('npx', ['eslint', ...new Set(files)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
