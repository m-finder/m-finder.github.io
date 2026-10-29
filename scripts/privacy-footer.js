'use strict';

hexo.extend.filter.register('after_render:html', function (html) {
  if (html.includes('class="footer-privacy"')) {
    return html;
  }

  return html.replace(
    /(<div class="footer-right">[\s\S]*?)(<\/div>)/,
    '$1<span class="footer-privacy"><a href="/privacy/">隐私政策</a></span>' +
    '<a href="https://www.foreverblog.cn/" target="_blank" rel="noopener noreferrer" title="十年之约成员博客"><img src="https://www.foreverblog.cn/assets/logo/logo_v2_light.png" alt="十年之约" style="width:auto;height:32px;"></a>$2'
  );
});
