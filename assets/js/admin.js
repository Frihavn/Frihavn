(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const form = $('#art-form');
  const fields = {
    id: $('#editing-id'), title: $('#title'), source: $('#source'), size: $('#size'),
    price: $('#price'), category: $('#category'), status: $('#status'),
    description: $('#description'), featured: $('#featured'), imageFile: $('#image-file')
  };
  const state = { items: [], imageData: '', editingId: null, dirty: false };
  const maxImageBytes = 5 * 1024 * 1024;
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const validImage = (value) => typeof value === 'string' && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value);
  const slugify = (value) => String(value || 'mapart').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52) || 'mapart';

  const setStatus = (message, isError = false) => {
    const output = $('#form-status');
    output.textContent = message;
    output.classList.toggle('error', isError);
  };

  const updateCount = () => {
    const count = String(state.items.length).padStart(2, '0');
    $('#item-count').textContent = count;
    $('#entry-count-pill').textContent = count;
  };

  const setPreview = (data) => {
    const preview = $('#upload-preview');
    preview.innerHTML = '';
    if (validImage(data)) {
      const image = document.createElement('img');
      image.src = data;
      image.alt = 'Selected artwork preview';
      preview.append(image);
    } else {
      preview.innerHTML = '<span>IMAGE<br>PREVIEW</span>';
    }
  };

  const renderEntries = () => {
    const list = $('#entries-list');
    updateCount();
    if (!state.items.length) {
      list.innerHTML = '<div class="admin-empty">Your catalogue is empty. Add the first piece using the form.</div>';
      return;
    }
    list.innerHTML = state.items.map((item) => {
      const image = validImage(item.imageData) ? `<img src="${item.imageData}" alt="">` : '';
      const meta = [item.source, item.size].filter(Boolean).map(escapeHTML).join(' · ');
      return `<div class="entry-row" data-entry="${escapeHTML(item.id)}"><div class="entry-thumb">${image}</div><div class="entry-info"><strong title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</strong><span>${meta || 'Details not set'}</span></div><div class="entry-actions"><button type="button" data-edit-entry="${escapeHTML(item.id)}">Edit</button><button class="delete-entry" type="button" data-delete-entry="${escapeHTML(item.id)}">Delete</button></div></div>`;
    }).join('');
  };

  const loadCatalogue = async () => {
    try {
      const response = await fetch('data/maparts.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Catalogue returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Expected an array of artwork entries.');
      state.items = data.filter((item) => item && item.id && item.title);
      renderEntries();
      setStatus('Catalogue loaded. Add or edit a piece, then download the JSON file.');
    } catch (error) {
      console.error(error);
      state.items = [];
      renderEntries();
      setStatus('Could not load data/maparts.json. Open this page through GitHub Pages or a local web server, not directly as a file.', true);
    }
  };

  const resetForm = () => {
    form.reset();
    fields.id.value = '';
    state.editingId = null;
    state.imageData = '';
    setPreview('');
    $('#form-heading').textContent = 'Add a new piece';
    $('#save-entry').innerHTML = 'Add to catalogue <span>＋</span>';
    $('#cancel-edit').hidden = true;
    setStatus('');
  };

  const loadIntoForm = (id) => {
    const item = state.items.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    state.editingId = item.id;
    fields.id.value = item.id;
    fields.title.value = item.title || '';
    fields.source.value = item.source || '';
    fields.size.value = item.size || '';
    fields.price.value = item.price || '';
    fields.category.value = item.category || '';
    fields.status.value = item.status || 'Available';
    fields.description.value = item.description || '';
    fields.featured.checked = Boolean(item.featured);
    state.imageData = validImage(item.imageData) ? item.imageData : '';
    fields.imageFile.value = '';
    setPreview(state.imageData);
    $('#form-heading').textContent = 'Edit artwork';
    $('#save-entry').innerHTML = 'Save changes <span>✓</span>';
    $('#cancel-edit').hidden = false;
    setStatus(`Editing “${item.title}”.`);
    $('#title').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const readImageFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.readAsDataURL(file);
  });

  fields.imageFile.addEventListener('change', async () => {
    const file = fields.imageFile.files && fields.imageFile.files[0];
    if (!file) return;
    if (!validTypes.includes(file.type)) {
      fields.imageFile.value = '';
      setStatus('Choose a PNG, JPG, WEBP, or GIF image.', true);
      return;
    }
    if (file.size > maxImageBytes) {
      fields.imageFile.value = '';
      setStatus('That image is larger than 5 MB. Resize or compress it before adding it.', true);
      return;
    }
    try {
      state.imageData = await readImageFile(file);
      setPreview(state.imageData);
      setStatus(`Image loaded: ${file.name} (${(file.size / 1024).toFixed(0)} KB).`);
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = fields.title.value.trim();
    const source = fields.source.value.trim();
    const size = fields.size.value.trim();
    const price = fields.price.value.trim();
    if (!title || !source || !size || !price) {
      setStatus('Please fill in the title, source, size, and price.', true);
      return;
    }
    if (!state.imageData && !state.editingId) {
      setStatus('Add an image file before saving this new artwork.', true);
      return;
    }
    const existing = state.items.find((item) => String(item.id) === String(state.editingId));
    let id = state.editingId || slugify(title);
    if (!state.editingId && state.items.some((item) => item.id === id)) id = `${id}-${Date.now().toString(36)}`;
    const record = {
      id,
      title,
      source,
      size,
      price,
      category: fields.category.value.trim() || 'Other',
      status: fields.status.value,
      description: fields.description.value.trim(),
      imageData: state.imageData || (existing && existing.imageData) || '',
      featured: fields.featured.checked
    };
    if (!validImage(record.imageData)) {
      setStatus('The image data is missing or invalid. Choose the image again.', true);
      return;
    }
    if (record.featured) state.items = state.items.map((item) => ({ ...item, featured: false }));
    const index = state.items.findIndex((item) => String(item.id) === String(id));
    if (index >= 0) state.items[index] = record;
    else state.items.unshift(record);
    state.dirty = true;
    renderEntries();
    resetForm();
    setStatus(`“${title}” saved in this editor. Download maparts.json to keep the change.`);
  });

  $('#entries-list').addEventListener('click', (event) => {
    const edit = event.target.closest('[data-edit-entry]');
    const remove = event.target.closest('[data-delete-entry]');
    if (edit) loadIntoForm(edit.dataset.editEntry);
    if (remove) {
      const id = remove.dataset.deleteEntry;
      const item = state.items.find((entry) => String(entry.id) === String(id));
      if (!item || !window.confirm(`Delete “${item.title}” from this catalogue draft?`)) return;
      state.items = state.items.filter((entry) => String(entry.id) !== String(id));
      if (String(state.editingId) === String(id)) resetForm();
      state.dirty = true;
      renderEntries();
      setStatus(`“${item.title}” removed from this editor. Download the JSON file to keep the change.`);
    }
  });

  const downloadJSON = () => {
    const contents = JSON.stringify(state.items, null, 2);
    const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maparts.json';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    state.dirty = false;
    setStatus('Your updated maparts.json has been downloaded. Replace data/maparts.json in your repository with this file.');
  };

  $('#export-json').addEventListener('click', downloadJSON);
  $('#reset-form').addEventListener('click', resetForm);
  $('#cancel-edit').addEventListener('click', resetForm);

  $('#import-json').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error('The JSON file must contain an array of entries.');
      const invalid = parsed.find((item) => !item || !item.id || !item.title);
      if (invalid) throw new Error('Every entry needs at least an id and a title.');
      const badImage = parsed.find((item) => item.imageData && !validImage(item.imageData));
      if (badImage) throw new Error(`The image for “${badImage.title || badImage.id}” is not a supported embedded image. Use PNG, JPG, WEBP, or GIF.`);
      state.items = parsed;
      state.dirty = true;
      resetForm();
      renderEntries();
      setStatus(`Imported ${state.items.length} entries. Download to save your catalogue file.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}`, true);
    } finally {
      event.target.value = '';
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  $('#cancel-edit').hidden = true;
  loadCatalogue();
})();
