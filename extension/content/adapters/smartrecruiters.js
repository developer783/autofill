// SmartRecruiters ATS Tier 1 Adapter

window.ATSSmartRecruiters = {
  atsName: 'SmartRecruiters',

  detect(url, doc) {
    return url.includes('smartrecruiters.com') || doc.querySelector('[st-component="apply-form"], form[action*="smartrecruiters"]') !== null;
  },

  async fill(profile, serverUrl, apiKey) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'SmartRecruiters' };
    const d = profile.details || {};
    const files = profile.files || {};
    const location = `${d.city || ''}, ${d.state_province || ''}`.trim();

    const fieldMap = [
      { selector: 'input[id="candidate-first-name"], input[name="firstName"]', value: d.given_names, key: 'details.given_names', label: 'First Name' },
      { selector: 'input[id="candidate-last-name"], input[name="lastName"]', value: d.family_name, key: 'details.family_name', label: 'Last Name' },
      { selector: 'input[id="candidate-email"], input[name="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: 'input[id="candidate-phone"], input[name="phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: 'input[id="candidate-location"], input[name="city"]', value: location, key: 'details.city', label: 'Location' },
      { selector: 'input[name*="linkedin"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' }
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
            stats.left_empty.push({ label: item.label, key: item.key, reason: 'Failed input setter' });
          }
        } else {
          stats.left_empty.push({ label: item.label, key: item.key, reason: 'Profile data empty (untouched)' });
        }
      }
    }

    const fileInput = document.querySelector('input[type="file"][id*="resume"], input[type="file"][name="file"]');
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
