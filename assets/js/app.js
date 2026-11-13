(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  // Resolve repository files from the script location, not the current URL path.
  // This works on both username.github.io/repo/ project pages and custom domains.
  const appScript = document.querySelector('script[src*="assets/js/app.js"]');
  const appScriptURL = appScript ? new URL(appScript.src, document.baseURI) : null;
  const siteRootURL = appScriptURL ? new URL('../../', appScriptURL) : new URL('./', document.baseURI);
  const siteURL = (path) => new URL(String(path).replace(/^\//, ''), siteRootURL).href;
  const state = {
    items: [],
    filtered: [],
    featuredItems: [],
    modalItems: [],
    tag: 'all',
    search: '',
    sort: 'featured',
    activeIndex: 0,
    heroIndex: 0,
    heroTimer: null,
    lastFocus: null
  };

  const els = {
    grid: $('#art-grid'),
    filters: $('#filter-chips'),
    search: $('#search-input'),
    sort: $('#sort-select'),
    count: $('#results-count'),
    empty: $('#empty-state'),
    modal: $('#art-modal'),
    modalImage: $('#modal-image'),
    modalTitle: $('#modal-title'),
    modalSource: $('#modal-source'),
    modalSize: $('#modal-size'),
    modalPrice: $('#modal-price')
  };

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  // Artwork files live in the repository. Only local assets/images paths are accepted.
  const safeImagePath = (value) => {
    if (typeof value !== 'string' || !value.startsWith('assets/images/')) return '';
    if (value.includes('..') || value.includes('\\') || /^https?:/i.test(value)) return '';
    return value;
  };

  const priceNumber = (price) => {
    const match = String(price ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
  };

  function itemTags(item) {
    const source = Array.isArray(item.tags) ? item.tags : (item.category ? [item.category] : []);
    return [...new Set(source.map((tag) => String(tag).trim()).filter(Boolean))];
  }

  async function loadConfig() {
    try {
      const response = await fetch(siteURL('data/site-config.json'), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Site settings returned ${response.status}`);
      const config = await response.json();
      const shopName = config.shopName || 'Frihavn';
      document.title = `${shopName} — Map Art Collection`;
      $$('[data-discord-link]').forEach((link) => {
        if (typeof config.discordUrl === 'string' && /^https:\/\//i.test(config.discordUrl)) {
          link.href = config.discordUrl;
        }
      });
      $$('[data-shop-name]').forEach((node) => { node.textContent = shopName; });
    } catch (error) {
      // The settings file is optional; catalogue rendering must never depend on it.
      console.warn('Using default Frihavn site settings.', error);
    }
  }

  function showCatalogueError(error) {
    console.error('Could not load the Frihavn catalogue:', error);
    const detail = error?.message ? ` (${escapeHTML(error.message)})` : '';
    els.grid.hidden = false;
    els.empty.hidden = true;
    els.grid.innerHTML = `<div class="loading-state load-error">The collection could not be loaded. Please check that <code>data/maparts.json</code> is committed in the repository and that the Pages deployment has finished${detail}.</div>`;
  }

  async function loadCatalogue() {
    let items;
    try {
      const response = await fetch(siteURL('data/maparts.json'), { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Catalogue request returned HTTP ${response.status} at ${response.url}`);
      items = await response.json();
      if (!Array.isArray(items)) throw new Error('data/maparts.json must contain a JSON array.');
      items = items.filter((item) => item && item.id && item.title && safeImagePath(item.image));
      if (!items.length) throw new Error('No valid map art entries were found. Each entry needs an id, title, and image path beginning with assets/images/.');
    } catch (error) {
      showCatalogueError(error);
      return;
    }

    // The catalogue is displayed before optional hero decoration is initialized.
    // A hero error can no longer replace a successfully loaded gallery with an error.
    state.items = items;
    state.filtered = [...items];
    renderFilters();
    renderGallery();

    try {
      renderHero();
    } catch (error) {
      console.error('The featured artwork panel could not be initialized:', error);
      const heroVisual = $('.hero-visual');
      if (heroVisual) heroVisual.hidden = true;
    }
  }

  function allTags() {
    const unique = new Map();
    state.items.forEach((item) => itemTags(item).forEach((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, tag);
    }));
    return [...unique.values()].sort((a, b) => a.localeCompare(b));
  }

  function renderFilters() {
    const labels = [{ name: 'All pieces', value: 'all' }, ...allTags().map((name) => ({ name, value: name }))];
    els.filters.innerHTML = labels.map(({ name, value }) => {
      const selected = state.tag.toLocaleLowerCase() === value.toLocaleLowerCase();
      return `<button class="filter-chip ${selected ? 'selected' : ''}" type="button" data-tag="${escapeHTML(value)}" aria-pressed="${selected}">${escapeHTML(name)}</button>`;
    }).join('');
  }

  function sortedItems(items) {
    const list = [...items];
    if (state.sort === 'title') list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    else if (state.sort === 'price-low') list.sort((a, b) => priceNumber(a.price) - priceNumber(b.price));
    else if (state.sort === 'price-high') list.sort((a, b) => priceNumber(b.price) - priceNumber(a.price));
    else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return list;
  }

  function cardMarkup(item) {
    const image = safeImagePath(item.image);
    return `
      <article class="art-card">
        <button class="card-image-button" type="button" data-open-art="${escapeHTML(item.id)}" aria-label="View ${escapeHTML(item.title)} enlarged">
          <img class="card-image" src="${escapeHTML(siteURL(image))}" alt="${escapeHTML(item.title)} map art" loading="lazy">
          <span class="card-image-overlay">VIEW ARTWORK <span>↗</span></span>
        </button>
        <div class="card-content">
          <p class="card-source">${escapeHTML(item.source || 'Frihavn collection')}</p>
          <h3>${escapeHTML(item.title)}</h3>
          <dl class="card-meta">
            <div><dt>SIZE</dt><dd>${escapeHTML(item.size || 'Not listed')}</dd></div>
            <div><dt>PRICE</dt><dd class="price-value">${escapeHTML(item.price || 'Ask for price')}</dd></div>
          </dl>
        </div>
      </article>`;
  }

  function renderGallery() {
    const query = state.search.trim().toLowerCase();
    const activeTag = state.tag.toLowerCase();
    const matches = state.items.filter((item) => {
      const itemTagList = itemTags(item);
      const tagMatch = state.tag === 'all' || itemTagList.some((tag) => tag.toLowerCase() === activeTag);
      const searchable = [item.title, item.source, item.size, item.price, ...itemTagList].join(' ').toLowerCase();
      return tagMatch && (!query || searchable.includes(query));
    });
    state.filtered = sortedItems(matches);
    els.grid.innerHTML = state.filtered.map(cardMarkup).join('');
    els.empty.hidden = state.filtered.length > 0;
    els.grid.hidden = state.filtered.length === 0;
    els.count.textContent = `Showing ${state.filtered.length} ${state.filtered.length === 1 ? 'piece' : 'pieces'}`;
  }

  function setHeroSlide(index, animate = false) {
    if (!state.featuredItems.length) return;
    const heroCard = $('[data-open-featured]');
    const heroImage = $('[data-hero-image]');
    const heroTitle = $('[data-hero-title]');
    const backOne = $('[data-hero-back-one]');
    const backTwo = $('[data-hero-back-two]');
    const applySlide = () => {
      const featured = state.featuredItems[index];
      const others = state.items.filter((item) => item.id !== featured.id);
      if (heroImage) heroImage.innerHTML = `<img src="${escapeHTML(siteURL(safeImagePath(featured.image)))}" alt="${escapeHTML(featured.title)} featured map art">`;
      if (heroTitle) heroTitle.textContent = featured.title;
      if (heroCard) {
        heroCard.dataset.openArt = featured.id;
        heroCard.setAttribute('aria-label', `Open ${featured.title} featured map art`);
      }
      if (backOne) backOne.innerHTML = others[0] ? `<img src="${escapeHTML(siteURL(safeImagePath(others[0].image)))}" alt="">` : '';
      if (backTwo) backTwo.innerHTML = others[1] ? `<img src="${escapeHTML(siteURL(safeImagePath(others[1].image)))}" alt="">` : '';
    };

    state.heroIndex = index;
    if (!animate) {
      applySlide();
      return;
    }
    heroCard.classList.add('is-transitioning');
    window.setTimeout(() => {
      applySlide();
      window.requestAnimationFrame(() => heroCard.classList.remove('is-transitioning'));
    }, 220);
  }

  function canRotateHero() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Keep the carousel moving while hovered; only pause when the tab is hidden,
    // reduced motion is requested, or the full-screen artwork viewer is open.
    return !document.hidden && !reducedMotion && els.modal.hidden;
  }

  function renderHero() {
    if (!state.items.length) return;
    const heroCard = $('[data-open-featured]');
    const heroVisual = $('.hero-visual');
    if (!heroCard || !heroVisual || ! $('[data-hero-image]') || ! $('[data-hero-title]')) return;

    state.featuredItems = state.items.filter((item) => Boolean(item.featured));
    if (!state.featuredItems.length) state.featuredItems = [...state.items];
    if (state.heroTimer) window.clearInterval(state.heroTimer);
    state.heroIndex = 0;
    setHeroSlide(0);

    if (state.featuredItems.length > 1) {
      state.heroTimer = window.setInterval(() => {
        if (!canRotateHero()) return;
        setHeroSlide((state.heroIndex + 1) % state.featuredItems.length, true);
      }, 4200);
    }
  }

  function updateModal() {
    const item = state.modalItems[state.activeIndex];
    if (!item) return;
    els.modalImage.src = siteURL(safeImagePath(item.image));
    els.modalImage.alt = `${item.title} map art enlarged`;
    els.modalTitle.textContent = item.title;
    els.modalSource.textContent = item.source || 'Frihavn collection';
    els.modalSize.textContent = item.size || 'Not listed';
    els.modalPrice.textContent = item.price || 'Ask for price';
    $('#modal-prev').disabled = state.modalItems.length < 2;
    $('#modal-next').disabled = state.modalItems.length < 2;
  }

  function openModal(id) {
    let modalItems = state.filtered;
    let index = modalItems.findIndex((item) => String(item.id) === String(id));
    if (index < 0) {
      modalItems = state.items;
      index = modalItems.findIndex((item) => String(item.id) === String(id));
    }
    if (index < 0) return;
    state.modalItems = modalItems;
    state.activeIndex = index;
    state.lastFocus = document.activeElement;
    updateModal();
    els.modal.hidden = false;
    els.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('.modal-close').focus();
  }

  function closeModal() {
    els.modal.hidden = true;
    els.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (state.lastFocus?.isConnected) state.lastFocus.focus();
  }

  function moveModal(direction) {
    if (state.modalItems.length < 2) return;
    state.activeIndex = (state.activeIndex + direction + state.modalItems.length) % state.modalItems.length;
    updateModal();
  }

  els.filters.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-tag]');
    if (!trigger) return;
    state.tag = trigger.dataset.tag;
    renderFilters();
    renderGallery();
  });

  // Delegate from the document so clicks on the image, overlay, or card button
  // all open the same viewer, including cards rendered after filtering.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest('[data-open-art], [data-open-featured]');
    if (!trigger || trigger.closest('#art-modal')) return;
    const id = trigger.dataset.openArt;
    if (id) {
      event.preventDefault();
      openModal(id);
    }
  });

  els.search.addEventListener('input', () => { state.search = els.search.value; renderGallery(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; renderGallery(); });

  $('#clear-filters').addEventListener('click', () => {
    state.tag = 'all';
    state.search = '';
    els.search.value = '';
    renderFilters();
    renderGallery();
  });

  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  $('#modal-prev').addEventListener('click', () => moveModal(-1));
  $('#modal-next').addEventListener('click', () => moveModal(1));

  document.addEventListener('keydown', (event) => {
    if (els.modal.hidden) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'ArrowLeft') moveModal(-1);
    if (event.key === 'ArrowRight') moveModal(1);
  });

  const menuToggle = $('.mobile-menu-toggle');
  const nav = $('#primary-nav');
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  $$('.primary-nav a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }));

  loadConfig();
  loadCatalogue();
})();
