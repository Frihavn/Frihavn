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
    heroTransitionTimer: null,
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
    modalPrice: $('#modal-price'),
    modalBadges: $('#modal-badges')
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

  // Display badges are separate from browse/filter tags. Use these for New,
  // Pre-order, Limited, or other short labels shown beside an artwork title.
  function itemBadges(item) {
    const source = Array.isArray(item.badges) ? item.badges : [];
    const badges = source.map((badge) => String(badge).trim()).filter(Boolean);
    // Show meaningful availability states beside the title, but avoid adding
    // an unnecessary "Available" label to every ordinary listing.
    if (item.status && String(item.status).toLowerCase() !== 'available') {
      badges.push(String(item.status).trim());
    }
    return [...new Set(badges.filter(Boolean))];
  }

  function badgeTone(label) {
    const value = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (/pre-?order/.test(value)) return 'badge-preorder';
    if (value === 'new' || value.startsWith('new-')) return 'badge-new';
    if (value.includes('limited')) return 'badge-limited';
    return 'badge-custom';
  }

  function badgesMarkup(item, extraClass = '') {
    const badges = itemBadges(item);
    if (!badges.length) return '';
    return `<span class="title-badges ${extraClass}">${badges.map((badge) => `<span class="art-badge ${badgeTone(badge)}">${escapeHTML(badge)}</span>`).join('')}</span>`;
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
          <div class="card-title-row">
            <h3>${escapeHTML(item.title)}</h3>
            ${badgesMarkup(item)}
          </div>
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
    const stage = $('.hero-carousel-stage');
    const heroImage = $('[data-hero-image]');
    const heroTitle = $('[data-hero-title]');
    const heroPrice = $('[data-hero-price]');
    const heroBadges = $('[data-hero-badges]');
    const dots = $('[data-hero-dots]');
    const total = state.featuredItems.length;
    const normalizedIndex = ((index % total) + total) % total;
    const at = (offset) => state.featuredItems[((normalizedIndex + offset) % total + total) % total];

    const paintSide = (side, item, itemIndex) => {
      const button = $(`[data-hero-side="${side}"]`);
      if (!button) return;
      if (!item || total < 2) {
        button.hidden = true;
        button.removeAttribute('data-hero-index');
        return;
      }
      button.hidden = false;
      button.dataset.heroIndex = String(itemIndex);
      button.setAttribute('aria-label', `Show ${item.title} as the featured artwork`);
      const imageWrap = side === 'prev' ? $('[data-hero-prev-image]') : $('[data-hero-next-image]');
      const title = side === 'prev' ? $('[data-hero-prev-title]') : $('[data-hero-next-title]');
      const price = side === 'prev' ? $('[data-hero-prev-price]') : $('[data-hero-next-price]');
      if (imageWrap) imageWrap.innerHTML = `<img src="${escapeHTML(siteURL(safeImagePath(item.image)))}" alt="${escapeHTML(item.title)} featured map art" loading="eager">`;
      if (title) title.textContent = item.title;
      if (price) price.textContent = item.price || 'Ask for price';
    };

    const applySlide = () => {
      const featured = state.featuredItems[normalizedIndex];
      const previous = at(-1);
      const next = at(1);
      const previousIndex = (normalizedIndex - 1 + total) % total;
      const nextIndex = (normalizedIndex + 1) % total;

      if (heroImage) heroImage.innerHTML = `<img src="${escapeHTML(siteURL(safeImagePath(featured.image)))}" alt="${escapeHTML(featured.title)} featured map art" loading="eager">`;
      if (heroTitle) heroTitle.textContent = featured.title;
      if (heroPrice) heroPrice.textContent = featured.price || 'Ask for price';
      if (heroBadges) heroBadges.innerHTML = badgesMarkup(featured, 'hero-title-badges');
      if (heroCard) {
        heroCard.dataset.openArt = featured.id;
        heroCard.setAttribute('aria-label', `Open ${featured.title} featured map art, ${featured.price || 'price on request'}`);
      }

      // Both side panels are selected from featuredItems only. The left slot
      // is always the previous featured entry and the right slot is the next;
      // modulo indexing makes the carousel a continuous circular sequence.
      paintSide('prev', previous, previousIndex);
      paintSide('next', next, nextIndex);

      if (dots) {
        $$('[data-hero-dot]', dots).forEach((dot, dotIndex) => {
          const selected = dotIndex === normalizedIndex;
          dot.classList.toggle('active', selected);
          dot.setAttribute('aria-pressed', String(selected));
        });
      }
    };

    state.heroIndex = normalizedIndex;
    if (!animate || !stage) {
      applySlide();
      return;
    }
    window.clearTimeout(state.heroTransitionTimer);
    stage.classList.add('is-transitioning');
    state.heroTransitionTimer = window.setTimeout(() => {
      applySlide();
      window.requestAnimationFrame(() => stage.classList.remove('is-transitioning'));
    }, 140);
  }

  function chooseHeroSlide(index) {
    setHeroSlide(index, true);
    // Restart the dwell interval after manual navigation.
    if (state.heroTimer) window.clearInterval(state.heroTimer);
    if (state.featuredItems.length > 1) {
      state.heroTimer = window.setInterval(() => {
        if (!canRotateHero()) return;
        setHeroSlide(state.heroIndex + 1, true);
      }, 4200);
    }
  }

  function canRotateHero() {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return !document.hidden && !reducedMotion && els.modal.hidden;
  }

  function renderHero() {
    const heroVisual = $('.hero-visual');
    const heroCard = $('[data-open-featured]');
    if (!heroVisual || !heroCard || ! $('[data-hero-image]') || ! $('[data-hero-title]')) return;

    // A piece is featured only when the JSON value is the boolean true.
    // Non-featured artwork never appears in the central OR side carousel slots.
    state.featuredItems = state.items.filter((item) => item.featured === true);
    if (!state.featuredItems.length) {
      heroVisual.hidden = true;
      if (state.heroTimer) window.clearInterval(state.heroTimer);
      return;
    }

    heroVisual.hidden = false;
    if (state.heroTimer) window.clearInterval(state.heroTimer);
    const dots = $('[data-hero-dots]');
    if (dots) {
      dots.innerHTML = state.featuredItems.map((item, index) =>
        `<button class="hero-carousel-dot${index === 0 ? ' active' : ''}" type="button" data-hero-dot="${index}" aria-label="Show ${escapeHTML(item.title)}" aria-pressed="${index === 0}"></button>`
      ).join('');
      dots.hidden = state.featuredItems.length < 2;
    }
    const controls = $('.hero-carousel-controls');
    if (controls) controls.hidden = state.featuredItems.length < 2;

    state.heroIndex = 0;
    setHeroSlide(0);
    if (state.featuredItems.length > 1) {
      state.heroTimer = window.setInterval(() => {
        if (!canRotateHero()) return;
        setHeroSlide(state.heroIndex + 1, true);
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
    if (els.modalBadges) els.modalBadges.innerHTML = badgesMarkup(item, 'modal-title-badges');
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

  // Featured-art carousel controls supplement the automatic rotation.
  $('[data-hero-prev]')?.addEventListener('click', () => chooseHeroSlide(state.heroIndex - 1));
  $('[data-hero-next]')?.addEventListener('click', () => chooseHeroSlide(state.heroIndex + 1));
  $$('[data-hero-side]').forEach((button) => button.addEventListener('click', () => {
    const targetIndex = Number(button.dataset.heroIndex);
    if (Number.isInteger(targetIndex)) chooseHeroSlide(targetIndex);
  }));
  $('[data-hero-dots]')?.addEventListener('click', (event) => {
    const dot = event.target.closest('[data-hero-dot]');
    if (dot) chooseHeroSlide(Number(dot.dataset.heroDot));
  });

  // Use a real scroll command rather than an in-page anchor. This always goes
  // to document position zero, regardless of whichever section was visited last.
  $('#back-to-top')?.addEventListener('click', () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

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
