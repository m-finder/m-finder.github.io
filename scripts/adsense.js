'use strict';

const adsense = hexo.config.adsense || {};

if (adsense.enabled && adsense.client) {
  hexo.extend.injector.register(
    'head_end',
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.client}" crossorigin="anonymous"></script>`,
    'default'
  );
}
