import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../pages/user/wallet/score.vue', import.meta.url), 'utf8');

assert.match(
  source,
  /<view class="ss-flex-col list-content">/,
  'score detail column must have a dedicated layout class',
);
assert.match(
  source,
  /\.list-content\s*\{[\s\S]*?flex:\s*1;[\s\S]*?min-width:\s*0;/,
  'score detail column must absorb remaining row width without forcing siblings out',
);
for (const amountClass of ['add', 'minus']) {
  assert.match(
    source,
    new RegExp(`\\.${amountClass}\\s*\\{[^}]*flex-shrink:\\s*0;[^}]*white-space:\\s*nowrap;`),
    `${amountClass} score must remain a single, non-shrinking line`,
  );
}

console.log('score layout checks passed');
