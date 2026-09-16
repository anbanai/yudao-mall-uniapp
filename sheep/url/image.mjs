const DEFAULT_OPTIONS = {
  width: 200,
  height: 200,
  mode: 'lfit',
  quality: 90,
  format: 'webp',
  gravity: 'center',
};

const SIGNED_QUERY_KEYS = new Set([
  'x-amz-algorithm',
  'x-amz-credential',
  'x-amz-date',
  'x-amz-expires',
  'x-amz-security-token',
  'x-amz-signature',
  'x-amz-signedheaders',
  'ossaccesskeyid',
  'signature',
  'expires',
  'security-token',
]);

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isTransformable(url, imageHosts = []) {
  const hostname = getHostname(url);
  return hostname !== '' && imageHosts.some((host) => getHostname(host) === hostname);
}

export function isSignedMediaUrl(url = '') {
  try {
    const parsed = new URL(url);
    for (const key of parsed.searchParams.keys()) {
      if (SIGNED_QUERY_KEYS.has(key.toLowerCase())) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Replace the configured OSS origin with the public CDN hostname while
 * preserving the object path, query string, and fragment.
 */
export function rewriteMediaUrl(url = '', { cdnUrl = '', ossOrigin = '' } = {}) {
  if (!url || !cdnUrl || !ossOrigin || isSignedMediaUrl(url)) return url;

  try {
    const source = new URL(url);
    const origin = new URL(ossOrigin);
    if (source.origin !== origin.origin) return url;

    const target = new URL(cdnUrl);
    target.pathname = source.pathname;
    target.search = source.search;
    target.hash = source.hash;
    return target.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Append an image transformation query supported by the configured storage.
 * Unknown hosts are intentionally left untouched.
 */
export function buildThumbnailUrl(url = '', options = {}) {
  if (!url) return '';
  if (isSignedMediaUrl(url)) return url;

  const config = { ...DEFAULT_OPTIONS, ...options };
  if (config.filesystem === 'public' || !isTransformable(url, config.imageHosts)) {
    return url;
  }

  let suffix = '';
  const width = config.width;
  const height = config.height;
  const size = width && height ? `w_${width},h_${height}` : width ? `w_${width}` : '';
  const quality =
    Number(config.quality) > 0 && Number(config.quality) < 100
      ? `/quality,q_${Number(config.quality)}`
      : '';
  const format = config.format ? `/format,${config.format}` : '';

  switch (config.filesystem) {
    case 'aliyun': {
      let mode = config.mode || 'lfit';
      let crop = '';
      if (config.gravity && config.gravity !== 'center') {
        mode = 'mfit';
        const gravity = {
          north_west: 'nw',
          north: 'north',
          north_east: 'ne',
          west: 'west',
          east: 'east',
          south_west: 'sw',
          south: 'south',
          south_east: 'se',
        }[config.gravity];
        if (gravity && width && height) {
          crop = `/crop,g_${gravity},w_${width},h_${height}`;
        }
      }
      suffix = `x-oss-process=image/resize,m_${mode}${
        size ? `,${size}` : ''
      }${crop}${quality}${format}`;
      break;
    }
    case 'qcloud': {
      const qcloudSize = width && height ? `${width}x${height}` : width ? `${width}` : '';
      const qcloudQuality = quality ? `/rquality/${Number(config.quality)}` : '';
      suffix = `imageMogr2/thumbnail/${qcloudSize}${qcloudQuality}`;
      break;
    }
    case 'qiniu': {
      const qiniuSize = width && height ? `${width}x${height}>` : width ? `${width}>` : '';
      const qiniuQuality = quality ? `/quality/${Number(config.quality)}` : '';
      suffix = `imageMogr2/thumbnail/${qiniuSize}${qiniuQuality}`;
      break;
    }
    default:
      return url;
  }

  if (!suffix) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${suffix}`;
}
