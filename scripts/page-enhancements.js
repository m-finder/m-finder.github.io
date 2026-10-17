'use strict';

const PAGE_COMMENTS_MARKER = 'data-page-comments';
const SHUO_SOURCE = 'shuo/index.md';

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
  items.sort((left, right) => sortableDate(right.date) - sortableDate(left.date));

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

hexo.extend.filter.register('after_post_render', function (data) {
  const source = normaliseSource(data.source);

  if (source === SHUO_SOURCE) {
    const siteData = hexo.locals.get('data') || {};
    data.content = renderShuoshuo(siteData.shuoshuo);
  }

  if (data.comments === true && !source.startsWith('_posts/') && !data.content.includes(PAGE_COMMENTS_MARKER)) {
    const giscus = renderGiscus();
    if (giscus) {
      data.content += '\n' + giscus;
    }
  }

  return data;
});
