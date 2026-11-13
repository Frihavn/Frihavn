(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    items: [],
    filtered: [],
    modalItems: [],
    category: 'all',
    search: '',
    sort: 'featured',
    activeIndex: 0,
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
    modalIndex: $('#modal-index')
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

  async function loadConfig() {
    try {
      const response = await fetch('data/site-config.json');
      if (!response.ok) return;
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
      console.warn('Using default site settings.', error);
    }
  }

  async function loadCatalogue() {
    try {
      const response = await fetch('data/maparts.json');
      if (!response.ok) throw new Error(`Catalogue returned ${response.status}`);
      const items = await response.json();
      if (!Array.isArray(items)) throw new Error('data/maparts.json must contain an array.');
      state.items = items.filter((item) => item && item.id && item.title && safeImagePath(item.image));
      state.filtered = [...state.items];
      renderFilters();
      renderHero();
      renderGallery();
    } catch (error) {
      console.error(error);
      els.grid.innerHTML = '<div class="loading-state">The collection could not be loaded. Check that <code>data/maparts.json</code> is valid and the site is opened through GitHub Pages or a local web server.</div>';
    }
  }

  const categories = () => [...new Set(state.items.map((item) => String(item.category || 'Other').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  function renderFilters() {
    const labels = [{ name: 'All pieces', value: 'all' }, ...categories().map((name) => ({ name, value: name }))];
    els.filters.innerHTML = labels.map(({ name, value }) => {
      const selected = state.category === value;
      return `<button class="filter-chip ${selected ? 'selected' : ''}" type="button" data-category="${escapeHTML(value)}" aria-pressed="${selected}">${escapeHTML(name)}</button>`;
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
          <img class="card-image" src="${escapeHTML(image)}" alt="${escapeHTML(item.title)} map art" loading="lazy">
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
    const matches = state.items.filter((item) => {
      const categoryMatch = state.category === 'all' || (item.category || 'Other') === state.category;
      const searchable = [item.title, item.source, item.size, item.price, item.category].join(' ').toLowerCase();
      return categoryMatch && (!query || searchable.includes(query));
    });
    state.filtered = sortedItems(matches);
    els.grid.innerHTML = state.filtered.map(cardMarkup).join('');
    els.empty.hidden = state.filtered.length > 0;
    els.grid.hidden = state.filtered.length === 0;
    els.count.textContent = `Showing ${state.filtered.length} ${state.filtered.length === 1 ? 'piece' : 'pieces'}`;
  }

  function renderHero() {
    if (!state.items.length) return;
    const featured = state.items.find((item) => item.featured) || state.items[0];
    const others = state.items.filter((item) => item.id !== featured.id);
    const heroImage = $('[data-hero-image]');
    heroImage.innerHTML = `<img src="${escapeHTML(safeImagePath(featured.image))}" alt="${escapeHTML(featured.title)} featured map art">`;
    $('[data-hero-title]').textContent = featured.title;
    $('[data-hero-total]').textContent = String(state.items.length).padStart(2, '0');
    const heroButton = $('[data-open-featured]');
    heroButton.dataset.openArt = featured.id;
    const backOne = $('[data-hero-back-one]');
    const backTwo = $('[data-hero-back-two]');
    if (others[0]) backOne.innerHTML = `<img src="${escapeHTML(safeImagePath(others[0].image))}" alt="">`;
    if (others[1]) backTwo.innerHTML = `<img src="${escapeHTML(safeImagePath(others[1].image))}" alt="">`;
  }

  function updateModal() {
    const item = state.modalItems[state.activeIndex];
    if (!item) return;
    els.modalImage.src = safeImagePath(item.image);
    els.modalImage.alt = `${item.title} map art enlarged`;
    els.modalTitle.textContent = item.title;
    els.modalSource.textContent = item.source || 'Frihavn collection';
    els.modalSize.textContent = item.size || 'Not listed';
    els.modalPrice.textContent = item.price || 'Ask for price';
    els.modalIndex.textContent = `${String(state.activeIndex + 1).padStart(2, '0')} / ${String(state.filtered.length).padStart(2, '0')}`;
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
    state.lastFocus?.focus?.();
  }

  function moveModal(direction) {
    if (state.modalItems.length < 2) return;
    state.activeIndex = (state.activeIndex + direction + state.modalItems.length) % state.modalItems.length;
    updateModal();
  }

  els.filters.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-category]');
    if (!trigger) return;
    state.category = trigger.dataset.category;
    renderFilters();
    renderGallery();
  });

  els.grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-art]');
    if (trigger) openModal(trigger.dataset.openArt);
  });

  els.search.addEventListener('input', () => { state.search = els.search.value; renderGallery(); });
  els.sort.addEventListener('change', () => { state.sort = els.sort.value; renderGallery(); });
  $('[data-open-featured]').addEventListener('click', (event) => openModal(event.currentTarget.dataset.openArt));

  $('#clear-filters').addEventListener('click', () => {
    state.category = 'all';
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
