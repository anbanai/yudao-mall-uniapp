import assert from 'node:assert/strict';
import fs from 'node:fs';

const apiSource = fs.readFileSync(new URL('../sheep/api/infra/file.js', import.meta.url), 'utf8');
const uploaderSource = fs.readFileSync(
  new URL('../sheep/components/s-uploader/choose-and-upload-file.js', import.meta.url),
  'utf8',
);

assert.match(apiSource, /getFilePresignedUrl: \(name, directory, type\)/);
assert.match(apiSource, /type,/);
assert.match(
  uploaderSource,
  /getFilePresignedUrl\(\s*file\.name,\s*directory,\s*file\.type,?\s*\)/,
  'the presign request must include the selected file MIME type',
);
assert.match(
  uploaderSource,
  /header: presignedInfo\.uploadHeaders \|\|/,
  'the PUT request must send the headers returned by the signer',
);

console.log('direct upload header checks passed');
