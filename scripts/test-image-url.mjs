import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildThumbnailUrl, rewriteMediaUrl } from '../sheep/url/image.mjs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const ossOrigin = 'https://static.teaworthshare.com';
const cdnUrl = 'https://img.teaworthshare.com';
const source = `${ossOrigin}/20260914/product.jpg`;

assert.equal(
  buildThumbnailUrl(source, {
    filesystem: 'aliyun',
    imageHosts: [ossOrigin, cdnUrl],
    width: 240,
    height: 240,
    quality: 80,
    format: 'webp',
  }),
  `${source}?x-oss-process=image/resize,m_lfit,w_240,h_240/quality,q_80/format,webp`,
);

assert.equal(
  buildThumbnailUrl(source, {
    filesystem: 'aliyun',
    imageHosts: [ossOrigin, cdnUrl],
    transformOrigin: env.SHOPRO_OSS_ORIGIN,
    width: 240,
    height: 240,
    quality: 80,
    format: 'webp',
  }),
  `${env.SHOPRO_OSS_ORIGIN}/20260914/product.jpg?x-oss-process=image/resize,m_lfit,w_240,h_240/quality,q_80/format,webp`,
  'CDN image URLs must use the configured OSS origin when CDN processing is unavailable',
);

assert.equal(
  buildThumbnailUrl(`${cdnUrl}/20260914/product.jpg`, {
    filesystem: 'qcloud',
    imageHosts: [ossOrigin, cdnUrl],
    transformOrigin: env.SHOPRO_OSS_ORIGIN,
    width: 240,
    height: 240,
    quality: 80,
    format: 'jpg',
  }),
  `${cdnUrl}/20260914/product.jpg?imageMogr2/thumbnail/240x240/rquality/80`,
  'non-OSS filesystems must not be redirected to the OSS origin',
);

assert.equal(
  buildThumbnailUrl(`${source}?version=1`, {
    filesystem: 'aliyun',
    imageHosts: [ossOrigin],
    width: 240,
    height: 240,
  }),
  `${source}?version=1&x-oss-process=image/resize,m_lfit,w_240,h_240/quality,q_90/format,webp`,
);

assert.doesNotThrow(() =>
  buildThumbnailUrl(source, { filesystem: 'aliyun', imageHosts: [ossOrigin] }),
);
assert.equal(
  buildThumbnailUrl('https://images.example.com/product.jpg', {
    filesystem: 'aliyun',
    imageHosts: [ossOrigin],
    width: 240,
    height: 240,
  }),
  'https://images.example.com/product.jpg',
);

assert.equal(rewriteMediaUrl(source, { cdnUrl, ossOrigin }), `${cdnUrl}/20260914/product.jpg`);
assert.equal(
  rewriteMediaUrl('https://images.example.com/product.jpg', { cdnUrl, ossOrigin }),
  'https://images.example.com/product.jpg',
);

assert.equal(
  rewriteMediaUrl('https://static.teaworthshare.com/20260914/product.jpg', {
    cdnUrl: env.SHOPRO_CDN_URL,
    ossOrigin: env.SHOPRO_OSS_ORIGIN,
  }),
  'https://static.teaworthshare.com/20260914/product.jpg',
  'production media URLs returned by the API must be rewritten to the CDN',
);

const signedUrl = `${ossOrigin}/private/product.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test`;
assert.equal(
  rewriteMediaUrl(signedUrl, { cdnUrl, ossOrigin }),
  signedUrl,
  'signed OSS URLs must not be rewritten to another host',
);
assert.equal(
  buildThumbnailUrl(signedUrl, {
    filesystem: 'aliyun',
    imageHosts: [ossOrigin],
    width: 240,
    height: 240,
  }),
  signedUrl,
  'signed OSS URLs must not receive extra image-processing query parameters',
);

console.log('image URL checks passed');
