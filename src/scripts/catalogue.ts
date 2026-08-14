// Client-side catalogue multi-attribute filtering, slide-over panel, mobile bottom sheet, dynamic counts, active chips, and URL state sync

import taxonomyData from '../../vinsho-taxonomy.json';

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const qInput = document.getElementById('q') as HTMLInputElement | null;
  const sortSelect = document.getElementById('sort') as HTMLSelectElement | null;

  // Filter Drawer & Backdrop Elements
  const filterBtn = document.getElementById('open-filter-panel-btn');
  const filterPanel = document.getElementById('filter-panel');
  const filterBackdrop = document.getElementById('filter-backdrop');
  const closeBtn = document.getElementById('fp-close-btn');
  const clearAllBtnHeader = document.getElementById('fp-clear-all-btn');
  const resultCountText = document.getElementById('fp-result-count');
  const mobileClearBtn = document.getElementById('fp-mobile-clear-btn');
  const mobileApplyBtn = document.getElementById('fp-mobile-apply-btn');

  // Sidebar items & Mobile taxonomy pills
  const sidebarItems = document.querySelectorAll<HTMLButtonElement>('.sidebar-item');
  const mobileColPills = document.querySelectorAll<HTMLButtonElement>('.mobile-col-pills .tab-pill');
  const mobileSubRow = document.getElementById('mobile-sub-row');

  // Active Chips Bar
  const activeChipsBar = document.getElementById('active-chips-bar');
  const chipsWrapper = document.getElementById('chips-wrapper');
  const clearAllChipsBtn = document.getElementById('clear-all-chips');

  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll<HTMLElement>('.pc'));

  // Active filter state collections
  let selectedCols: string[] = [];
  let selectedSubs: string[] = [];
  let selectedMats: string[] = [];
  let selectedAvails: string[] = [];
  let query = '';
  let sort = 'feat';

  // Open & Close Drawer Functions
  function openFilterPanel() {
    if (!filterPanel || !filterBackdrop) return;
    filterPanel.hidden = false;
    filterBackdrop.hidden = false;

    // Small delay to allow display before animation
    requestAnimationFrame(() => {
      filterPanel.classList.add('active');
      filterBackdrop.classList.add('active');
    });

    if (filterBtn) filterBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeFilterPanel() {
    if (!filterPanel || !filterBackdrop) return;
    filterPanel.classList.remove('active');
    filterBackdrop.classList.remove('active');

    setTimeout(() => {
      filterPanel.hidden = true;
      filterBackdrop.hidden = true;
      document.body.style.overflow = '';
      if (filterBtn) {
        filterBtn.setAttribute('aria-expanded', 'false');
        filterBtn.focus();
      }
    }, 350);
  }

  filterBtn?.addEventListener('click', openFilterPanel);
  closeBtn?.addEventListener('click', closeFilterPanel);
  filterBackdrop?.addEventListener('click', closeFilterPanel);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filterPanel && !filterPanel.hidden) {
      closeFilterPanel();
    }
  });

  // Accordion Toggle Handling inside Filter Panel
  const groupHeaders = document.querySelectorAll<HTMLButtonElement>('.fp-group-header');
  groupHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const group = header.closest('.fp-group');
      const content = group?.querySelector<HTMLElement>('.fp-group-content');
      const icon = header.querySelector('.fp-group-icon');
      if (!content || !group || !icon) return;

      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        header.setAttribute('aria-expanded', 'false');
        content.hidden = true;
        group.classList.remove('open');
        icon.textContent = '+';
      } else {
        header.setAttribute('aria-expanded', 'true');
        content.hidden = false;
        group.classList.add('open');
        icon.textContent = '−';
      }
    });
  });

  // Build card metadata mapping
  const items = cards.map((card, originalIndex) => {
    const name = card.querySelector('.pc-name')?.textContent || '';
    const desc = card.querySelector('.pc-desc')?.textContent || '';
    const eyebrow = card.querySelector('.pc-eyebrow')?.textContent || '';
    const colKey = card.dataset.colKey || '';
    const subKey = card.dataset.subKey || '';
    const rawMaterial = card.dataset.material || '';

    // Material categorization
    const matLower = rawMaterial.toLowerCase();
    let matKey = '';
    if (matLower.includes('cotton') || matLower.includes('linen') || matLower.includes('terry')) matKey = 'cotton-linen';
    else if (matLower.includes('metal') || matLower.includes('powder-coated')) matKey = 'metal';
    else if (matLower.includes('wood') || matLower.includes('framed print')) matKey = 'wood';
    else if (matLower.includes('ceramic') || matLower.includes('resin') || matLower.includes('cast')) matKey = 'ceramic-resin';
    else if (matLower.includes('silk') || matLower.includes('live plant') || matLower.includes('accent')) matKey = 'silk-botanical';
    else if (matLower.includes('glass') || matLower.includes('mirror')) matKey = 'glass-mirror';
    else if (matLower.includes('jute') || matLower.includes('coir')) matKey = 'jute-coir';
    else if (matLower.includes('wax') || matLower.includes('poured')) matKey = 'wax';

    return {
      card,
      name,
      desc,
      eyebrow,
      colKey,
      subKey,
      matKey,
      rawMaterial,
      originalIndex
    };
  });

  // Read URL query parameters
  function readParamsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    selectedCols = c ? c.split(',') : [];

    const sub = params.get('sub');
    selectedSubs = sub ? sub.split(',') : [];

    const mat = params.get('mat');
    selectedMats = mat ? mat.split(',') : [];

    const avail = params.get('avail');
    selectedAvails = avail ? avail.split(',') : [];

    query = params.get('q') || '';
    if (qInput && query) {
      qInput.value = query;
    }

    syncCheckboxesWithState();
  }

  function updateURL() {
    const url = new URL(window.location.href);
    if (selectedCols.length > 0) url.searchParams.set('c', selectedCols.join(','));
    else url.searchParams.delete('c');

    if (selectedSubs.length > 0) url.searchParams.set('sub', selectedSubs.join(','));
    else url.searchParams.delete('sub');

    if (selectedMats.length > 0) url.searchParams.set('mat', selectedMats.join(','));
    else url.searchParams.delete('mat');

    if (selectedAvails.length > 0) url.searchParams.set('avail', selectedAvails.join(','));
    else url.searchParams.delete('avail');

    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');

    window.history.pushState({}, '', url.toString());
  }

  function syncCheckboxesWithState() {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('.custom-checkbox-input');
    checkboxes.forEach((cb) => {
      const name = cb.name;
      const val = cb.value;
      if (name === 'col') cb.checked = selectedCols.includes(val);
      else if (name === 'sub') cb.checked = selectedSubs.includes(val);
      else if (name === 'mat') cb.checked = selectedMats.includes(val);
      else if (name === 'avail') cb.checked = selectedAvails.includes(val);
    });
  }

  function syncStateFromCheckboxes() {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('.custom-checkbox-input');
    selectedCols = [];
    selectedSubs = [];
    selectedMats = [];
    selectedAvails = [];

    checkboxes.forEach((cb) => {
      if (cb.checked) {
        if (cb.name === 'col') selectedCols.push(cb.value);
        else if (cb.name === 'sub') selectedSubs.push(cb.value);
        else if (cb.name === 'mat') selectedMats.push(cb.value);
        else if (cb.name === 'avail') selectedAvails.push(cb.value);
      }
    });
  }

  function renderMobileSubRow() {
    if (!mobileSubRow) return;
    mobileSubRow.innerHTML = '';

    if (selectedCols.length !== 1) {
      mobileSubRow.hidden = true;
      return;
    }

    const activeCol = selectedCols[0];
    const colObj = taxonomyData.collections.find((c) => c.key === activeCol);
    if (!colObj || colObj.subcategories.length === 0) {
      mobileSubRow.hidden = true;
      return;
    }

    mobileSubRow.hidden = false;

    // "All subcategories" pill
    const allSubPill = document.createElement('button');
    allSubPill.className = `tab-pill ${selectedSubs.length === 0 ? 'active' : ''}`;
    allSubPill.innerHTML = `All ${colObj.name}`;
    allSubPill.addEventListener('click', () => {
      selectedSubs = [];
      syncCheckboxesWithState();
      updateURL();
      draw();
    });
    mobileSubRow.appendChild(allSubPill);

    colObj.subcategories.forEach((sub) => {
      const subPill = document.createElement('button');
      subPill.className = `tab-pill ${selectedSubs.includes(sub.key) ? 'active' : ''}`;
      subPill.textContent = sub.name;
      subPill.addEventListener('click', () => {
        if (selectedSubs.includes(sub.key)) {
          selectedSubs = selectedSubs.filter((s) => s !== sub.key);
        } else {
          selectedSubs = [sub.key];
        }
        syncCheckboxesWithState();
        updateURL();
        draw();
      });
      mobileSubRow.appendChild(subPill);
    });
  }

  function updateSidebarState() {
    sidebarItems.forEach((btn) => {
      const c = btn.dataset.col;
      const s = btn.dataset.sub;

      if (c === 'all' && s === 'all') {
        btn.classList.toggle('active', selectedCols.length === 0 && selectedSubs.length === 0);
      } else if (c && s === 'all') {
        btn.classList.toggle('active', selectedCols.length === 1 && selectedCols[0] === c && selectedSubs.length === 0);
      } else if (c && s) {
        btn.classList.toggle('active', selectedCols.includes(c) && selectedSubs.includes(s));
      }
    });
  }

  function updateMobilePillsState() {
    mobileColPills.forEach((btn) => {
      const c = btn.dataset.col;
      if (c === 'all') {
        btn.classList.toggle('active', selectedCols.length === 0);
      } else if (c) {
        btn.classList.toggle('active', selectedCols.includes(c));
      }
    });

    renderMobileSubRow();
  }

  function updateChipsBar() {
    if (!activeChipsBar || !chipsWrapper) return;

    chipsWrapper.innerHTML = '';
    let hasChips = false;

    // Collection Chips
    selectedCols.forEach((colKey) => {
      hasChips = true;
      const colObj = taxonomyData.collections.find((c) => c.key === colKey);
      const colName = colObj ? colObj.name : colKey;

      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.innerHTML = `${colName} <button class="chip-remove" aria-label="Remove filter">&times;</button>`;
      chip.querySelector('.chip-remove')?.addEventListener('click', () => {
        selectedCols = selectedCols.filter((c) => c !== colKey);
        syncCheckboxesWithState();
        updateURL();
        draw();
      });
      chipsWrapper.appendChild(chip);
    });

    // Sub-category Chips
    selectedSubs.forEach((subKey) => {
      hasChips = true;
      let subName = subKey;
      taxonomyData.collections.forEach((c) => {
        const s = c.subcategories.find((sub) => sub.key === subKey);
        if (s) subName = s.name;
      });

      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.innerHTML = `${subName} <button class="chip-remove" aria-label="Remove filter">&times;</button>`;
      chip.querySelector('.chip-remove')?.addEventListener('click', () => {
        selectedSubs = selectedSubs.filter((s) => s !== subKey);
        syncCheckboxesWithState();
        updateURL();
        draw();
      });
      chipsWrapper.appendChild(chip);
    });

    // Material Chips
    const matLabels: Record<string, string> = {
      'cotton-linen': 'Cotton & Linen',
      'metal': 'Metal & Alloys',
      'wood': 'Wood & Timber',
      'ceramic-resin': 'Ceramic & Sculpted',
      'silk-botanical': 'Silk & Botanicals',
      'glass-mirror': 'Glass & Mirror',
      'jute-coir': 'Jute & Natural Fibre',
      'wax': 'Poured Wax'
    };

    selectedMats.forEach((matKey) => {
      hasChips = true;
      const label = matLabels[matKey] || matKey;

      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.innerHTML = `${label} <button class="chip-remove" aria-label="Remove material filter">&times;</button>`;
      chip.querySelector('.chip-remove')?.addEventListener('click', () => {
        selectedMats = selectedMats.filter((m) => m !== matKey);
        syncCheckboxesWithState();
        updateURL();
        draw();
      });
      chipsWrapper.appendChild(chip);
    });

    // Availability Chips
    selectedAvails.forEach((availKey) => {
      hasChips = true;
      const label = availKey === 'in-stock' ? 'In Stock' : 'Made to Order';

      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.innerHTML = `${label} <button class="chip-remove" aria-label="Remove availability filter">&times;</button>`;
      chip.querySelector('.chip-remove')?.addEventListener('click', () => {
        selectedAvails = selectedAvails.filter((a) => a !== availKey);
        syncCheckboxesWithState();
        updateURL();
        draw();
      });
      chipsWrapper.appendChild(chip);
    });

    // Search Query Chip
    if (query) {
      hasChips = true;
      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.innerHTML = `"${query}" <button class="chip-remove" aria-label="Remove search filter">&times;</button>`;
      chip.querySelector('.chip-remove')?.addEventListener('click', () => {
        query = '';
        if (qInput) qInput.value = '';
        updateURL();
        draw();
      });
      chipsWrapper.appendChild(chip);
    }

    activeChipsBar.hidden = !hasChips;
  }

  function getFilteredProducts() {
    return items.filter((item) => {
      // Collection Filter (OR inside group)
      const matchesCol = selectedCols.length === 0 || selectedCols.includes(item.colKey);

      // Sub-category Filter (OR inside group)
      const matchesSub = selectedSubs.length === 0 || selectedSubs.includes(item.subKey);

      // Material Filter (OR inside group)
      const matchesMat = selectedMats.length === 0 || (item.matKey && selectedMats.includes(item.matKey));

      // Search Query
      const searchableText = `${item.name} ${item.desc} ${item.eyebrow} ${item.rawMaterial} ${item.colKey} ${item.subKey}`.toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);

      return matchesCol && matchesSub && matchesMat && matchesQuery;
    });
  }

  function draw() {
    updateSidebarState();
    updateMobilePillsState();
    updateChipsBar();

    const filtered = getFilteredProducts();

    // Dynamic result count update inside filter drawer & mobile button
    if (resultCountText) {
      resultCountText.textContent = `${filtered.length} PRODUCTS`;
    }
    if (mobileApplyBtn) {
      mobileApplyBtn.textContent = `SHOW ${filtered.length} PRODUCTS`;
    }

    // Sorting
    if (sort === 'az') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'za') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'cat') {
      filtered.sort((a, b) => a.colKey.localeCompare(b.colKey) || a.subKey.localeCompare(b.subKey) || a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    // Hide all cards first with smooth transition
    items.forEach((item) => {
      item.card.style.display = 'none';
    });

    // Display filtered cards
    filtered.forEach((item) => {
      item.card.style.display = '';
      grid.appendChild(item.card);
    });

    if (empty) {
      if (filtered.length === 0) {
        empty.hidden = false;
        empty.innerHTML = `No products match those filter criteria. Try <button id="empty-clear-btn" style="background:none;border:none;color:var(--maroon);text-decoration:underline;cursor:pointer;font-size:inherit;">clearing your filters</button>, or <a href="https://wa.me/${taxonomyData.brand?.whatsapp || '918527406482'}?text=Hi%20VINSHO,%20I%20am%20looking%20for%20a%20custom%20product." target="_blank" rel="noopener noreferrer">ask us on WhatsApp &rarr;</a>`;
        document.getElementById('empty-clear-btn')?.addEventListener('click', clearAllFilters);
      } else {
        empty.hidden = true;
      }
    }

    // Re-trigger batch grid GSAP animation without memory leaks
    if (typeof (window as any).refreshCatalogueBatchGrid === 'function') {
      (window as any).refreshCatalogueBatchGrid();
    }
  }

  function clearAllFilters() {
    selectedCols = [];
    selectedSubs = [];
    selectedMats = [];
    selectedAvails = [];
    query = '';
    if (qInput) qInput.value = '';
    syncCheckboxesWithState();
    updateURL();
    draw();
  }

  // Checkbox Change Event Listener
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.custom-checkbox-input');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      syncStateFromCheckboxes();
      updateURL();
      draw();
    });
  });

  // Header & Mobile Clear All Handlers
  clearAllBtnHeader?.addEventListener('click', clearAllFilters);
  mobileClearBtn?.addEventListener('click', clearAllFilters);
  clearAllChipsBtn?.addEventListener('click', clearAllFilters);
  mobileApplyBtn?.addEventListener('click', closeFilterPanel);

  // Desktop sidebar event listeners
  sidebarItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.col;
      const s = btn.dataset.sub;

      if (c === 'all' && s === 'all') {
        selectedCols = [];
        selectedSubs = [];
      } else if (c && s === 'all') {
        selectedCols = [c];
        selectedSubs = [];
      } else if (c && s) {
        selectedCols = [c];
        selectedSubs = [s];
      }

      syncCheckboxesWithState();
      updateURL();
      draw();
    });
  });

  // Mobile collection pills event listeners
  mobileColPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.col;
      if (c === 'all') {
        selectedCols = [];
        selectedSubs = [];
      } else if (c) {
        selectedCols = [c];
        selectedSubs = [];
      }

      syncCheckboxesWithState();
      updateURL();
      draw();
    });
  });

  // Search input listener
  qInput?.addEventListener('input', (e) => {
    query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    updateURL();
    draw();
  });

  // Sort select listener
  sortSelect?.addEventListener('change', (e) => {
    sort = (e.target as HTMLSelectElement).value;
    draw();
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    readParamsFromURL();
    draw();
  });

  // Initial load
  readParamsFromURL();
  draw();
});
