(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const swatches = Array.from(document.querySelectorAll('.particle-swatch'));
  const validColor = value => /^#[0-9a-f]{6}$/i.test(value || '');
  let particleColors = [34, 168, 121, 120, 214, 160];
  function selectParticle(name) {
    const swatch = swatches.find(item => item.dataset.particleName === name) || swatches[0];
    if (!swatch || !validColor(swatch.dataset.particleFrom) || !validColor(swatch.dataset.particleTo)) return;
    particleColors = [swatch.dataset.particleFrom, swatch.dataset.particleTo].flatMap(color => [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)));
    swatches.forEach(item => item.setAttribute('aria-pressed', String(item === swatch)));
    window.dispatchEvent(new Event('giorgio-particle-change'));
  }
  let savedParticle;
  try { savedParticle = localStorage.getItem('giorgio-particle'); } catch (_) {}
  selectParticle(savedParticle || root.dataset.particleDefault);
  swatches.forEach(swatch => swatch.addEventListener('click', () => {
    selectParticle(swatch.dataset.particleName);
    try { localStorage.setItem('giorgio-particle', swatch.dataset.particleName); } catch (_) {}
  }));
  const currentMode = () => root.dataset.mode === 'auto' ? (media.matches ? 'dark' : 'light') : root.dataset.mode;
  function syncTheme() {
    toggle.querySelector('.theme-icon').innerHTML = currentMode() === 'dark' ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>' : '<path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z"/>';
    toggle.title = currentMode() === 'dark' ? '切换为浅色背景' : '切换为深色背景';
    const giscus = document.querySelector('iframe.giscus-frame');
    if (giscus && giscus.contentWindow) giscus.contentWindow.postMessage({giscus:{setConfig:{theme:currentMode()}}}, 'https://giscus.app');
  }
  toggle.addEventListener('click', () => {
    root.dataset.mode = currentMode() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('giorgio-mode', root.dataset.mode); } catch (_) {}
    syncTheme();
  });
  media.addEventListener('change', syncTheme);
  syncTheme();
  const comments = document.querySelector('.comments');
  if (comments) {
    const attachGiscus = () => {
      const frame = comments.querySelector('iframe.giscus-frame');
      if (!frame) return false;
      frame.addEventListener('load', syncTheme);
      syncTheme();
      return true;
    };
    if (!attachGiscus()) {
      const observer = new MutationObserver(() => {
        if (attachGiscus()) observer.disconnect();
      });
      observer.observe(comments, { childList: true, subtree: true });
    }
  }

  const backLink = document.querySelector('.article-header .back-link');
  if (backLink) backLink.addEventListener('click', event => {
    if (window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  });

  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    const syncBackToTop = () => backToTop.classList.toggle('is-visible', window.scrollY > 400);
    window.addEventListener('scroll', syncBackToTop, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    syncBackToTop();
  }

  const dots = document.querySelector('.background-dots');
  if (dots && dots.getContext && window.matchMedia('(pointer: fine)').matches) {
    const context = dots.getContext('2d', { alpha: true });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const radius = 270;
    let width = 0, height = 0, ratio = 1, frame = 0;
    let pointerX = -radius, pointerY = -radius, pointerVisible = false;
    let scrollPosition = window.scrollY;
    function resizeDots() {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      dots.width = Math.round(width * ratio);
      dots.height = Math.round(height * ratio);
      dots.style.width = `${width}px`;
      dots.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintDots();
    }
    function paintDots() {
      frame = 0;
      context.clearRect(0, 0, width, height);
      if (!pointerVisible) return;
      const spacing = 11;
      const shift = motion.matches ? 0 : scrollPosition * 0.18;
      const dark = currentMode() === 'dark';
      const left = Math.max(0, Math.floor((pointerX - radius) / spacing) * spacing);
      const right = Math.min(width, pointerX + radius);
      const top = Math.max(0, Math.floor((pointerY - radius) / spacing) * spacing);
      const bottom = Math.min(height, pointerY + radius);
      for (let y = top; y <= bottom; y += spacing) {
        for (let x = left; x <= right; x += spacing) {
          const distance = Math.hypot(x - pointerX, y - pointerY);
          if (distance >= radius) continue;
          const fade = Math.pow(1 - distance / radius, 1.6);
          const wave = 0.78 + 0.22 * Math.sin(x * 0.03 + y * 0.018 + shift * 0.012);
          const blend = Math.max(0, Math.min(1, (x - pointerX + radius) / (radius * 2)));
          const color = [0, 1, 2].map(index => Math.round(particleColors[index] * (1 - blend) + particleColors[index + 3] * blend)).join(',');
          context.fillStyle = `rgba(${color},${(fade * wave * (dark ? 0.27 : 0.32)).toFixed(3)})`;
          context.beginPath();
          context.arc(x, y, 1.15, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
    function scheduleDots() {
      if (!frame) frame = requestAnimationFrame(paintDots);
    }
    window.addEventListener('resize', resizeDots, { passive: true });
    window.addEventListener('pointermove', event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerVisible = true;
      scheduleDots();
    }, { passive: true });
    document.addEventListener('pointerleave', () => {
      pointerVisible = false;
      scheduleDots();
    });
    window.addEventListener('scroll', () => {
      scrollPosition = window.scrollY;
      if (!motion.matches) scheduleDots();
    }, { passive: true });
    media.addEventListener('change', scheduleDots);
    window.addEventListener('giorgio-particle-change', scheduleDots);
    motion.addEventListener('change', scheduleDots);
    toggle.addEventListener('click', scheduleDots);
    resizeDots();
  }

  const menu = document.getElementById('site-nav');
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  mobileToggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  });
  document.querySelectorAll('.nav-group-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.closest('.nav-group');
      const open = group.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
      document.querySelectorAll('.nav-group').forEach(other => {
        if (other !== group) { other.classList.remove('is-open'); other.querySelector('button').setAttribute('aria-expanded', 'false'); }
      });
    });
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-group')) document.querySelectorAll('.nav-group').forEach(group => {
      group.classList.remove('is-open'); group.querySelector('button').setAttribute('aria-expanded', 'false');
    });
  });

  const glow = document.querySelector('.cursor-glow');
  function updateGlowColor() {
    const hour = new Date().getHours();
    const glowColor = hour >= 19 || hour < 6 ? 'rgba(143,207,167,.09)' : hour >= 11 && hour < 17 ? 'rgba(169,206,219,.08)' : 'rgba(193,177,220,.08)';
    root.style.setProperty('--glow', glowColor);
  }
  updateGlowColor();
  setInterval(updateGlowColor, 60_000);
  if (glow && window.matchMedia('(pointer:fine)').matches) {
    let x = 0, y = 0, raf = 0;
    document.addEventListener('pointermove', event => {
      x = event.clientX; y = event.clientY;
      document.body.classList.add('has-pointer');
      if (!raf) raf = requestAnimationFrame(() => { glow.style.left = `${x}px`; glow.style.top = `${y}px`; raf = 0; });
    }, {passive:true});
    document.addEventListener('pointerleave', () => document.body.classList.remove('has-pointer'));
  }

  const searchInput = document.getElementById('site-search-input');
  const searchResults = document.getElementById('site-search-results');
  if (searchInput && searchResults) {
    let indexPromise;
    let queryToken = 0;
    const loadIndex = () => indexPromise || (indexPromise = fetch(searchInput.dataset.searchIndex)
      .then(response => {
        if (!response.ok) throw new Error('search index unavailable');
        return response.json();
      }).catch(() => { indexPromise = null; return null; }));
    function closeSearch() {
      searchResults.hidden = true;
      searchInput.setAttribute('aria-expanded', 'false');
    }
    function showMessage(message) {
      searchResults.replaceChildren();
      const item = document.createElement('p');
      item.className = 'search-message';
      item.textContent = message;
      searchResults.append(item);
      searchResults.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
    }
    async function search() {
      const term = searchInput.value.trim().toLocaleLowerCase();
      const token = ++queryToken;
      if (!term) { closeSearch(); return; }
      const index = await loadIndex();
      if (token !== queryToken) return;
      if (!index) { showMessage('搜索暂时不可用。'); return; }
      const words = term.split(/\s+/).filter(Boolean);
      const matches = index.filter(item => {
        const haystack = [item.title, item.text, ...(item.categories || []), ...(item.tags || [])].join(' ').toLocaleLowerCase();
        return words.every(word => haystack.includes(word));
      }).slice(0, 8);
      if (!matches.length) { showMessage('没有找到相关文章。'); return; }
      searchResults.replaceChildren();
      matches.forEach(item => {
        const link = document.createElement('a');
        link.className = 'search-result';
        link.href = item.url;
        const title = document.createElement('strong');
        title.textContent = item.title;
        const date = document.createElement('time');
        date.textContent = item.date;
        link.append(title, date);
        searchResults.append(link);
      });
      searchResults.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
    }
    searchInput.addEventListener('input', search);
    searchInput.closest('form').addEventListener('submit', event => {
      event.preventDefault();
      const first = searchResults.querySelector('a');
      if (first) window.location.href = first.href;
    });
    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.focus();
      } else if (event.key === 'Escape') {
        closeSearch();
        searchInput.blur();
      }
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.home-search')) closeSearch();
    });
  }

  const gallery = document.querySelector('.gallery-content');
  const lightbox = document.getElementById('lightbox');
  if (gallery && lightbox) {
    const images = Array.from(gallery.querySelectorAll('img'));
    images.forEach(image => {
      if (!image.closest('a')) {
        const link = document.createElement('a');
        link.href = image.currentSrc || image.src;
        image.parentNode.insertBefore(link, image);
        link.appendChild(image);
      }
    });
    let current = 0;
    const display = index => {
      current = (index + images.length) % images.length;
      lightbox.querySelector('img').src = images[current].currentSrc || images[current].src;
      lightbox.querySelector('img').alt = images[current].alt || `相册图片 ${current + 1}`;
    };
    gallery.addEventListener('click', event => {
      const image = event.target.closest('img');
      if (!image) return;
      event.preventDefault();
      display(images.indexOf(image));
      lightbox.showModal();
    });
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => display(current - 1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => display(current + 1));
    lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
    document.addEventListener('keydown', event => {
      if (!lightbox.open) return;
      if (event.key === 'ArrowLeft') display(current - 1);
      if (event.key === 'ArrowRight') display(current + 1);
    });
  }
})();
