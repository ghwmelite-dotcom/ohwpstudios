// Admin Contracts Management Script

class ContractsAdmin {
  constructor() {
    this.token = localStorage.getItem('admin_token');
    this.currentTab = 'contracts';
    this.currentFilter = 'all';
    this.contracts = [];
    this.templates = [];

    if (!this.token) {
      window.location.href = '/admin/login';
      return;
    }

    this.init();
  }

  init() {
    this.setupTabs();
    this.setupFilters();
    this.setupButtons();
    this.setupLogout();
    this.loadContracts();
    this.loadTemplates();
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update nav items
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tab}`);
    });

    // Load data for the tab if needed
    if (tab === 'contracts' && this.contracts.length === 0) {
      this.loadContracts();
    } else if (tab === 'templates' && this.templates.length === 0) {
      this.loadTemplates();
    } else if (tab === 'create') {
      this.loadTemplatesForSelect();
    }
  }

  setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.currentTarget.dataset.status;
        this.filterContracts(status);
      });
    });

    const searchInput = document.getElementById('contract-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchContracts(e.target.value);
      });
    }
  }

  setupButtons() {
    document.getElementById('btn-new-contract')?.addEventListener('click', () => {
      this.switchTab('create');
    });

    document.getElementById('btn-cancel-create')?.addEventListener('click', () => {
      this.switchTab('contracts');
      document.getElementById('create-contract-form')?.reset();
    });

    document.getElementById('create-contract-form')?.addEventListener('submit', (e) => {
      this.handleCreateContract(e);
    });

    document.getElementById('btn-new-template')?.addEventListener('click', () => {
      alert('Template creation coming soon!');
    });
  }

  setupLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    });
  }

  async loadContracts() {
    const container = document.getElementById('contracts-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading contracts...</p></div>';

    try {
      const response = await fetch('/api/admin/contracts', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load contracts');

      this.contracts = await response.json();
      this.renderContracts(this.contracts);
    } catch (error) {
      console.error('Error loading contracts:', error);
      container.innerHTML = '<div class="error-state"><p>Failed to load contracts</p></div>';
    }
  }

  async loadTemplates() {
    const container = document.getElementById('templates-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading templates...</p></div>';

    try {
      const response = await fetch('/api/admin/contract-templates?active=true', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load templates');

      this.templates = await response.json();
      this.renderTemplates(this.templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      container.innerHTML = '<div class="error-state"><p>Failed to load templates</p></div>';
    }
  }

  async loadTemplatesForSelect() {
    const select = document.getElementById('template-select');
    select.innerHTML = '<option value="">Loading templates...</option>';

    try {
      const response = await fetch('/api/admin/contract-templates?active=true', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load templates');

      const templates = await response.json();

      select.innerHTML = '<option value="">-- Select a template --</option>';
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        option.dataset.content = template.template_content;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      select.innerHTML = '<option value="">Error loading templates</option>';
    }
  }

  renderContracts(contracts) {
    const container = document.getElementById('contracts-list');

    if (contracts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No contracts found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = contracts.map(contract => this.contractCardHTML(contract)).join('');

    // Attach event listeners
    contracts.forEach(contract => {
      document.getElementById(`view-${contract.id}`)?.addEventListener('click', () => {
        this.viewContract(contract.id);
      });
      document.getElementById(`send-${contract.id}`)?.addEventListener('click', () => {
        this.sendContract(contract.id);
      });
      document.getElementById(`delete-${contract.id}`)?.addEventListener('click', () => {
        this.deleteContract(contract.id);
      });
    });
  }

  contractCardHTML(contract) {
    const createdDate = new Date(contract.created_at).toLocaleDateString();

    return `
      <div class="contract-card">
        <div class="contract-card-header">
          <div>
            <p class="contract-number">${contract.contract_number}</p>
            <h3 class="contract-title">${contract.title}</h3>
          </div>
          <span class="status-badge ${contract.status}">${contract.status}</span>
        </div>

        <div class="contract-meta">
          <div class="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>${contract.client_name}</span>
          </div>

          <div class="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Created ${createdDate}</span>
          </div>

          ${contract.total_amount ? `
          <div class="meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>${contract.currency || 'USD'} ${parseFloat(contract.total_amount).toFixed(2)}</span>
          </div>
          ` : ''}
        </div>

        <div class="contract-actions">
          <button class="btn-icon" id="view-${contract.id}" title="View Contract">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          ${contract.status === 'draft' || contract.status === 'sent' ? `
          <button class="btn-icon" id="send-${contract.id}" title="Send to Client">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
          ` : ''}

          <button class="btn-icon" id="delete-${contract.id}" title="Delete Contract">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  renderTemplates(templates) {
    const container = document.getElementById('templates-list');

    if (templates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No templates found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = templates.map(template => `
      <div class="template-card">
        <div class="contract-card-header">
          <div>
            <p class="contract-number">${template.category || 'General'}</p>
            <h3 class="contract-title">${template.name}</h3>
          </div>
        </div>
        <p style="color: var(--color-text-muted); font-size: 0.875rem; margin: 1rem 0;">
          ${template.description || 'No description'}
        </p>
        <div class="contract-actions">
          <button class="btn-icon" title="Use Template">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  filterContracts(status) {
    this.currentFilter = status;

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === status);
    });

    // Filter contracts
    const filtered = status === 'all'
      ? this.contracts
      : this.contracts.filter(c => c.status === status);

    this.renderContracts(filtered);
  }

  searchContracts(query) {
    const filtered = this.contracts.filter(contract => {
      const searchStr = query.toLowerCase();
      return contract.title.toLowerCase().includes(searchStr) ||
             contract.client_name.toLowerCase().includes(searchStr) ||
             contract.contract_number.toLowerCase().includes(searchStr);
    });

    this.renderContracts(filtered);
  }

  async handleCreateContract(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const formData = new FormData(form);
      const templateSelect = document.getElementById('template-select');
      const selectedOption = templateSelect.options[templateSelect.selectedIndex];

      // Get template content and fill placeholders
      let content = selectedOption.dataset.content || '';

      // Simple placeholder replacement
      const replacements = {
        'contract_date': new Date().toLocaleDateString(),
        'client_name': formData.get('client_name'),
        'client_company': formData.get('client_company') || '',
        'client_email': formData.get('client_email'),
        'client_phone': formData.get('client_phone') || '',
        'client_address': formData.get('client_address') || '',
        'project_title': formData.get('title'),
        'project_description': formData.get('description') || '',
        'total_amount': formData.get('total_amount') || '0.00',
        'currency': formData.get('currency'),
        'payment_terms': formData.get('payment_terms') || '',
        'start_date': formData.get('start_date') || '',
        'end_date': formData.get('end_date') || '',
        'delivery_date': formData.get('delivery_date') || ''
      };

      // Replace placeholders
      Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, replacements[key]);
      });

      const data = {
        template_id: formData.get('template_id'),
        client_name: formData.get('client_name'),
        client_email: formData.get('client_email'),
        client_company: formData.get('client_company'),
        client_phone: formData.get('client_phone'),
        client_address: formData.get('client_address'),
        title: formData.get('title'),
        description: formData.get('description'),
        content: content,
        total_amount: formData.get('total_amount'),
        currency: formData.get('currency'),
        payment_terms: formData.get('payment_terms'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        delivery_date: formData.get('delivery_date'),
        notes: formData.get('notes'),
        status: 'draft'
      };

      const response = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create contract');

      const result = await response.json();

      alert(`Contract created successfully! Contract Number: ${result.contract_number}`);
      form.reset();
      this.loadContracts();
      this.switchTab('contracts');
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Contract';
    }
  }

  async viewContract(id) {
    window.open(`/contract/${id}`, '_blank');
  }

  async sendContract(id) {
    if (!confirm('Send this contract to the client?')) return;

    try {
      const response = await fetch('/api/admin/contracts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          contract_id: id,
          message: 'Please review and sign the contract using the link below.'
        })
      });

      if (!response.ok) throw new Error('Failed to send contract');

      const result = await response.json();

      alert(`Contract sent successfully!\n\nContract URL:\n${result.contract_url}\n\nCopy this link and send it to your client.`);

      this.loadContracts();
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Failed to send contract: ' + error.message);
    }
  }

  async deleteContract(id) {
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/contracts?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete contract');

      alert('Contract deleted successfully');
      this.loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract: ' + error.message);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContractsAdmin());
} else {
  new ContractsAdmin();
}
