'use strict';

hexo.extend.filter.register('after_render:html', function (html) {
  if (html.includes('class="footer-privacy"')) {
    return html;
  }

  return html.replace(
    /(<div class="footer-right">[\s\S]*?)(<\/div>)/,
    '$1<span class="footer-privacy"><a href="/privacy/">隐私政策</a></span>$2'
  );
});
