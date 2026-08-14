import content from '../../vinsho-content.json';

document.addEventListener('DOMContentLoaded', () => {
  const mask = document.getElementById('mask');
  const modal = document.getElementById('modal');
  const cartBadge = document.getElementById('cartN');
  const toast = document.getElementById('toast');

  if (!mask || !modal) return;

  const WA = `https://wa.me/${content.brand.whatsapp}?text=`;

  const CATNAME: Record<string, string> = {
    decor: 'Home Décor',
    furnishing: 'Home Furnishings',
    special: 'Table & Living',
    gifting: 'Gifting Collection'
  };

  const bySlug = Object.fromEntries(content.products.map(i => [i.slug, i]));
  const looks = content.lookbook;

  let cartCount = 0;
  let currentQty = 1;

  function showToast(msg: string) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('on');
    setTimeout(() => toast.classList.remove('on'), 2500);
  }

  function openModal(html: string) {
    const X = `<button class="x" data-close aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M6 6l12 12M18 6 6 18"/>
      </svg>
    </button>`;
    modal!.innerHTML = X + html;
    mask!.classList.add('on');
    document.body.classList.add('lock');

    // Focus close button
    const xBtn = modal!.querySelector<HTMLButtonElement>('.x');
    xBtn?.focus();
  }

  function closeModal() {
    mask!.classList.remove('on');
    document.body.classList.remove('lock');
  }

  function openProductModal(slug: string) {
    const item = bySlug[slug];
    if (!item) return;

    currentQty = 1;
    const catLabel = item.collectionKey && CATNAME[item.collectionKey] ? CATNAME[item.collectionKey] : item.collection;

    const waMsg = encodeURIComponent(`Hi VINSHO, I would like a custom quote for ${item.name} (${catLabel}). Quantity: ${currentQty}`);

    const html = `
      <div class="m-img">
        <img src="${item.image}" alt="${item.name}">
        <span class="m-tag">${catLabel}</span>
      </div>
      <div class="m-body">
        <p class="m-eye">${catLabel} &middot; ${item.material}</p>
        <h3>${item.name}</h3>
        <p class="m-price">Price on request</p>
        <p>${item.description}</p>
        <div class="m-box">
          <b>Material &amp; Craftsmanship</b>
          <span>${item.material}</span>
        </div>
        <div class="m-badges">
          <span><i>✓</i>Verified craftsmanship</span>
          <span><i>✓</i>Insured pan-India shipping</span>
        </div>

        <div class="m-enquire-form-wrapper">
          <form class="m-enquire-form" id="m-modal-enquire-form">
            <input type="hidden" name="productSlug" value="${item.slug}" />
            <input type="hidden" name="collectionKey" value="${item.collectionKey || ''}" />
            <input type="hidden" name="subcategoryKey" value="${item.subcategoryKey || ''}" />
            <input type="text" name="website_url" style="display:none !important; tab-index:-1;" tabindex="-1" autocomplete="off" />
            <div class="m-form-inputs">
              <input type="text" name="name" placeholder="Your Full Name *" required class="m-input" />
              <input type="tel" name="phone" placeholder="Phone Number *" required class="m-input" />
              <input type="email" name="email" placeholder="Email Address (Optional)" class="m-input" />
            </div>
            <div class="dpdp-consent-row" style="margin-block: 0.5rem; font-size: 0.72rem; color: var(--ink-soft);">
              <label style="display: flex; gap: 0.4rem; align-items: flex-start; cursor: pointer;">
                <input type="checkbox" name="dpdp_consent" checked required style="margin-top: 0.15rem;" />
                <span>I agree to be contacted by VINSHO regarding this product quotation under DPDP Act 2023.</span>
              </label>
            </div>
            <button type="submit" class="m-submit-btn" id="m-submit-btn">Submit Enquiry to VINSHO</button>
            <p class="m-form-msg" id="m-form-msg" style="display:none; margin-top:0.5rem; font-size:0.813rem; color:var(--maroon);"></p>
          </form>
        </div>

        <div class="m-cta" style="margin-top: 1rem;">
          <span class="qty">
            <button data-q="-1" aria-label="Decrease quantity">&minus;</button>
            <span id="qv">1</span>
            <button data-q="1" aria-label="Increase quantity">+</button>
          </span>
          <a class="outline" id="m-wa-link" target="_blank" rel="noopener noreferrer" href="${WA}${waMsg}">
            Instant WhatsApp Quote
          </a>
        </div>
      </div>
    `;

    openModal(html);

    // Form submit listener
    const form = document.getElementById('m-modal-enquire-form') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('m-submit-btn') as HTMLButtonElement | null;
        const msgEl = document.getElementById('m-form-msg');
        const waLink = document.getElementById('m-wa-link') as HTMLAnchorElement | null;
        if (submitBtn) submitBtn.disabled = true;

        const formData = new FormData(form);
        const body = {
          name: formData.get('name'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          productSlug: formData.get('productSlug'),
          collectionKey: formData.get('collectionKey'),
          subcategoryKey: formData.get('subcategoryKey'),
          website_url: formData.get('website_url'),
          dpdp_consent: formData.get('dpdp_consent') === 'on',
          source: 'Product Quick View Modal'
        };

        try {
          const res = await fetch('/api/enquiries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          if (data.whatsappUrl && waLink) {
            waLink.href = data.whatsappUrl;
          }
          setTimeout(() => closeModal(), 2200);
        } catch (err) {
          if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.textContent = 'Enquiry submitted! Our team will contact you.';
          }
          setTimeout(() => closeModal(), 2000);
        }
      });
    }
  }

  function openLookbookModal(index: number) {
    const look = looks[index];
    if (!look) return;

    const waMsg = encodeURIComponent(`Hi VINSHO, I would like to inquire about the pieces in the "${look.title}" lookbook.`);

    const html = `
      <div class="m-img">
        <img src="${look.image}" alt="${look.title}">
        <span class="m-tag">${look.tag}</span>
      </div>
      <div class="m-body">
        <p class="m-eye">${look.tag} &middot; Lookbook</p>
        <h3>${look.title}</h3>
        <p>${look.description}</p>
        <div class="m-box">
          <b>Styling note</b>
          <span>${look.stylingNote}</span>
        </div>
        <a class="solid" target="_blank" rel="noopener noreferrer" href="${WA}${waMsg}">
          Get quote for this look
        </a>
      </div>
    `;

    openModal(html);
  }

  function addToCart(slug: string, qty = 1) {
    const item = bySlug[slug];
    const name = item ? item.name : 'Item';
    cartCount += qty;
    if (cartBadge) {
      cartBadge.textContent = cartCount.toString();
    }
    showToast(`Added ${qty} × ${name} to enquiry`);
  }

  // Delegated event listener on document for modal triggers and actions
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Close button or backdrop
    if (target.closest('[data-close]') || target.id === 'mask') {
      closeModal();
      return;
    }

    // Product quick view trigger
    const openBtn = target.closest<HTMLElement>('[data-open]');
    if (openBtn) {
      const slug = openBtn.dataset.open;
      if (slug) openProductModal(slug);
      return;
    }

    // Lookbook trigger
    const lookBtn = target.closest<HTMLElement>('[data-look]');
    if (lookBtn) {
      const idx = parseInt(lookBtn.dataset.look || '0', 10);
      openLookbookModal(idx);
      return;
    }

    // Direct add button on product card
    const addBtn = target.closest<HTMLElement>('[data-add]');
    if (addBtn) {
      e.stopPropagation();
      const slug = addBtn.dataset.add;
      if (slug) addToCart(slug, 1);
      return;
    }

    // Add button inside product modal
    const addModalBtn = target.closest<HTMLElement>('[data-add-modal]');
    if (addModalBtn) {
      const slug = addModalBtn.dataset.addModal;
      if (slug) {
        addToCart(slug, currentQty);
        closeModal();
      }
      return;
    }

    // Quantity stepper inside modal
    const qBtn = target.closest<HTMLElement>('[data-q]');
    if (qBtn) {
      const change = parseInt(qBtn.dataset.q || '0', 10);
      currentQty = Math.max(1, currentQty + change);
      const qv = document.getElementById('qv');
      if (qv) qv.textContent = currentQty.toString();

      // Update WhatsApp link text
      const waLink = document.getElementById('m-wa-link') as HTMLAnchorElement | null;
      if (waLink && modal) {
        const slug = modal.querySelector<HTMLElement>('[data-add-modal]')?.dataset.addModal;
        if (slug && bySlug[slug]) {
          const item = bySlug[slug];
          const catLabel = item.collectionKey && CATNAME[item.collectionKey] ? CATNAME[item.collectionKey] : item.collection;
          const msg = encodeURIComponent(`Hi VINSHO, I would like a custom quote for ${item.name} (${catLabel}). Quantity: ${currentQty}`);
          waLink.href = `${WA}${msg}`;
        }
      }
    }
  });

  // Escape key listener to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mask.classList.contains('on')) {
      closeModal();
    }
  });
});
