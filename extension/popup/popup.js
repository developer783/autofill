document.addEventListener('DOMContentLoaded', async () => {
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
  const backToMainBtn = document.getElementById('backToMainBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  const profileSelect = document.getElementById('profileSelect');
  const fillBtn = document.getElementById('fillBtn');
  const statusMessage = document.getElementById('statusMessage');
  const metricsCard = document.getElementById('metricsCard');
  const serverUrlInput = document.getElementById('serverUrlInput');

  // Load extension storage settings
  chrome.storage.local.get({
    serverUrl: ''
  }, (items) => {
    serverUrlInput.value = items.serverUrl || '';
    if (!items.serverUrl) {
      showBanner("Please configure the Server URL in Settings.", "error");
      showSettingsView();
    } else {
      loadProfileList();
    }
  });

  function showMainView() {
    mainView.classList.remove('hidden');
    settingsView.classList.add('hidden');
  }

  function showSettingsView() {
    mainView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  }

  toggleSettingsBtn.addEventListener('click', () => {
    if (settingsView.classList.contains('hidden')) {
      showSettingsView();
    } else {
      showMainView();
    }
  });

  backToMainBtn.addEventListener('click', showMainView);

  saveSettingsBtn.addEventListener('click', () => {
    let serverUrl = serverUrlInput.value.trim();
    if (serverUrl && !serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `https://${serverUrl}`;
    }

    chrome.storage.local.set({ serverUrl }, () => {
      showBanner('Settings saved successfully!', 'success');
      showMainView();
      loadProfileList();
    });
  });

  function showBanner(text, type = 'error') {
    statusMessage.textContent = text;
    statusMessage.className = `status-banner ${type}`;
    statusMessage.classList.remove('hidden');
  }

  function hideBanner() {
    statusMessage.classList.add('hidden');
  }

  async function loadProfileList() {
    profileSelect.innerHTML = '<option value="">Loading candidate profiles...</option>';
    hideBanner();

    chrome.runtime.sendMessage({ type: 'GET_PROFILES' }, (response) => {
      if (chrome.runtime.lastError) {
        showBanner("Can't reach server — check the URL in Settings", 'error');
        profileSelect.innerHTML = '<option value="">Can\'t reach server</option>';
        return;
      }

      if (!response || !response.success) {
        profileSelect.innerHTML = '<option value="">Error loading profiles</option>';
        showBanner(response?.error || "Can't reach server — check the URL in Settings", 'error');
        return;
      }

      const profiles = response.profiles || [];
      if (profiles.length === 0) {
        profileSelect.innerHTML = '<option value="">No profiles found in Dashboard</option>';
        showBanner('No candidate profiles found in Dashboard.', 'error');
        return;
      }

      profileSelect.innerHTML = profiles.map(p =>
        `<option value="${p.id}">${escapeHtml(p.profile_slug)} - ${escapeHtml(p.candidate_display_name)}</option>`
      ).join('');
    });
  }

  fillBtn.addEventListener('click', () => {
    const selectedProfileId = profileSelect.value;
    if (!selectedProfileId) {
      showBanner('Please select a candidate profile to fill.', 'error');
      return;
    }

    fillBtn.disabled = true;
    fillBtn.querySelector('span').textContent = 'Filling page...';
    hideBanner();
    metricsCard.classList.add('hidden');

    chrome.runtime.sendMessage({
      type: 'EXECUTE_AUTOFILL',
      profileId: selectedProfileId
    }, (response) => {
      fillBtn.disabled = false;
      fillBtn.querySelector('span').textContent = 'Fill this page';

      if (chrome.runtime.lastError) {
        showBanner(chrome.runtime.lastError.message, 'error');
        return;
      }

      if (!response || !response.success) {
        showBanner(response?.error || 'Autofill execution failed.', 'error');
        return;
      }

      const stats = response.stats || {};
      renderMetrics(stats);
      showBanner(`Form analysis and autofill run complete!`, 'success');
    });
  });

  function renderMetrics(stats) {
    const filled = stats.filled || [];
    const leftEmpty = stats.left_empty || [];
    const skipped = stats.skipped || [];

    statFilledCount.textContent = filled.length;
    statSkippedCount.textContent = leftEmpty.length;
    statUnrecognizedCount.textContent = skipped.length;

    detectedAtsBadge.textContent = stats.atsName || 'Generic ATS';

    breakdownList.innerHTML = '';

    const allItems = [
      ...filled.map(item => ({ label: item.label || item.key, status: 'Filled', class: 'tag-filled' })),
      ...leftEmpty.map(item => ({ label: item.label || item.key, status: 'Left Empty', class: 'tag-empty' })),
      ...skipped.map(item => ({ label: item.label || item.key, status: 'Skipped', class: 'tag-skipped' }))
    ];

    if (allItems.length === 0) {
      breakdownList.innerHTML = '<div style="color:var(--text-muted)">No form fields found on this page.</div>';
    } else {
      breakdownList.innerHTML = allItems.map(item => `
        <div class="breakdown-item">
          <span class="breakdown-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
          <span class="tag-badge ${item.class}">${item.status}</span>
        </div>
      `).join('');
    }

    metricsCard.classList.remove('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
});
