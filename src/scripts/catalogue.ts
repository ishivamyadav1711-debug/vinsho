// Client-side catalogue multi-attribute filtering, slide-over panel, mobile bottom sheet, dynamic counts, active chips, and URL state sync

import taxonomyData from '../../vinsho-taxonomy.json';

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const qInput = document.getElementById('q') as HTMLInputElement | null;
  const sortSelect = document.getElementById('sort') as HTMLSelectElement | null;
  const mobileSortSelect = document.getElementById('mobile-sort-select') as HTMLSelectElement | null;

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
  let availMode: 'all' | 'online' | 'store' = 'all';
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

  // Accordion Toggle Handling inside Filter Panel Drawer
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
    const c = params.get('c') || params.get('category');
    selectedCols = c ? c.split(',') : [];

    const sub = params.get('sub') || params.get('subcategory');
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
    const isGiftingSelected = selectedCols.includes('gifting-collection') || selectedCols.includes('gifting');
    const giftingSubList = document.getElementById('gifting-sidebar-sub-list');

    // Expand subcategories when Gifting Collection is selected or when a subcategory under it is active
    if (giftingSubList) {
      giftingSubList.hidden = !isGiftingSelected && selectedSubs.length === 0;
    }

    sidebarItems.forEach((btn) => {
      const c = btn.dataset.col;
      const sub = btn.dataset.sub;

      if (sub) {
        // Subcategory item (e.g. Candles or Corporate Gifting)
        const isSubActive = selectedSubs.includes(sub);
        btn.classList.toggle('active', isSubActive);
      } else if (c === 'all') {
        btn.classList.toggle('active', selectedCols.length === 0 && selectedSubs.length === 0);
      } else if (c) {
        const isColActive = selectedCols.length === 1 && selectedCols[0] === c;
        const isParentActive = (c === 'gifting-collection' || c === 'gifting') && (isGiftingSelected || selectedSubs.length > 0);

        btn.classList.toggle('active', isColActive && selectedSubs.length === 0);
        btn.classList.toggle('parent-active', isParentActive);
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

  // Availability mode tab button listeners
  const availTabBtns = document.querySelectorAll<HTMLButtonElement>('.avail-tab-btn');
  availTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.availMode || 'all') as 'all' | 'online' | 'store';
      availMode = mode;
      availTabBtns.forEach((b) => b.classList.toggle('active', b === btn));
      if (mode !== 'online' && (selectedSubs.includes('candles') || selectedSubs.includes('corporate-gifting'))) {
        selectedSubs = [];
        syncCheckboxesWithState();
      }
      updateURL();
      draw();
    });
  });

  // Online Subcategory Pills listener (1st Candles, 2nd Corporate Gifting)
  const onlineSubPills = document.querySelectorAll<HTMLButtonElement>('.online-sub-pill');
  onlineSubPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      const subKey = btn.dataset.onlineSub || 'all';
      if (subKey === 'all') {
        selectedSubs = [];
      } else {
        selectedSubs = [subKey];
      }
      syncCheckboxesWithState();
      updateURL();
      draw();
    });
  });

  function getFilteredProducts() {
    return items.filter((item) => {
      // Availability Mode Filter: Gifting Collection = Available Online, All Other = Store Only
      const isGiftingCol = item.colKey === 'gifting' || item.colKey === 'gifting-collection';
      const matchesAvailMode = 
        availMode === 'all' ||
        (availMode === 'online' && isGiftingCol) ||
        (availMode === 'store' && !isGiftingCol);

      // Collection Filter (OR inside group)
      const matchesCol = selectedCols.length === 0 || selectedCols.includes(item.colKey);

      // Sub-category Filter (OR inside group)
      const matchesSub = selectedSubs.length === 0 || selectedSubs.includes(item.subKey);

      // Material Filter (OR inside group)
      const matchesMat = selectedMats.length === 0 || (item.matKey && selectedMats.includes(item.matKey));

      // Search Query
      const searchableText = `${item.name} ${item.desc} ${item.eyebrow} ${item.rawMaterial} ${item.colKey} ${item.subKey}`.toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);

      return matchesAvailMode && matchesCol && matchesSub && matchesMat && matchesQuery;
    });
  }

  function draw() {
    updateSidebarState();
    updateMobilePillsState();
    updateChipsBar();

    // Online subcategories bar visibility & active state sync
    const onlineSubBar = document.getElementById('online-subcategories-bar');
    if (onlineSubBar) {
      if (availMode === 'online') {
        onlineSubBar.hidden = false;
        onlineSubPills.forEach((pill) => {
          const subKey = pill.dataset.onlineSub || 'all';
          if (subKey === 'all') {
            pill.classList.toggle('active', selectedSubs.length === 0);
          } else {
            pill.classList.toggle('active', selectedSubs.includes(subKey));
          }
        });
      } else {
        onlineSubBar.hidden = true;
      }
    }

    const filtered = getFilteredProducts();

    // Dynamic result count & banner header update
    const activeHeadingEl = document.getElementById('active-collection-heading');
    const activeCountEl = document.getElementById('active-collection-count');
    if (activeHeadingEl && activeCountEl) {
      if (selectedSubs.length === 1) {
        let subName = selectedSubs[0];
        taxonomyData.collections.forEach(col => {
          const s = col.subcategories.find(sub => sub.key === selectedSubs[0]);
          if (s) subName = s.name;
        });
        activeHeadingEl.textContent = subName.toUpperCase();
      } else if (selectedCols.length === 1) {
        const colObj = taxonomyData.collections.find((c) => c.key === selectedCols[0]);
        activeHeadingEl.textContent = colObj ? colObj.name.toUpperCase() : selectedCols[0].toUpperCase();
      } else {
        activeHeadingEl.textContent = 'ALL PRODUCTS';
      }
      activeCountEl.textContent = `${filtered.length} products`;
    }

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
        empty.innerHTML = `No products match those filter criteria. Try <button id="empty-clear-btn" style="background:none;border:none;color:var(--maroon);text-decoration:underline;cursor:pointer;font-size:inherit;">clearing your filters</button>, or <a href="https://wa.me/${taxonomyData.brand?.whatsapp || '919625515351'}?text=Hi%20VINSHO,%20I%20am%20looking%20for%20a%20custom%20product." target="_blank" rel="noopener noreferrer">ask us on WhatsApp &rarr;</a>`;
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

  // Desktop sidebar collection & subcategory item click handlers
  sidebarItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.col;
      const sub = btn.dataset.sub;

      if (sub && c) {
        selectedCols = [c];
        selectedSubs = [sub];
      } else if (c === 'all') {
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

  // Sort select listeners
  sortSelect?.addEventListener('change', (e) => {
    sort = (e.target as HTMLSelectElement).value;
    if (mobileSortSelect) mobileSortSelect.value = sort;
    draw();
    updateMobileAccordionUI();
  });

  mobileSortSelect?.addEventListener('change', (e) => {
    sort = (e.target as HTMLSelectElement).value;
    if (sortSelect) sortSelect.value = sort;
    draw();
    updateMobileAccordionUI();
  });

  // ==========================================================================
  // MOBILE ACCORDION MUTUALLY-EXCLUSIVE CONTROL BAR STATE & LOGIC
  // ==========================================================================
  let activeMobilePanel: 'search' | 'filter' | 'categories' | 'sort' | null = null;

  const mBtnSearch = document.getElementById('m-btn-search');
  const mBtnFilter = document.getElementById('m-btn-filter');
  const mBtnCategories = document.getElementById('m-btn-categories');
  const mBtnSort = document.getElementById('m-btn-sort');

  const mPanelSearch = document.getElementById('m-panel-search');
  const mPanelCategories = document.getElementById('m-panel-categories');
  const mPanelSort = document.getElementById('m-panel-sort');

  const qMobileInput = document.getElementById('q-mobile') as HTMLInputElement | null;
  const mSearchCloseBtn = document.getElementById('m-search-close-btn');

  const mSearchDot = document.getElementById('m-search-dot');
  const mFilterBadge = document.getElementById('m-filter-badge');
  const mCatDot = document.getElementById('m-cat-dot');
  const mSortBtnLabel = document.getElementById('m-sort-btn-label');

  const mAvailButtons = document.querySelectorAll<HTMLButtonElement>('[data-m-avail]');
  const mColButtons = document.querySelectorAll<HTMLButtonElement>('[data-m-col]');
  const mOnlineSubButtons = document.querySelectorAll<HTMLButtonElement>('[data-m-online-sub]');
  const mSortButtons = document.querySelectorAll<HTMLButtonElement>('[data-m-sort]');

  const mOnlineSubTitle = document.getElementById('m-online-subcat-title');
  const mOnlineSubRow = document.getElementById('m-online-subcat-row');

  function updateMobileAccordionUI() {
    // Toggle active classes on triggers
    mBtnSearch?.classList.toggle('active', activeMobilePanel === 'search');
    mBtnFilter?.classList.toggle('active', activeMobilePanel === 'filter');
    mBtnCategories?.classList.toggle('active', activeMobilePanel === 'categories');
    mBtnSort?.classList.toggle('active', activeMobilePanel === 'sort');

    mBtnSearch?.setAttribute('aria-expanded', activeMobilePanel === 'search' ? 'true' : 'false');
    mBtnFilter?.setAttribute('aria-expanded', activeMobilePanel === 'filter' ? 'true' : 'false');
    mBtnCategories?.setAttribute('aria-expanded', activeMobilePanel === 'categories' ? 'true' : 'false');
    mBtnSort?.setAttribute('aria-expanded', activeMobilePanel === 'sort' ? 'true' : 'false');

    // Mutually exclusive panel visibility
    if (mPanelSearch) mPanelSearch.hidden = (activeMobilePanel !== 'search');
    if (mPanelCategories) mPanelCategories.hidden = (activeMobilePanel !== 'categories');
    if (mPanelSort) mPanelSort.hidden = (activeMobilePanel !== 'sort');

    // Active state indicators
    if (mSearchDot) mSearchDot.hidden = query.length === 0;
    
    const activeFilterCount = selectedCols.length + selectedSubs.length + selectedMats.length + selectedAvails.length;
    if (mFilterBadge) {
      mFilterBadge.hidden = activeFilterCount === 0;
      mFilterBadge.textContent = String(activeFilterCount);
    }

    if (mCatDot) mCatDot.hidden = (selectedCols.length === 0 && selectedSubs.length === 0 && availMode === 'all');

    if (mSortBtnLabel) {
      if (sort === 'az') mSortBtnLabel.textContent = 'A–Z';
      else if (sort === 'za') mSortBtnLabel.textContent = 'Z–A';
      else if (sort === 'cat') mSortBtnLabel.textContent = 'Category';
      else mSortBtnLabel.textContent = 'Sort';
    }

    // Sync input values with main inputs
    if (qMobileInput && qMobileInput.value !== query) {
      qMobileInput.value = query;
    }

    // Sync availability mode buttons in mobile panel
    mAvailButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mAvail === availMode);
    });

    // Show online subcategories inside mobile category panel when online mode is active
    if (mOnlineSubTitle && mOnlineSubRow) {
      const isOnlineMode = availMode === 'online';
      mOnlineSubTitle.hidden = !isOnlineMode;
      mOnlineSubRow.hidden = !isOnlineMode;
    }

    // Sync collection buttons in mobile panel
    mColButtons.forEach((btn) => {
      const colVal = btn.dataset.mCol;
      const isAct = (colVal === 'all' && selectedCols.length === 0) || (colVal && selectedCols.includes(colVal));
      btn.classList.toggle('active', Boolean(isAct));
    });

    // Sync sort buttons in mobile panel
    mSortButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mSort === sort);
    });
  }

  // Trigger clicks
  mBtnSearch?.addEventListener('click', () => {
    activeMobilePanel = (activeMobilePanel === 'search') ? null : 'search';
    updateMobileAccordionUI();
    if (activeMobilePanel === 'search' && qMobileInput) {
      setTimeout(() => qMobileInput.focus(), 60);
    }
  });

  mBtnFilter?.addEventListener('click', () => {
    activeMobilePanel = null;
    updateMobileAccordionUI();
    openFilterPanel();
  });

  mBtnCategories?.addEventListener('click', () => {
    activeMobilePanel = (activeMobilePanel === 'categories') ? null : 'categories';
    updateMobileAccordionUI();
  });

  mBtnSort?.addEventListener('click', () => {
    activeMobilePanel = (activeMobilePanel === 'sort') ? null : 'sort';
    updateMobileAccordionUI();
  });

  mSearchCloseBtn?.addEventListener('click', () => {
    activeMobilePanel = null;
    updateMobileAccordionUI();
  });

  // Search input in mobile panel
  qMobileInput?.addEventListener('input', (e) => {
    query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    if (qInput) qInput.value = (e.target as HTMLInputElement).value;
    updateURL();
    draw();
    updateMobileAccordionUI();
  });

  // Availability mode buttons in mobile panel
  mAvailButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = (btn.dataset.mAvail || 'all') as 'all' | 'online' | 'store';
      availMode = mode;
      
      document.querySelectorAll('.avail-tab-btn').forEach((tab) => {
        tab.classList.toggle('active', (tab as HTMLElement).dataset.availMode === mode);
      });

      if (mode === 'store') {
        selectedCols = selectedCols.filter(c => c !== 'gifting-collection');
        selectedSubs = [];
      }

      syncCheckboxesWithState();
      updateURL();
      draw();
      updateMobileAccordionUI();
    });
  });

  // Collection buttons in mobile panel
  mColButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.mCol;
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
      updateMobileAccordionUI();
    });
  });

  // Online subcategories in mobile panel
  mOnlineSubButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.mOnlineSub;
      mOnlineSubButtons.forEach(b => b.classList.toggle('active', b === btn));
      
      if (sub === 'all') {
        selectedCols = ['gifting-collection'];
        selectedSubs = [];
      } else if (sub) {
        selectedCols = ['gifting-collection'];
        selectedSubs = [sub];
      }

      syncCheckboxesWithState();
      updateURL();
      draw();
      updateMobileAccordionUI();
    });
  });

  // Sort buttons in mobile panel
  mSortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.mSort;
      if (val) {
        sort = val;
        if (sortSelect) sortSelect.value = sort;
        if (mobileSortSelect) mobileSortSelect.value = sort;
        draw();
        activeMobilePanel = null;
        updateMobileAccordionUI();
      }
    });
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    readParamsFromURL();
    draw();
    updateMobileAccordionUI();
  });

  // Initial load
  readParamsFromURL();
  draw();
  updateMobileAccordionUI();
});
