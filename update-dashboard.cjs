const fs = require('fs');

function updateFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // 1. Update the table row button
  content = content.replace(
    /<button class="btn-sm-action" data-enquiry-id=\{e\.id\} onclick=\{`updateEnquiryStatus\(\$\{e\.id\}\)`\}>\s*Update &rarr;\s*<\/button>/g,
    `<button class="btn-sm-action update-status-btn" data-id={e.id} data-customer={e.customer_name} data-status={e.status}>
                      Update &rarr;
                    </button>`
  );

  // 2. Add Modal HTML before </AdminLayout>
  const modalHtml = `
    <!-- Update Status Modal -->
    <div id="status-modal" class="modal-overlay" hidden>
      <div class="modal-surface" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
        <div class="modal-header">
          <h3 id="status-modal-title">Update Pipeline Status</h3>
          <button class="modal-close" id="modal-close-btn" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="info-group">
            <label>Customer</label>
            <div class="info-val" id="modal-customer-name">--</div>
          </div>
          <div class="info-group">
            <label>Current Status</label>
            <div class="info-val" id="modal-current-status">--</div>
          </div>
          <div class="field-group">
            <label for="modal-status-select">New Pipeline Status</label>
            <div class="select-wrapper">
              <select id="modal-status-select">
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>
          <div class="field-group" id="lost-reason-group" hidden>
            <label for="modal-lost-reason">Lost Reason <span class="req">*</span></label>
            <input type="text" id="modal-lost-reason" placeholder="Why was this lost?" />
          </div>
          <div class="field-group">
            <label for="modal-note">Optional Follow-up Note</label>
            <textarea id="modal-note" rows="3" placeholder="Enter any relevant note..."></textarea>
          </div>
          <p class="error-msg" id="modal-error" hidden></p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" id="modal-cancel-btn">Cancel</button>
          <button class="btn-primary" id="modal-update-btn">Update Status</button>
        </div>
      </div>
    </div>
`;
  content = content.replace('</AdminLayout>', modalHtml + '\n</AdminLayout>');

  // 3. Replace updateEnquiryStatus function with the new logic
  const oldScript = /async function updateEnquiryStatus\(id\) \{[\s\S]*?\}\s*<\/script>/;
  const newScript = `
  let currentEnquiryId = null;
  let currentRow = null;

  const modal = document.getElementById('status-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalUpdateBtn = document.getElementById('modal-update-btn');
  const statusSelect = document.getElementById('modal-status-select');
  const lostReasonGroup = document.getElementById('lost-reason-group');
  const errorMsg = document.getElementById('modal-error');

  function closeModal() {
    modal.hidden = true;
    errorMsg.hidden = true;
  }

  document.querySelectorAll('.update-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEnquiryId = btn.dataset.id;
      currentRow = btn.closest('tr');
      const customer = btn.dataset.customer;
      const status = btn.dataset.status;

      document.getElementById('modal-customer-name').textContent = customer;
      document.getElementById('modal-current-status').textContent = status;
      statusSelect.value = status;
      lostReasonGroup.hidden = (status !== 'Lost');
      document.getElementById('modal-lost-reason').value = '';
      document.getElementById('modal-note').value = '';
      errorMsg.hidden = true;
      modalUpdateBtn.disabled = false;
      modalUpdateBtn.textContent = 'Update Status';
      
      modal.hidden = false;
    });
  });

  statusSelect.addEventListener('change', () => {
    lostReasonGroup.hidden = (statusSelect.value !== 'Lost');
  });

  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
  
  // Close on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modalUpdateBtn.addEventListener('click', async () => {
    const status = statusSelect.value;
    const lostReason = document.getElementById('modal-lost-reason').value.trim();
    const note = document.getElementById('modal-note').value.trim();

    if (status === 'Lost' && !lostReason) {
      errorMsg.textContent = 'Lost Reason is mandatory.';
      errorMsg.hidden = false;
      return;
    }

    modalUpdateBtn.disabled = true;
    modalUpdateBtn.textContent = 'Saving...';
    errorMsg.hidden = true;

    try {
      const res = await fetch(\`/api/admin/enquiries/\${currentEnquiryId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, lostReason, note })
      });

      const json = await res.json();
      if (json.success || res.ok) {
        // Show success notification if available, or just alert for fallback
        if (window.showToast) window.showToast('Pipeline status updated successfully.', 'success');
        
        // Update DOM
        if (currentRow) {
          const badge = currentRow.querySelector('.status-badge');
          if (badge) {
            badge.textContent = status;
            badge.dataset.status = status;
          }
          // Update the button's data attribute as well
          const btn = currentRow.querySelector('.update-status-btn');
          if (btn) btn.dataset.status = status;
        }
        closeModal();
      } else {
        errorMsg.textContent = \`Error: \${json.error || 'Failed to update'}\`;
        errorMsg.hidden = false;
      }
    } catch (err) {
      errorMsg.textContent = 'Network error. Please try again.';
      errorMsg.hidden = false;
    } finally {
      modalUpdateBtn.disabled = false;
      modalUpdateBtn.textContent = 'Update Status';
    }
  });
</script>
`;
  content = content.replace(oldScript, newScript);

  // 4. Update the CSS for badges and modal
  const cssMod = `
  /* Modal Styles */
  .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: fadeIn 0.2s ease; }
  .modal-overlay[hidden] { display: none !important; }
  .modal-surface { background: #fff; width: 100%; max-width: 460px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
  .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .modal-header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 700; }
  .modal-close { background: none; border: none; font-size: 1.5rem; color: #64748b; cursor: pointer; padding: 0; line-height: 1; transition: color 0.2s; }
  .modal-close:hover { color: #0f172a; }
  .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .info-group label, .field-group label { display: block; font-size: 0.781rem; font-weight: 600; color: #64748b; margin-bottom: 0.35rem; }
  .info-val { font-size: 0.95rem; font-weight: 500; color: #0f172a; }
  .field-group input, .field-group textarea, .field-group select { width: 100%; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1; border-radius: 4px; font-family: inherit; font-size: 0.9rem; color: #0f172a; background: #fff; transition: border-color 0.2s; }
  .field-group input:focus, .field-group textarea:focus, .field-group select:focus { outline: none; border-color: #8A174B; }
  .modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 0.75rem; background: #f8fafc; border-radius: 0 0 8px 8px; }
  .btn-cancel { padding: 0.6rem 1rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.88rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; }
  .btn-cancel:hover { background: #f1f5f9; color: #0f172a; }
  .btn-primary { padding: 0.6rem 1rem; background: #8A174B; border: 1px solid #8A174B; border-radius: 4px; font-size: 0.88rem; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.2s; }
  .btn-primary:hover { background: #6d123b; }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  .req { color: #ef4444; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

  /* Redesigned Table Badges */
  .status-badge { display: inline-flex; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 3px; background: #f1f5f9; color: #475569; }
  .status-badge[data-status="New"] { background: #f1f5f9; color: #475569; }
  .status-badge[data-status="Contacted"] { background: #e0f2fe; color: #0284c7; }
  .status-badge[data-status="Qualified"] { background: #f3e8ff; color: #7e22ce; }
  .status-badge[data-status="Quotation Sent"] { background: #fef3c7; color: #d97706; }
  .status-badge[data-status="Negotiation"] { background: #ffedd5; color: #ea580c; }
  .status-badge[data-status="Converted"] { background: #dcfce7; color: #15803d; }
  .status-badge[data-status="Lost"] { background: #fee2e2; color: #b91c1c; }

  /* Clean up existing badge CSS */`;
  
  content = content.replace(
    /\.status-badge\s*\{[\s\S]*?\}\s*\.status-badge\[data-status="Converted"\]\s*\{[\s\S]*?\}\s*\.status-badge\[data-status="Lost"\]\s*\{[\s\S]*?\}/,
    cssMod
  );

  // Improve Table button
  content = content.replace(
    /\.btn-sm-action\s*\{[\s\S]*?\}/,
    `.btn-sm-action { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; font-weight: 600; font-size: 0.75rem; padding: 0.35rem 0.75rem; border-radius: 4px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
  .btn-sm-action:hover { background: #f8fafc; border-color: #94a3b8; }`
  );

  fs.writeFileSync(path, content, 'utf8');
}

updateFile('src/pages/crm/dashboard.astro');
updateFile('src/pages/crm/crm.astro');

console.log('Update complete!');
