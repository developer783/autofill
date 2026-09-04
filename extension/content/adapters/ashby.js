// Ashby ATS Tier 1 Adapter

window.ATSAshby = {
  atsName: 'Ashby',

  detect(url, doc) {
    const currentDoc = doc || document;
    const currentUrl = url || window.location.href;
    const hasElement = window.ATSHelpers
      ? window.ATSHelpers.querySelectorDeep('[class*="ashby"], [id*="ashby"]', currentDoc) !== null
      : currentDoc.querySelector('[class*="ashby"], [id*="ashby"]') !== null;

    return currentUrl.includes('ashbyhq.com') || hasElement;
  },

  async fill(profile, serverUrl) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Ashby' };
    const d = profile.details || {};
    const files = profile.files || {};
    const fullName = `${d.given_names || ''} ${d.family_name || ''}`.trim();

    const fieldMap = [
      { selector: 'input[name="name"], input[id*="name"]', value: fullName, key: 'details.given_names', label: 'Full Name' },
      { selector: 'input[name="email"], input[id*="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: 'input[name="phoneNumber"], input[id*="phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: 'input[name*="linkedin"], input[id*="linkedin"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
      { selector: 'input[name*="website"], input[id*="website"]', value: d.websites, key: 'details.websites', label: 'Websites' }
    ];

    for (const item of fieldMap) {
      const el = window.ATSHelpers ? window.ATSHelpers.querySelectorDeep(item.selector, document) : document.querySelector(item.selector);
      if (el) {
        el.setAttribute('data-ats-field-key', item.key);

        if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
          const ok = window.ATSHelpers.setInputValue(el, item.value);
          if (ok) {
            stats.filled.push({ label: item.label, key: item.key });
          } else {
            stats.left_empty.push({ label: item.label, key: item.key, reason: 'Failed input value' });
          }
        } else {
          stats.left_empty.push({ label: item.label, key: item.key, reason: 'Profile data empty (untouched)' });
        }
      }
    }

    const fileInput = window.ATSHelpers ? window.ATSHelpers.querySelectorDeep('input[type="file"]', document) : document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.setAttribute('data-ats-field-key', 'resume');
      const resumeMeta = files.resume;
      if (resumeMeta) {
        const fileDataOrUrl = resumeMeta.data_url || (resumeMeta.download_url ? `${serverUrl}${resumeMeta.download_url}` : null);
        if (fileDataOrUrl) {
          const ok = await window.ATSHelpers.setFileInput(fileInput, fileDataOrUrl, resumeMeta.filename, resumeMeta.mimetype);
          if (ok) {
            stats.filled.push({ label: 'Resume File', key: 'resume' });
          }
        }
      } else {
        stats.left_empty.push({ label: 'Resume File', key: 'resume', reason: 'No resume attached (untouched)' });
      }
    }

    // Sweep remaining unmapped fields (dropdowns, custom questions, learned fields) via Heuristic Engine
    if (window.ATSHeuristic && typeof window.ATSHeuristic.run === 'function') {
      const extraStats = await window.ATSHeuristic.run(profile, serverUrl);
      if (extraStats) {
        stats.filled.push(...(extraStats.filled || []));
        stats.left_empty.push(...(extraStats.left_empty || []));
        stats.skipped.push(...(extraStats.skipped || []));
      }
    }

    return stats;
  }
};
