/* Standalone portfolio demo: all interactions stay in this browser. */
(() => {
  'use strict';
  const products = window.NOCTRA_PRODUCTS || [];
  const productById = new Map(products.map(p => [p.id, p]));
  const main = document.querySelector('#main');
  const panel = document.querySelector('#panel-dialog');
  const productDialog = document.querySelector('#product-dialog');
  const money = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const categories = { all: 'Alle Styles', hoodies: 'Hoodies & Knit', tees: 'T-Shirts', jackets: 'Jacken', pants: 'Hosen', accessories: 'Accessoires' };
  const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const writeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser privacy modes may disable persistence. */ } };
  const savedCart = readStore('noctra-portfolio-cart-v1', []);
  let cart = Array.isArray(savedCart) ? savedCart.filter(l => l && productById.has(l.id) && productById.get(l.id).sizes.some(s => s.label === l.size && s.available) && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 9) : [];
  const savedFavorites = readStore('noctra-portfolio-favorites-v1', []);
  const favorites = new Set(Array.isArray(savedFavorites) ? savedFavorites.filter(id => productById.has(id)) : []);
  let state = { view: 'home', gender: 'all', category: 'all', query: '', size: 'all', sort: 'curated' };
  let selectedProduct = null;
  let selectedSize = '';
  let detailImageIndex = 0;
  const cardImageIndices = new Map();
  let toastTimer;

  function productPhotos(p) {
    return p.images && p.images.length ? p.images : [p.image];
  }
  function photoLabel(p, index) {
    return index === 0 ? `${p.name} – Flatlay in ${p.color}` : `${p.name} – Modelfoto ${index} in ${p.color}`;
  }
  function imageNavigation(p, context) {
    if (productPhotos(p).length < 2) return '';
    const attribute = context === 'card' ? `data-card-slide="${safe(p.id)}"` : 'data-detail-slide="true"';
    return `<button class="image-nav image-nav-prev" ${attribute} data-slide="-1" aria-label="Vorheriges Foto von ${safe(p.name)}">${icon('chevron')}</button><button class="image-nav image-nav-next" ${attribute} data-slide="1" aria-label="Nächstes Foto von ${safe(p.name)}">${icon('chevron')}</button>`;
  }
  function detailGallery(p) {
    const photos = productPhotos(p);
    return `<div class="detail-gallery" aria-label="Bildergalerie ${safe(p.name)}"><div class="detail-image ${detailImageIndex > 0 ? 'is-model-photo' : ''}"><img id="detail-gallery-image" src="${safe(photos[detailImageIndex])}" alt="${safe(photoLabel(p, detailImageIndex))}" width="800" height="1000">${imageNavigation(p, 'detail')}<span class="detail-image-note">EIGENES KI-PRODUKTBILD</span><span class="gallery-counter" aria-live="polite">${detailImageIndex + 1} / ${photos.length}</span></div><div class="gallery-thumbnails" role="group" aria-label="Produktfoto auswählen">${photos.map((src, index) => `<button class="gallery-thumbnail ${index === detailImageIndex ? 'is-active' : ''}" data-detail-index="${index}" aria-label="${safe(p.name)}: ${index === 0 ? 'Flatlay' : 'Modelfoto ' + index} anzeigen" aria-pressed="${index === detailImageIndex}"><img src="${safe(src)}" alt="" width="80" height="100" loading="lazy"><span>${index === 0 ? 'FLATLAY' : 'MODEL ' + index}</span></button>`).join('')}</div></div>`;
  }
  function changeCardPhoto(id, delta) {
    const p = productById.get(id);
    if (!p) return;
    const photos = productPhotos(p);
    const index = ((cardImageIndices.get(id) || 0) + delta + photos.length) % photos.length;
    cardImageIndices.set(id, index);
    main.querySelectorAll('.product-card').forEach(card => {
      if (card.dataset.cardId !== id) return;
      const image = card.querySelector('.product-open img');
      image.src = photos[index];
      image.alt = photoLabel(p, index);
      card.querySelector('.product-image-wrap').classList.toggle('is-model-photo', index > 0);
      const status = card.querySelector('.card-gallery-counter');
      if (status) status.textContent = `${index + 1} / ${photos.length}`;
    });
  }
  function changeDetailPhoto(index) {
    if (!selectedProduct) return;
    const photos = productPhotos(selectedProduct);
    detailImageIndex = (index + photos.length) % photos.length;
    const image = productDialog.querySelector('#detail-gallery-image');
    image.src = photos[detailImageIndex];
    image.alt = photoLabel(selectedProduct, detailImageIndex);
    productDialog.querySelector('.detail-image').classList.toggle('is-model-photo', detailImageIndex > 0);
    productDialog.querySelector('.gallery-counter').textContent = `${detailImageIndex + 1} / ${photos.length}`;
    productDialog.querySelectorAll('[data-detail-index]').forEach(button => {
      const active = Number(button.dataset.detailIndex) === detailImageIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function persist() {
    writeStore('noctra-portfolio-cart-v1', cart);
    writeStore('noctra-portfolio-favorites-v1', [...favorites]);
    updateCounts();
  }
  function updateCounts() {
    const count = cart.reduce((n, l) => n + l.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; });
    document.querySelectorAll('.wishlist-count').forEach(el => { el.textContent = favorites.size; el.classList.toggle('has-items', favorites.size > 0); });
    document.querySelector('.cart-button').setAttribute('aria-label', `Warenkorb öffnen, ${count} Artikel`);
  }
  function toast(message) {
    const el = document.querySelector('#toast');
    el.innerHTML = `${icon('check')}<span>${safe(message)}</span>`;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3000);
  }
  function routeFromHash() {
    const [route, parameters] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(parameters || '');
    state = {
      view: route === 'shop' ? 'catalog' : route === 'wishlist' ? 'wishlist' : 'home',
      gender: ['women', 'men'].includes(params.get('gender')) ? params.get('gender') : 'all',
      category: Object.hasOwn(categories, params.get('category')) ? params.get('category') : 'all',
      query: (params.get('q') || '').slice(0, 100),
      size: params.get('size') || 'all',
      sort: ['price-up', 'price-down', 'name'].includes(params.get('sort')) ? params.get('sort') : 'curated'
    };
    document.querySelector('#global-search').value = state.query;
    render();
  }
  function navigate(view, changes = {}, replace = false, scroll = true) {
    const next = { ...state, view, ...changes };
    const params = new URLSearchParams();
    if (view === 'catalog') {
      if (next.gender !== 'all') params.set('gender', next.gender);
      if (next.category !== 'all') params.set('category', next.category);
      if (next.query) params.set('q', next.query);
      if (next.size !== 'all') params.set('size', next.size);
      if (next.sort !== 'curated') params.set('sort', next.sort);
    }
    const hash = `#${view === 'catalog' ? 'shop' : view === 'wishlist' ? 'wishlist' : 'discover'}${params.size ? '?' + params : ''}`;
    if (replace) { history.replaceState(null, '', hash); routeFromHash(); }
    else if (location.hash === hash) { routeFromHash(); }
    else { location.hash = hash; }
    closeDialog(panel); closeDialog(productDialog);
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function card(p) {
    const liked = favorites.has(p.id);
    const photos = productPhotos(p);
    const index = (cardImageIndices.get(p.id) || 0) % photos.length;
    return `<article class="product-card" data-card-id="${safe(p.id)}">
      <div class="product-image-wrap ${index > 0 ? 'is-model-photo' : ''}">
        <button class="product-open" data-product="${safe(p.id)}" aria-label="${safe(p.name)} ansehen"><img src="${safe(photos[index])}" alt="${safe(photoLabel(p, index))}" loading="lazy" width="600" height="750"></button>
        <span class="product-label">THE EDIT</span>
        <button class="favorite-button ${liked ? 'is-saved' : ''}" data-favorite="${safe(p.id)}" aria-label="${safe(p.name)} ${liked ? 'aus Merkliste entfernen' : 'merken'}" aria-pressed="${liked}">${icon('heart')}</button>
        ${imageNavigation(p, 'card')}
        ${photos.length > 1 ? `<span class="card-gallery-counter" aria-live="polite">${index + 1} / ${photos.length}</span>` : ''}
        <button class="quick-add" data-product="${safe(p.id)}">Größe auswählen ${icon('plus')}</button>
      </div>
      <div class="product-meta"><button class="product-name" data-product="${safe(p.id)}">${safe(p.name)}</button><span class="product-price">${money(p.price)}</span></div>
      <div class="product-submeta"><span>${safe(p.color)}</span><span>${p.gender === 'women' ? 'Women' : p.gender === 'men' ? 'Men' : 'Unisex'}</span></div>
    </article>`;
  }
  function renderHome() {
    main.innerHTML = `<div class="page-content home-content">
      <div class="welcome-line"><span>NEW SEASON. SAME ATTITUDE.</span><span>THE STREETWEAR EDIT / 26</span></div>
      <section class="campaign" aria-label="Autumn Winter 26 Kollektion">
        <img class="campaign-image" src="./assets/generated/campaign.png" alt="Eigenes KI-Kampagnenmotiv: zwei Models in urbaner Streetwear vor moderner Betonarchitektur" fetchpriority="high" width="1536" height="1024">
        <div class="campaign-shade"></div>
        <div class="campaign-topline"><span>NOCTRA STUDIO</span><span>01 / 26 ${icon('arrow')}</span></div>
        <div class="campaign-content"><span class="eyebrow">THE NEW SEASON</span><h1><span>AUTUMN</span><span>WINTER 26.</span></h1><p>New silhouettes. Your attitude.</p><div class="campaign-buttons"><button class="button button-white" data-view="catalog" data-gender="women">SHOP WOMEN ${icon('arrow')}</button><button class="button button-outline-white" data-view="catalog" data-gender="men">SHOP MEN ${icon('arrow')}</button></div></div>
        <div class="campaign-caption"><span>DESIGNED TO STAND OUT.</span><span>STYLED BY YOU.</span></div>
      </section>
      <div class="collection-strip"><span>A NEW PERSPECTIVE ON EVERYDAY.</span><span class="strip-line"></span><span>EXPLORE THE EDIT ${icon('arrow')}</span></div>
      <section class="home-products" aria-labelledby="edit-title"><div class="section-heading"><div><span class="eyebrow">CURATED FOR YOU</span><h2 id="edit-title">THE LATEST.</h2></div><button class="text-button" data-view="catalog">Alle Styles ansehen ${icon('arrow')}</button></div><div class="product-grid">${products.slice(0, 4).map(card).join('')}</div></section>
      <section class="editorial-banner"><div><span class="eyebrow">LESS ORDINARY. MORE YOU.</span><h2>MAKE IT<br>YOUR OWN.</h2><p>Dein Style. Deine Auswahl. Speichere deine Favoriten für später.</p><button class="button button-black" data-view="wishlist">DEINE MERKLISTE ${icon('heart')}</button></div><div class="editorial-art"><span class="editorial-number">N.</span><span>THE EVERYDAY<br>UNIFORM.</span></div></section>
      <p class="demo-footnote">Designstudie mit eigenen KI-Bildern und illustrativen Artikeln. Keine Verbindung zum Live-Shop.</p>
    </div>`;
  }
  function filteredProducts() {
    let list = products.filter(p => (state.gender === 'all' || p.gender === state.gender || p.gender === 'unisex') && (state.category === 'all' || p.category === state.category) && (state.size === 'all' || p.sizes.some(s => s.label === state.size && s.available)));
    const query = state.query.trim().toLocaleLowerCase('de-DE');
    if (query) list = list.filter(p => [p.name, p.color, p.description, categories[p.category]].join(' ').toLocaleLowerCase('de-DE').includes(query));
    if (state.sort === 'price-up') list.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-down') list.sort((a, b) => b.price - a.price);
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }
  function renderCatalog() {
    const list = filteredProducts();
    const title = state.query ? 'YOUR SEARCH.' : state.gender === 'women' ? 'WOMEN.' : state.gender === 'men' ? 'MEN.' : 'THE COLLECTION.';
    main.innerHTML = `<div class="page-content catalog-content"><div class="page-heading"><span class="eyebrow">THE NOCTRA EDIT</span><h1>${title}</h1><p>${state.query ? `Ergebnisse für „${safe(state.query)}“` : 'Entdecke die Styles, die zu deinem Alltag passen.'}</p></div>
      <div class="gender-tabs" aria-label="Kollektion"><button data-gender-filter="all" class="${state.gender === 'all' ? 'is-active' : ''}" aria-pressed="${state.gender === 'all'}">Alle</button><button data-gender-filter="women" class="${state.gender === 'women' ? 'is-active' : ''}" aria-pressed="${state.gender === 'women'}">Women</button><button data-gender-filter="men" class="${state.gender === 'men' ? 'is-active' : ''}" aria-pressed="${state.gender === 'men'}">Men</button></div>
      <div class="category-chips" aria-label="Kategorien">${Object.entries(categories).map(([key, label]) => `<button class="chip ${state.category === key ? 'is-active' : ''}" data-category-filter="${key}" aria-pressed="${state.category === key}">${label}</button>`).join('')}</div>
      <div class="catalog-toolbar"><span class="result-count">${list.length} ${list.length === 1 ? 'Style' : 'Styles'} <span class="muted">/ Demo-Kollektion</span></span><div class="catalog-controls"><label class="select-control">${icon('filter')}<span class="sr-only">Größe filtern</span><select id="size-filter" aria-label="Größe filtern"><option value="all">Alle Größen</option>${['XS','S','M','L','XL','ONE SIZE'].map(s => `<option ${state.size === s ? 'selected' : ''} value="${s}">${s}</option>`).join('')}</select></label><label class="select-control"><span class="sr-only">Sortieren</span><select id="sort-filter" aria-label="Sortieren"><option value="curated" ${state.sort === 'curated' ? 'selected' : ''}>Unsere Auswahl</option><option value="price-up" ${state.sort === 'price-up' ? 'selected' : ''}>Preis aufsteigend</option><option value="price-down" ${state.sort === 'price-down' ? 'selected' : ''}>Preis absteigend</option><option value="name" ${state.sort === 'name' ? 'selected' : ''}>Name A–Z</option></select></label></div></div>
      ${list.length ? `<div class="product-grid">${list.map(card).join('')}</div>` : `<div class="empty-state">${icon('search')}<h2>NO MATCH. YET.</h2><p>Für diese Auswahl haben wir keine Styles.<br>Probier einen anderen Suchbegriff oder setze die Filter zurück.</p><button class="button button-black" data-action="reset-filters">ALLE STYLES ANSEHEN ${icon('arrow')}</button></div>`}
      <p class="demo-footnote">Illustrative Produkte, Preise und Größen. Alle Produktbilder wurden eigens mit KI erstellt.</p></div>`;
  }
  function renderWishlist() {
    const list = products.filter(p => favorites.has(p.id));
    main.innerHTML = `<div class="page-content wishlist-content"><div class="page-heading"><span class="eyebrow">SAVED FOR LATER</span><h1>YOUR FAVORITES.</h1><p>${list.length ? `${list.length} ${list.length === 1 ? 'Style wartet' : 'Styles warten'} auf dich.` : 'Dein nächster Lieblingslook wartet schon.'}</p></div>${list.length ? `<div class="product-grid">${list.map(card).join('')}</div>` : `<div class="empty-state">${icon('heart')}<h2>LOVE IT? SAVE IT.</h2><p>Tippe auf das Herz an einem Artikel.<br>Deine Favoriten findest du genau hier.</p><button class="button button-black" data-view="catalog">STYLES ENTDECKEN ${icon('arrow')}</button></div>`}</div>`;
  }
  function render() {
    if (state.view === 'catalog') renderCatalog();
    else if (state.view === 'wishlist') renderWishlist();
    else renderHome();
    document.querySelector('#page-context').textContent = state.view === 'home' ? 'DISCOVER' : state.view === 'wishlist' ? 'FAVORITES' : state.gender === 'all' ? 'THE SHOP' : state.gender.toUpperCase();
    document.querySelectorAll('[data-view]').forEach(el => {
      if (!el.closest('.sidebar, .bottom-nav')) return;
      const active = el.dataset.view === state.view && (!el.dataset.gender || el.dataset.gender === state.gender) && (!el.dataset.category || el.dataset.category === state.category);
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    updateCounts();
  }
  function closeDialog(dialog) { if (dialog.open) dialog.close(); }
  function openDialog(dialog) {
    closeDialog(dialog === panel ? productDialog : panel);
    dialog.showModal();
  }
  function panelHeader(title, subtitle = '') {
    return `<div class="panel-header"><div>${subtitle ? `<span class="eyebrow">${subtitle}</span>` : ''}<h2 id="panel-title">${title}</h2></div><button class="icon-button" data-action="close-panel" aria-label="Schließen">${icon('close')}</button></div>`;
  }
  function showProduct(id) {
    const p = productById.get(id);
    if (!p) return;
    selectedProduct = p;
    detailImageIndex = (cardImageIndices.get(p.id) || 0) % productPhotos(p).length;
    selectedSize = p.sizes.length === 1 && p.sizes[0].available ? p.sizes[0].label : '';
    productDialog.innerHTML = `<button class="icon-button product-close" data-action="close-product" aria-label="Produkt schließen">${icon('close')}</button><div class="product-detail-layout">${detailGallery(p)}<div class="detail-content"><span class="eyebrow">${p.gender === 'women' ? 'WOMEN' : p.gender === 'men' ? 'MEN' : 'UNISEX'} / ${safe(categories[p.category]).toUpperCase()}</span><h2 id="product-title">${safe(p.name)}</h2><div class="detail-price">${money(p.price)} <span>Demo-Preis</span></div><div class="detail-divider"></div><div class="detail-color"><span>FARBE: ${safe(p.color)}</span><span class="color-swatch" style="background:${safe(p.swatch || '#555')}"></span></div><div class="size-heading"><span>GRÖSSE <span id="selected-size-label">${safe(selectedSize)}</span></span><button class="text-button" data-action="size-guide">Größenhilfe ${icon('arrow')}</button></div><div class="size-options" role="group" aria-label="Größe auswählen">${p.sizes.map(s => `<button data-size="${safe(s.label)}" class="size-option ${s.label === selectedSize ? 'is-selected' : ''}" aria-pressed="${s.label === selectedSize}" ${!s.available ? 'disabled' : ''} aria-label="Größe ${safe(s.label)}${!s.available ? ', in der Demo ausverkauft' : ''}">${safe(s.label)}</button>`).join('')}</div><p id="size-error" class="size-error" role="status"></p><button class="button button-black add-cart-button" data-action="add-to-cart">IN DEN WARENKORB ${icon('bag')}</button><button class="button detail-save ${favorites.has(p.id) ? 'is-saved' : ''}" data-favorite="${safe(p.id)}">${icon('heart')} ${favorites.has(p.id) ? 'AUF DEINER MERKLISTE' : 'FÜR SPÄTER MERKEN'}</button><details class="detail-accordion" open><summary>DER STYLE ${icon('plus')}</summary><p>${safe(p.description)}</p></details><details class="detail-accordion"><summary>VERSAND & RETOURE ${icon('plus')}</summary><p>Diese Portfolio-Demo zeigt den Einkaufsablauf. Es erfolgt kein Versand, keine Zahlung und keine echte Bestellung.</p></details><div class="detail-demo-note">${icon('lock')} DEMO-MODUS · KEIN ECHTER KAUF</div></div></div>`;
    openDialog(productDialog);
  }
  function toggleFavorite(id) {
    if (!productById.has(id)) return;
    const wasSaved = favorites.has(id);
    if (wasSaved) favorites.delete(id); else favorites.add(id);
    persist();
    document.querySelectorAll(`[data-favorite="${id}"]`).forEach(button => {
      button.classList.toggle('is-saved', !wasSaved);
      button.setAttribute('aria-pressed', String(!wasSaved));
      if (button.classList.contains('detail-save')) button.innerHTML = `${icon('heart')} ${!wasSaved ? 'AUF DEINER MERKLISTE' : 'FÜR SPÄTER MERKEN'}`;
      else button.setAttribute('aria-label', `${productById.get(id).name} ${wasSaved ? 'merken' : 'aus Merkliste entfernen'}`);
    });
    if (state.view === 'wishlist') renderWishlist();
    toast(wasSaved ? 'Aus deiner Merkliste entfernt' : 'Auf deiner Merkliste gespeichert');
  }
  function addToCart() {
    if (!selectedProduct || !selectedProduct.sizes.some(s => s.label === selectedSize && s.available)) {
      document.querySelector('#size-error').textContent = 'Bitte wähle zuerst deine Größe aus.';
      return;
    }
    const line = cart.find(l => l.id === selectedProduct.id && l.size === selectedSize);
    if (line && line.quantity >= 9) { toast('Maximal 9 Artikel pro Größe in der Demo'); return; }
    if (line) line.quantity += 1;
    else cart.push({ id: selectedProduct.id, size: selectedSize, quantity: 1 });
    persist();
    closeDialog(productDialog);
    showCart();
    toast('Dein Style ist im Warenkorb');
  }
  function cartTotals() {
    const subtotal = cart.reduce((sum, l) => sum + productById.get(l.id).price * l.quantity, 0);
    return { subtotal, shipping: cart.length ? 4.9 : 0, total: subtotal + (cart.length ? 4.9 : 0) };
  }
  function cartSummary() {
    const { subtotal, shipping, total } = cartTotals();
    return `<div class="summary-row"><span>Zwischensumme</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Versand <span class="muted">(Demo)</span></span><span>${money(shipping)}</span></div><div class="summary-row summary-total"><span>Gesamt</span><strong>${money(total)}</strong></div><p class="summary-note">Illustrative Preise. Kein echter Kauf.</p>`;
  }
  function showCart() {
    const count = cart.reduce((n, l) => n + l.quantity, 0);
    panel.className = 'panel-dialog cart-dialog';
    panel.innerHTML = `${panelHeader(`DEIN WARENKORB <span class="heading-count">${count}</span>`, 'GOOD CHOICES.')}<div class="panel-body">${cart.length ? `<div class="cart-lines">${cart.map((l, index) => { const p = productById.get(l.id); return `<article class="cart-line"><button data-product="${safe(p.id)}" class="cart-line-image" aria-label="${safe(p.name)} ansehen"><img src="${safe(p.image)}" alt="${safe(p.name)}" width="140" height="160"></button><div class="cart-line-info"><span class="cart-line-name">${safe(p.name)}</span><span class="muted">${safe(p.color)} / ${safe(l.size)}</span><strong>${money(p.price * l.quantity)}</strong><div class="quantity-control"><button data-quantity="${index}" data-delta="-1" aria-label="${safe(p.name)} Menge verringern">${icon('minus')}</button><span aria-label="Menge">${l.quantity}</span><button data-quantity="${index}" data-delta="1" ${l.quantity >= 9 ? 'disabled' : ''} aria-label="${safe(p.name)} Menge erhöhen">${icon('plus')}</button></div></div><button class="icon-button cart-line-remove" data-remove="${index}" aria-label="${safe(p.name)} entfernen">${icon('trash')}</button></article>`; }).join('')}</div>` : `<div class="empty-state cart-empty">${icon('bag')}<h3>ROOM FOR<br>YOUR NEXT LOOK.</h3><p>Dein Warenkorb ist noch leer.</p><button class="button button-black" data-view="catalog">STYLES ENTDECKEN ${icon('arrow')}</button></div>`}</div>${cart.length ? `<div class="cart-summary">${cartSummary()}<button class="button button-black" data-action="checkout">ZUM DEMO-CHECKOUT ${icon('arrow')}</button><button class="text-button continue-shopping" data-action="close-panel">Weiter shoppen</button></div>` : ''}`;
    if (!panel.open) openDialog(panel);
  }
  function showCheckout() {
    if (!cart.length) { showCart(); return; }
    panel.className = 'panel-dialog checkout-dialog';
    panel.innerHTML = `${panelHeader('DEMO-CHECKOUT', 'YOUR NEXT LOOK.')}<div class="panel-body checkout-body"><div class="checkout-steps"><span class="is-active">01 LIEFERUNG</span><span>02 ABSCHLUSS</span></div><div class="demo-notice">${icon('lock')}<p>Test den Ablauf mit den Beispieldaten. Es wird nichts bestellt, bezahlt oder übertragen.</p></div><form id="checkout-form" class="checkout-form"><fieldset><legend>LIEFERADRESSE <span>BEISPIELDATEN</span></legend><div class="form-row"><label>Vorname<input name="firstName" value="Alex" required maxlength="60" autocomplete="off"></label><label>Nachname<input name="lastName" value="Demo" required maxlength="60" autocomplete="off"></label></div><label>E-Mail<input name="email" type="email" value="alex@example.com" required maxlength="100" autocomplete="off"></label><label>Straße und Hausnummer<input name="street" value="Beispielstraße 12" required maxlength="100" autocomplete="off"></label><div class="form-row"><label>Postleitzahl<input name="zip" value="10115" required pattern="[0-9]{5}" inputmode="numeric" maxlength="5" autocomplete="off" title="Bitte fünf Ziffern eingeben"></label><label>Stadt<input name="city" value="Berlin" required maxlength="60" autocomplete="off"></label></div><label>Land<select name="country"><option>Deutschland</option></select></label></fieldset><fieldset><legend>ZAHLUNGSART <span>SIMULIERT</span></legend><label class="payment-choice"><input type="radio" name="payment" value="card" checked><span>${icon('lock')} Kreditkarte</span><span class="payment-label">DEMO</span></label><label class="payment-choice"><input type="radio" name="payment" value="paypal"><span>PayPal</span><span class="payment-label">DEMO</span></label></fieldset><div class="checkout-total">${cartSummary()}</div><button class="button button-black" type="submit">DEMO-BESTELLUNG ABSCHLIESSEN ${icon('arrow')}</button><p class="checkout-privacy">Nur eine Simulation. Adressdaten werden weder gespeichert noch versendet.</p></form></div>`;
    if (!panel.open) openDialog(panel);
    panel.scrollTop = 0;
  }
  function completeCheckout(form) {
    if (!form.reportValidity()) return;
    const count = cart.reduce((n, l) => n + l.quantity, 0);
    const total = cartTotals().total;
    const payment = new FormData(form).get('payment');
    cart = []; persist();
    panel.innerHTML = `${panelHeader('ALL SET.', 'DEMO ABGESCHLOSSEN')}<div class="panel-body success-body"><div class="success-icon">${icon('check')}</div><span class="eyebrow">GREAT STYLE. GREAT CHOICE.</span><h3>LOOKS GOOD<br>ON YOU.</h3><p>Du hast den Einkaufsablauf erfolgreich ausprobiert. Danke fürs Entdecken.</p><div class="demo-receipt"><div class="summary-row"><span>Demo-Bestellnummer</span><strong>NOCTRA-DEMO-026</strong></div><div class="summary-row"><span>Artikel</span><strong>${count}</strong></div><div class="summary-row"><span>Demo-Gesamt</span><strong>${money(total)}</strong></div><div class="summary-row"><span>Demo-Zahlungsart</span><strong>${payment === 'paypal' ? 'PayPal' : 'Kreditkarte'}</strong></div></div><div class="demo-notice">${icon('lock')}<p>Keine echte Bestellung. Keine Zahlung. Deine Eingaben wurden verworfen.</p></div><button class="button button-black" data-view="home">ZURÜCK ZUM ENTDECKEN ${icon('arrow')}</button></div>`;
    panel.scrollTop = 0;
  }
  function showSearch() {
    panel.className = 'panel-dialog search-dialog';
    panel.innerHTML = `${panelHeader('FIND YOUR STYLE.', 'THE SEARCH')}<div class="panel-body"><form id="mobile-search-form"><div class="mobile-search-field">${icon('search')}<input id="mobile-search-input" type="search" aria-label="Suchbegriff" placeholder="Hoodie, Denim, Jacke …" value="${safe(state.query)}" autocomplete="off"><button class="icon-button" type="submit" aria-label="Suchen">${icon('arrow')}</button></div></form><span class="eyebrow search-suggestions-title">ENTDECKE DEINEN LOOK</span><div class="search-suggestions">${Object.entries(categories).filter(([key]) => key !== 'all').map(([key, label]) => `<button data-view="catalog" data-category="${key}">${label} ${icon('arrow')}</button>`).join('')}</div></div>`;
    openDialog(panel);
    document.querySelector('#mobile-search-input').focus();
  }
  function showAccount() {
    panel.className = 'panel-dialog account-dialog';
    panel.innerHTML = `${panelHeader('DEIN NOCTRA.', 'YOUR PERSONAL SPACE')}<div class="panel-body account-body"><div class="account-intro">${icon('user')}<h3>YOUR STYLE.<br>YOUR SPACE.</h3><p>Deine Favoriten und dein Warenkorb bleiben in diesem Browser gespeichert.</p></div><button class="account-link" data-view="wishlist">${icon('heart')}<span>Deine Merkliste</span><span>${favorites.size}</span>${icon('chevron')}</button><button class="account-link" data-action="cart">${icon('bag')}<span>Dein Warenkorb</span><span>${cart.reduce((n,l) => n + l.quantity,0)}</span>${icon('chevron')}</button><button class="account-link" data-action="demo-info">${icon('grid')}<span>Über diese Demo</span>${icon('chevron')}</button><div class="demo-notice">${icon('lock')}<p>Portfolio-Modus: Du brauchst kein Konto und keine Anmeldung.</p></div><button class="text-button reset-demo" data-action="reset-demo">Demo zurücksetzen</button></div>`;
    openDialog(panel);
  }
  function showDemoInfo() {
    panel.className = 'panel-dialog info-dialog';
    panel.innerHTML = `${panelHeader('THE APP CONCEPT.', 'PORTFOLIO DEMO')}<div class="panel-body info-body"><h3>STREETWEAR.<br>MEETS MOBILE.</h3><p>Eine eigenständige HTML-Shop-App für die fiktive Demo-Marke NOCTRA. Optimiert für Handy, Tablet und Desktop.</p><ul class="info-feature-list"><li>${icon('check')} Produktsuche, Kategorien und Filter</li><li>${icon('check')} Produktdetails und Größenwahl</li><li>${icon('check')} Merkliste und Warenkorb</li><li>${icon('check')} Simulierter Checkout</li></ul><div class="demo-notice">${icon('lock')}<p>Alle Fotos wurden eigens mit KI erstellt. Artikel, Preise, Größen und Versand sind illustrativ. Es besteht keine Verbindung zum Live-Shop. NOCTRA ist eine fiktive Marke für diese Portfolio-Demo.</p></div><button class="button button-black" data-view="catalog">APP AUSPROBIEREN ${icon('arrow')}</button></div>`;
    openDialog(panel);
  }
  function showSizeGuide() {
    const existing = productDialog.querySelector('.size-guide-content');
    if (existing) { existing.remove(); return; }
    productDialog.querySelector('.size-options').insertAdjacentHTML('afterend', '<div class="size-guide-content"><p>Wähle für diese Demo deine übliche Größe. Die Beispiel-Styles sind locker geschnitten. Größen und Verfügbarkeit dienen nur dazu, die Bedienung zu zeigen.</p></div>');
  }
  document.addEventListener('click', event => {
    if (event.target.closest('.skip-link')) {
      event.preventDefault();
      main.focus();
      main.scrollIntoView({ block: 'start' });
      return;
    }
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.cardSlide) {
      changeCardPhoto(button.dataset.cardSlide, Number(button.dataset.slide));
    } else if (button.dataset.detailSlide) {
      changeDetailPhoto(detailImageIndex + Number(button.dataset.slide));
    } else if (button.dataset.detailIndex !== undefined) {
      changeDetailPhoto(Number(button.dataset.detailIndex));
    } else if (button.dataset.view) {
      const changes = { gender: button.dataset.gender || 'all', category: button.dataset.category || 'all', query: '', size: 'all', sort: 'curated' };
      navigate(button.dataset.view, changes);
    } else if (button.dataset.product) showProduct(button.dataset.product);
    else if (button.dataset.favorite) toggleFavorite(button.dataset.favorite);
    else if (button.dataset.genderFilter) navigate('catalog', { gender: button.dataset.genderFilter }, false, false);
    else if (button.dataset.categoryFilter) navigate('catalog', { category: button.dataset.categoryFilter }, false, false);
    else if (button.dataset.size) {
      selectedSize = button.dataset.size;
      productDialog.querySelectorAll('[data-size]').forEach(el => { el.classList.toggle('is-selected', el.dataset.size === selectedSize); el.setAttribute('aria-pressed', String(el.dataset.size === selectedSize)); });
      document.querySelector('#selected-size-label').textContent = selectedSize;
      document.querySelector('#size-error').textContent = '';
    } else if (button.dataset.quantity !== undefined) {
      const line = cart[Number(button.dataset.quantity)];
      if (!line) return;
      line.quantity += Number(button.dataset.delta);
      cart = cart.filter(l => l.quantity > 0);
      persist(); showCart();
    } else if (button.dataset.remove !== undefined) {
      cart.splice(Number(button.dataset.remove), 1); persist(); showCart();
    } else {
      switch (button.dataset.action) {
        case 'cart': showCart(); break;
        case 'checkout': showCheckout(); break;
        case 'search': showSearch(); break;
        case 'account': showAccount(); break;
        case 'demo-info': showDemoInfo(); break;
        case 'close-panel': closeDialog(panel); break;
        case 'close-product': closeDialog(productDialog); break;
        case 'add-to-cart': addToCart(); break;
        case 'size-guide': showSizeGuide(); break;
        case 'reset-filters': navigate('catalog', { gender: 'all', category: 'all', query: '', size: 'all', sort: 'curated' }); break;
        case 'reset-demo': cart = []; favorites.clear(); cardImageIndices.clear(); persist(); closeDialog(panel); render(); toast('Demo zurückgesetzt'); break;
      }
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'global-search') navigate('catalog', { query: event.target.value, gender: 'all', category: 'all', size: 'all' }, true, false);
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'size-filter') navigate('catalog', { size: event.target.value }, false, false);
    if (event.target.id === 'sort-filter') navigate('catalog', { sort: event.target.value }, false, false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const delta = event.key === 'ArrowLeft' ? -1 : 1;
    if (event.target.closest('.detail-gallery') && productDialog.open) {
      event.preventDefault();
      changeDetailPhoto(detailImageIndex + delta);
    } else if (event.target.closest('.product-image-wrap')) {
      const card = event.target.closest('[data-card-id]');
      if (card) { event.preventDefault(); changeCardPhoto(card.dataset.cardId, delta); }
    }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'checkout-form') { event.preventDefault(); completeCheckout(event.target); }
    if (event.target.id === 'mobile-search-form') { event.preventDefault(); navigate('catalog', { query: document.querySelector('#mobile-search-input').value, gender: 'all', category: 'all', size: 'all' }); }
  });
  [panel, productDialog].forEach(dialog => {
    dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { document.body.classList.toggle('dialog-open', panel.open || productDialog.open); });
    const observer = new MutationObserver(() => { document.body.classList.toggle('dialog-open', panel.open || productDialog.open); });
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  });
  window.addEventListener('hashchange', routeFromHash);
  routeFromHash();
})();
