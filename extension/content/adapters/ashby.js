// Ashby ATS Tier 1 Adapter

window.ATSAshby = {
  atsName: 'Ashby',

  detect(url, doc) {
    return url.includes('ashbyhq.com') || doc.querySelector('[class*="ashby"], [id*="ashby"]') !== null;
  },

  async fill(profile, serverUrl, apiKey) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Ashby' };
    const d = profile.details || {};
    const files = profile.files || {};
    const fullName = `${d.given_names || ''} ${d.family_name || ''}`.trim();

    const fieldMap = [
      { selector: 'input[name="name"], input[id*="name"]', value: fullName, key: 'details.given_names', label: 'Full Name' },
      { selector: 'input[name="email"], input[id*="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: 'input[name="phoneNumber"], input[id*="phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: 'input[name*="linkedin"], input[id*="linkedin"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
      { selector: 'input[name*="github"], input[id*="github"]', value: d.github_url, key: 'details.github_url', label: 'GitHub' },
      { selector: 'input[name*="website"], input[id*="website"]', value: d.portfolio_url, key: 'details.portfolio_url', label: 'Portfolio' }
    ];

    for (const item of fieldMap) {
      const el = document.querySelector(item.selector);
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

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const resumeMeta = files.resume;
      if (resumeMeta && resumeMeta.download_url) {
        const fullBlobUrl = `${serverUrl}${resumeMeta.download_url}`;
        const ok = await window.ATSHelpers.setFileInput(fileInput, fullBlobUrl, resumeMeta.filename, resumeMeta.mimetype, apiKey);
        if (ok) {
          stats.filled.push({ label: 'Resume File', key: 'resume' });
        }
      } else {
        stats.left_empty.push({ label: 'Resume File', key: 'resume', reason: 'No resume attached (untouched)' });
      }
    }

    return stats;
  }
};
