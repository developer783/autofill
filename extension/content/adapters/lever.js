// Lever ATS Tier 1 Adapter

window.ATSLever = {
  atsName: 'Lever',

  detect(url, doc) {
    return url.includes('jobs.lever.co') || doc.querySelector('.application-page, form[action*="lever.co"]') !== null;
  },

  async fill(profile, serverUrl, apiKey) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Lever' };
    const d = profile.details || {};
    const files = profile.files || {};
    const fullName = `${d.given_names || ''} ${d.family_name || ''}`.trim();

    const fieldMap = [
      { selector: 'input[name="name"]', value: fullName, key: 'details.given_names', label: 'Full Name' },
      { selector: 'input[name="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: 'input[name="phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: 'input[name="org"]', value: profile.employment?.[0]?.company || '', key: 'employment[0].company', label: 'Current Company' },
      { selector: 'input[name="urls[LinkedIn]"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
      { selector: 'input[name="urls[GitHub]"]', value: d.github_url, key: 'details.github_url', label: 'GitHub' },
      { selector: 'input[name="urls[Portfolio]"]', value: d.portfolio_url, key: 'details.portfolio_url', label: 'Portfolio' }
    ];

    for (const item of fieldMap) {
      const el = document.querySelector(item.selector);
      if (el) {
        // Tag element with exact structured DB key for Case A sync
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

    const fileInput = document.querySelector('input[type="file"][name="resume"]');
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
