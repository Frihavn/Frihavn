(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = {
    items: [],
    filtered: [],
    category: 'all',
    search: '',
    sort: 'featured',
    activeIndex: 0,
    lastFocus: null
  };

  const elements = {
    grid: $('#art-grid'),
    filters: $('#filter-chips'),
    search: $('#search-input'),
    sort: $('#sort-select'),
    count: $('#results-count'),
    empty: $('#empty-state'),
    modal: $('#art-modal'),
    modalImage: $('#modal-image'),
    modalTitle: $('#modal-title'),
    modalDescription: $('#modal-description'),
    modalSource: $('#modal-source'),
    modalSize: $('#modal-size'),
    modalPrice: $('#modal-price'),
    modalStatus: $('#modal-status'),
    modalIndex: $('#modal-index')
  };

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const safeImageData = (value) => {
    if (typeof value !== 'string') return '';
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value) ? value : '';
  };

  const priceNumber = (price) => {
    const match = String(price ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
  };

  const updateConfig = async () => {
    try {
      const response = await fetch('data/site-config.json', { cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      if (config.shopName) {
        $$('[data-shop-name]').forEach((el) => { el.textContent = config.shopName; });
        document.title = `${config.shopName} — In-game map art gallery`;
      }
      if (config.discordUrl && /^https:\/\//i.test(config.discordUrl)) {
        $$('[data-discord-link]').forEach((el) => { el.href = config.discordUrl; });
      }
    } catch (error) {
      console.info('Using default site settings.', error);
    }
  };

  const loadCatalogue = async () => {
    try {
      const response = await fetch('data/maparts.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalogue returned ${response.status}`);
      const items = await response.json();
      if (!Array.isArray(items)) throw new Error('The catalogue JSON must contain an array of artwork entries.');
      state.items = items.filter((item) => item && item.id && item.title);
      state.filtered = [...state.items];
      $('#total-count')?.replaceChildren(document.createTextNode(String(state.items.length).padStart(2, '0')));
      const total = $('[data-total-count]');
      if (total) total.textContent = String(state.items.length).padStart(2, '0');
      const allCount = $('[data-all-count]');
      if (allCount) allCount.textContent = String(state.items.length).padStart(2, '0');
      renderFilters();
      renderHero();
      renderGallery();
    } catch (error) {
      console.error(error);
      elements.grid.innerHTML = '<div class="loading-state">The catalogue could not be loaded. Check that <code>data/maparts.json</code> is valid JSON and open the site through a local web server or GitHub Pages.</div>';
    }
  };

  const categories = () => [...new Set(state.items.map((item) => String(item.category || 'Other').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const renderFilters = () => {
    const allLabel = `<button class="filter-chip ${state.category === 'all' ? 'selected' : ''}" type="button" data-category="all" aria-pressed="${state.category === 'all'}">All pieces <span>${String(state.items.length).padStart(2, '0')}</span></button>`;
    const categoryLabels = categories().map((category) => {
      const count = state.items.filter((item) => (item.category || 'Other') === category).length;
      const selected = state.category === category;
      return `<button class="filter-chip ${selected ? 'selected' : ''}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${selected}">${escapeHTML(category)} <span>${String(count).padStart(2, '0')}</span></button>`;
    }).join('');
    elements.filters.innerHTML = allLabel + categoryLabels;
  };

  const sortedItems = (items) => {
    const list = [...items];
    if (state.sort === 'title') list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    else if (state.sort === 'price-low') list.sort((a, b) => priceNumber(a.price) - priceNumber(b.price));
    else if (state.sort === 'price-high') list.sort((a, b) => priceNumber(b.price) - priceNumber(a.price));
    else list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return list;
  };

  const cardMarkup = (item) => {
    const image = safeImageData(item.imageData);
    const statusClass = String(item.status || 'Available').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `
      <article class="art-card">
        <button class="card-image-button" type="button" data-open-art="${escapeHTML(item.id)}" aria-label="View ${escapeHTML(item.title)} enlarged">
          ${image ? `<img class="card-image" src="${image}" alt="${escapeHTML(item.title)} map art" loading="lazy">` : '<span class="card-image-placeholder">IMAGE NOT ADDED</span>'}
          <span class="card-image-overlay">VIEW ARTWORK <span>↗</span></span>
        </button>
        <div class="card-content">
          <div class="card-topline"><span class="card-category">${escapeHTML(item.category || 'Other')}</span><span class="card-status status-${escapeHTML(statusClass)}">${escapeHTML(item.status || 'Available')}</span></div>
          <h3>${escapeHTML(item.title)}</h3>
          <p class="card-source">From ${escapeHTML(item.source || 'Unspecified source')}</p>
          <dl class="card-meta">
            <div><dt>SIZE</dt><dd>${escapeHTML(item.size || 'Not listed')}</dd></div>
            <div><dt>PRICE</dt><dd class="price-value">${escapeHTML(item.price || 'Ask for price')}</dd></div>
          </dl>
        </div>
      </article>`;
  };

  const renderGallery = () => {
    const query = state.search.trim().toLowerCase();
    const matches = state.items.filter((item) => {
      const categoryMatch = state.category === 'all' || (item.category || 'Other') === state.category;
      const searchText = [item.title, item.source, item.size, item.price, item.category, item.description, item.status].join(' ').toLowerCase();
      return categoryMatch && (!query || searchText.includes(query));
    });
    state.filtered = sortedItems(matches);
    elements.grid.innerHTML = state.filtered.map(cardMarkup).join('');
    elements.empty.hidden = state.filtered.length > 0;
    elements.grid.hidden = state.filtered.length === 0;
    elements.count.textContent = `Showing ${state.filtered.length} ${state.filtered.length === 1 ? 'piece' : 'pieces'}`;
  };

  const renderHero = () => {
    if (!state.items.length) return;
    const featured = state.items.find((item) => item.featured) || state.items[0];
    const extra = state.items.filter((item) => item.id !== featured.id);
    const image = safeImageData(featured.imageData);
    const heroMain = $('[data-hero-main]');
    if (heroMain && image) heroMain.innerHTML = `<img src="${image}" alt="${escapeHTML(featured.title)} artwork preview">`;
    const heroTitle = $('[data-hero-title]');
    if (heroTitle) heroTitle.textContent = featured.title;
    const backOne = $('[data-hero-back-one]');
    const backTwo = $('[data-hero-back-two]');
    if (backOne && extra[0] && safeImageData(extra[0].imageData)) backOne.innerHTML = `<img src="${safeImageData(extra[0].imageData)}" alt="">`;
    if (backTwo && extra[1] && safeImageData(extra[1].imageData)) backTwo.innerHTML = `<img src="${safeImageData(extra[1].imageData)}" alt="">`;
    const index = state.items.indexOf(featured) + 1;
    const frameIndex = $('.caption-index');
    if (frameIndex) frameIndex.innerHTML = `${String(index).padStart(2, '0')} <b>/</b> ${String(state.items.length).padStart(2, '0')}`;
  };

  const updateModal = () => {
    const item = state.filtered[state.activeIndex];
    if (!item) return;
    const image = safeImageData(item.imageData);
    elements.modalImage.src = image || '';
    elements.modalImage.alt = `${item.title} map art enlarged`;
    elements.modalImage.hidden = !image;
    elements.modalTitle.textContent = item.title;
    elements.modalDescription.textContent = item.description || 'A piece from the collection.';
    elements.modalSource.textContent = item.source || 'Unspecified source';
    elements.modalSize.textContent = item.size || 'Not listed';
    elements.modalPrice.textContent = item.price || 'Ask for price';
    elements.modalStatus.textContent = item.status || 'Available';
    elements.modalIndex.textContent = `${String(state.activeIndex + 1).padStart(2, '0')} / ${String(state.filtered.length).padStart(2, '0')}`;
    $('#modal-prev').disabled = state.filtered.length < 2;
    $('#modal-next').disabled = state.filtered.length < 2;
    const contact = $('.modal-contact');
    if (contact) contact.setAttribute('aria-label', `Ask about ${item.title}`);
  };

  const openModal = (id) => {
    const index = state.filtered.findIndex((item) => String(item.id) === String(id));
    if (index < 0) return;
    state.activeIndex = index;
    state.lastFocus = document.activeElement;
    updateModal();
    elements.modal.hidden = false;
    elements.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('.modal-close').focus();
  };

  const closeModal = () => {
    elements.modal.hidden = true;
    elements.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  };

  const moveModal = (direction) => {
    if (state.filtered.length < 2) return;
    state.activeIndex = (state.activeIndex + direction + state.filtered.length) % state.filtered.length;
    updateModal();
  };

  elements.filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category;
    renderFilters();
    renderGallery();
  });

  elements.grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-art]');
    if (trigger) openModal(trigger.dataset.openArt);
  });

  elements.search.addEventListener('input', () => {
    state.search = elements.search.value;
    renderGallery();
  });

  elements.sort.addEventListener('change', () => {
    state.sort = elements.sort.value;
    renderGallery();
  });

  $('#clear-filters').addEventListener('click', () => {
    state.category = 'all';
    state.search = '';
    elements.search.value = '';
    renderFilters();
    renderGallery();
  });

  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  $('#modal-prev').addEventListener('click', () => moveModal(-1));
  $('#modal-next').addEventListener('click', () => moveModal(1));

  document.addEventListener('keydown', (event) => {
    const modalOpen = !elements.modal.hidden;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.search.focus();
    }
    if (!modalOpen) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'ArrowLeft') moveModal(-1);
    if (event.key === 'ArrowRight') moveModal(1);
    if (event.key === 'Tab') {
      const focusable = $$('button:not([disabled]), a[href], input:not([disabled])', elements.modal).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const menuToggle = $('.mobile-menu-toggle');
  const nav = $('#primary-nav');
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
  $$('.primary-nav a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }));

  $('#current-year').textContent = new Date().getFullYear();
  updateConfig();
  loadCatalogue();
})();
