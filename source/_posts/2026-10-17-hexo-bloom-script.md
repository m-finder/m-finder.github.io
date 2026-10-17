---
title: hexo bloom 模板脚本式修改备忘-扩展相册、评论和说说
date: 2026-10-17 09:40:00
tags:
- hexo
- js
categories:
- hexo
---

之前一直在用 [butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 模板, 但是挂谷歌广告的时候一直嫌我文字不够多, 挑来拣去看中了 [bloom](https://github.com/winmin/hexo-theme-Bloom).

模板很简约, 我很喜欢, 但在配置过程中发现一些问题:
1. 通过 `_config.Bloom.yml` 的配置形式部署菜单时, 无法覆盖默认菜单, 最后通过 script 覆盖了.
```
hexo.on('generateBefore', function () {
    hexo.theme.config.nav = {
        "首页": "/",
        "分类": "/categories/",
        "标签": "/tags/",
        "归档": "/archives/",
        "说说": "/shuo/",
        "书单": "/books/",
        "电影": "/movies/",
        "游戏": "/games/",
        "友情链接": "/link/",
        "关于": "/about/",
        "RSS": "/atom.xml"
    };
})
```
2. 相册和说说没了, bloom 没有对应的渲染器
3. 关于和友情链接页面没有评论
```
'use strict';

const PAGE_COMMENTS_MARKER = 'data-page-comments';
const SHUO_SOURCE = 'shuo/index.md';
const GALLERY_INDEX_SOURCE = 'gallery/index.md';
const GALLERY_WORLD_SOURCE = 'gallery/world.md';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normaliseSource(source) {
  return String(source || '').replace(/\\/g, '/');
}

function renderGiscus() {
  const comments = hexo.theme.config.comments || {};
  const giscus = comments.giscus || {};

  if (!comments.enabled || comments.provider !== 'giscus' || !giscus.repo) {
    return '';
  }

  const language = Array.isArray(hexo.config.language)
    ? hexo.config.language[0]
    : hexo.config.language || 'en';

  return [
    '<section class="comments-section" data-page-comments>',
    '  <h3 class="comments-title">评论</h3>',
    '  <script src="https://giscus.app/client.js"',
    `          data-repo="${escapeHtml(giscus.repo)}"`,
    `          data-repo-id="${escapeHtml(giscus.repo_id)}"`,
    `          data-category="${escapeHtml(giscus.category)}"`,
    `          data-category-id="${escapeHtml(giscus.category_id)}"`,
    '          data-mapping="pathname"',
    '          data-strict="0"',
    '          data-reactions-enabled="1"',
    '          data-emit-metadata="0"',
    '          data-input-position="bottom"',
    '          data-theme="dark"',
    `          data-lang="${escapeHtml(language)}"`,
    '          crossorigin="anonymous"',
    '          async>',
    '  </script>',
    '</section>'
  ].join('\n');
}

function sortableDate(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  const timestamp = Date.parse(String(value || ''));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value) {
  if (value instanceof Date) {
    const pad = (number) => String(number).padStart(2, '0');
    return [
      value.getUTCFullYear(),
      pad(value.getUTCMonth() + 1),
      pad(value.getUTCDate())
    ].join('-') + ' ' + [pad(value.getUTCHours()), pad(value.getUTCMinutes())].join(':');
  }

  return String(value || '');
}

function renderShuoContent(content) {
  try {
    return hexo.render.renderSync({
      text: String(content || ''),
      engine: 'markdown'
    }).trim();
  } catch (error) {
    return '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
  }
}

function renderShuoshuo(entries) {
  const items = Array.isArray(entries) ? entries.slice() : [];
  items.sort((left, right) => sortableDate(left.date) - sortableDate(right.date));

  const timeline = items.map((item) => {
    const author = escapeHtml(item.author || hexo.config.author || 'M-finder');
    const avatar = escapeHtml(item.avatar || '/images/avatar.jpeg');
    const date = escapeHtml(formatDate(item.date));
    const content = renderShuoContent(item.content);

    return [
      '  <li class="shuo-item">',
      `    <img class="shuo-avatar" src="${avatar}" alt="${author}" loading="lazy">`,
      '    <div class="shuo-entry">',
      `      <div class="shuo-meta"><strong>${author}</strong><time>${date}</time></div>`,
      `      <div class="shuo-content">${content}</div>`,
      '    </div>',
      '  </li>'
    ].join('\n');
  }).join('\n');

  return [
    '<section class="shuo-feed" aria-label="说说">',
    '  <style>',
    '    .shuo-timeline { list-style: none; margin: 1.5rem 0 0; padding: 0; }',
    '    .shuo-item { border-left: 1px solid #3a4351; min-height: 3.5rem; padding: 0 0 1.75rem 2.75rem; position: relative; }',
    '    .shuo-item:last-child { border-left-color: transparent; padding-bottom: 0; }',
    '    .shuo-avatar { border-radius: 50%; height: 2rem; left: -1rem; object-fit: cover; position: absolute; top: 0; width: 2rem; }',
    '    .shuo-meta { align-items: baseline; display: flex; flex-wrap: wrap; gap: .5rem; line-height: 1.5; }',
    '    .shuo-meta time { color: #8c96a4; font-size: .85em; }',
    '    .shuo-content { margin-top: .35rem; }',
    '    .shuo-content p { margin: 0; }',
    '  </style>',
    '  <ol class="shuo-timeline">',
    timeline || '    <li class="shuo-empty">暂无说说。</li>',
    '  </ol>',
    '</section>'
  ].join('\n');
}

function galleryStyles() {
  return [
    '<style>',
    '  .gallery-albums, .gallery-grid { display: grid; gap: 1rem; }',
    '  .gallery-albums { grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); margin: 1.5rem 0; }',
    '  .gallery-album { border: 1px solid #3a4351; color: inherit; display: block; text-decoration: none; }',
    '  .gallery-album:hover { border-color: #7d8da1; }',
    '  .gallery-album img { aspect-ratio: 16 / 9; display: block; object-fit: cover; width: 100%; }',
    '  .gallery-album-copy { padding: .9rem 1rem 1rem; }',
    '  .gallery-album-title { font-size: 1.1rem; font-weight: 700; }',
    '  .gallery-album-description { color: #8c96a4; margin-top: .35rem; }',
    '  .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); margin: 1.5rem 0; }',
    '  .gallery-item { background: #151a21; display: block; overflow: hidden; }',
    '  .gallery-item img { aspect-ratio: 1 / 1; display: block; object-fit: cover; transition: transform .2s ease; width: 100%; }',
    '  .gallery-item:hover img, .gallery-item:focus-visible img { transform: scale(1.04); }',
    '  .gallery-lightbox { align-items: center; background: rgba(0, 0, 0, .9); border: 0; box-sizing: border-box; height: 100%; justify-content: center; max-height: none; max-width: none; padding: 1.5rem; width: 100%; }',
    '  .gallery-lightbox[open] { display: flex; }',
    '  .gallery-lightbox::backdrop { background: rgba(0, 0, 0, .9); }',
    '  .gallery-lightbox img { max-height: calc(100vh - 3rem); max-width: calc(100vw - 3rem); object-fit: contain; }',
    '  .gallery-lightbox-close { background: rgba(0, 0, 0, .7); border: 1px solid #aeb8c7; color: #fff; cursor: pointer; font-size: 1.5rem; height: 2.5rem; line-height: 1; position: fixed; right: 1rem; top: 1rem; width: 2.5rem; }',
    '  @media (max-width: 480px) { .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; } }',
    '</style>'
  ].join('\n');
}

function renderGalleryIndex(albums) {
  const items = Array.isArray(albums) ? albums : [];
  const cards = items.map((album) => {
    const title = escapeHtml(album.title || '未命名相册');
    const description = escapeHtml(album.description || '');
    const path = escapeHtml(album.path || '/gallery/');
    const cover = escapeHtml(album.cover || '/images/top.jpg');

    return [
      `  <a class="gallery-album" href="${path}">`,
      `    <img src="${cover}" alt="${title}" loading="lazy">`,
      '    <div class="gallery-album-copy">',
      `      <div class="gallery-album-title">${title}</div>`,
      description ? `      <div class="gallery-album-description">${description}</div>` : '',
      '    </div>',
      '  </a>'
    ].filter(Boolean).join('\n');
  }).join('\n');

  return [
    galleryStyles(),
    '<section class="gallery-albums" aria-label="相册">',
    cards || '  <p>暂无相册。</p>',
    '</section>'
  ].join('\n');
}

function imageAttributes(tag) {
  const source = tag.match(/\bsrc=(['"])(.*?)\1/i);
  const alt = tag.match(/\balt=(['"])(.*?)\1/i);
  return {
    src: source ? source[2] : '',
    alt: alt ? alt[2] : ''
  };
}

function renderGalleryWorld(content) {
  const images = String(content || '').match(/<img\b[^>]*>/gi) || [];
  const items = images.map((tag, index) => {
    const image = imageAttributes(tag);
    if (!image.src) {
      return '';
    }

    const source = escapeHtml(image.src);
    const alt = escapeHtml(image.alt || `相册图片 ${index + 1}`);
    return [
      `  <a class="gallery-item" href="${source}" data-gallery-lightbox>`,
      `    <img src="${source}" alt="${alt}" loading="lazy">`,
      '  </a>'
    ].join('\n');
  }).filter(Boolean).join('\n');

  return [
    galleryStyles(),
    '<section class="gallery-grid" aria-label="花花世界">',
    items || '  <p>暂无图片。</p>',
    '</section>',
    '<dialog class="gallery-lightbox" data-gallery-dialog>',
    '  <button class="gallery-lightbox-close" type="button" data-gallery-close aria-label="关闭图片">&times;</button>',
    '  <img src="" alt="" data-gallery-dialog-image>',
    '</dialog>',
    '<script>',
    '  (() => {',
    '    if (window.__galleryLightboxBound) return;',
    '    window.__galleryLightboxBound = true;',
    '    document.addEventListener("click", (event) => {',
    '      const item = event.target.closest("[data-gallery-lightbox]");',
    '      if (item) {',
    '        const dialog = document.querySelector("[data-gallery-dialog]");',
    '        const image = dialog && dialog.querySelector("[data-gallery-dialog-image]");',
    '        if (!dialog || !image || typeof dialog.showModal !== "function") return;',
    '        event.preventDefault();',
    '        image.src = item.href;',
    '        image.alt = item.querySelector("img").alt;',
    '        dialog.showModal();',
    '      }',
    '      const closeButton = event.target.closest("[data-gallery-close]");',
    '      if (closeButton) closeButton.closest("dialog").close();',
    '    });',
    '  })();',
    '</script>'
  ].join('\n');
}

hexo.extend.filter.register('after_post_render', function (data) {
  const source = normaliseSource(data.source);

  if (source === SHUO_SOURCE) {
    const siteData = hexo.locals.get('data') || {};
    data.content = renderShuoshuo(siteData.shuoshuo);
  }

  if (source === GALLERY_INDEX_SOURCE) {
    const siteData = hexo.locals.get('data') || {};
    data.content = renderGalleryIndex(siteData.gallery && siteData.gallery.albums);
  }

  if (source === GALLERY_WORLD_SOURCE) {
    data.content = renderGalleryWorld(data.content);
  }

  if (data.comments === true && !source.startsWith('_posts/') && !data.content.includes(PAGE_COMMENTS_MARKER)) {
    const giscus = renderGiscus();
    if (giscus) {
      data.content += '\n' + giscus;
    }
  }

  return data;
});
```

再次感谢强大的 codex, 感谢 cc, 感谢 av, 我想要的都回来了.