import $store from '@/sheep/store';
import { staticUrl } from '@/sheep/config';
import { buildThumbnailUrl, rewriteMediaUrl, isSignedMediaUrl } from './image.mjs';

const getMediaConfig = () => {
  const info = $store('app').info || {};
  return {
    cdnUrl: info.cdnurl || staticUrl || '',
    ossOrigin: info.ossOrigin || '',
    filesystem: info.filesystem || 'public',
  };
};

const cdn = (url = '', cdnurl = '') => {
  if (!url) return '';
  const config = getMediaConfig();
  if (url.indexOf('http') === 0) {
    return rewriteMediaUrl(url, {
      cdnUrl: cdnurl || config.cdnUrl,
      ossOrigin: config.ossOrigin,
    });
  }
  if (cdnurl === '') {
    cdnurl = config.cdnUrl;
  }
  return cdnurl + url;
};

export default {
  // 添加cdn域名前缀
  cdn,
  // 对象存储自动剪裁缩略图
  thumb: (url = '', params = {}) => {
    const config = getMediaConfig();
    const resolvedUrl = cdn(url);
    return buildThumbnailUrl(resolvedUrl, {
      ...params,
      filesystem: config.filesystem,
      imageHosts: [config.cdnUrl, config.ossOrigin],
      transformOrigin:
        params.transformOrigin === true ? config.ossOrigin : params.transformOrigin || '',
    });
  },
  isSigned: isSignedMediaUrl,
  // 静态资源地址
  static: (url = '', staticurl = '') => {
    if (staticurl === '') {
      staticurl = staticUrl;
    }
    if (staticurl !== 'local') {
      url = cdn(url, staticurl);
    }
    return url;
  },
  // css背景图片地址
  css: (url = '', staticurl = '') => {
    if (staticurl === '') {
      staticurl = staticUrl;
    }
    if (staticurl !== 'local') {
      url = cdn(url, staticurl);
    }
    // #ifdef APP-PLUS
    if (staticurl === 'local') {
      url = plus.io.convertLocalFileSystemURL(url);
    }
    // #endif
    return `url(${url})`;
  },
};
