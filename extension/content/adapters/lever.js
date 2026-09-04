// Lever ATS Tier 1 Adapter

window.ATSLever = {
  atsName: 'Lever',

  detect(url, doc) {
    const currentDoc = doc || document;
    const currentUrl = url || window.location.href;
    const hasElement = window.ATSHelpers
      ? window.ATSHelpers.querySelectorDeep('.application-page, form[action*="lever.co"], .application-form', currentDoc) !== null
      : currentDoc.querySelector('.application-page, form[action*="lever.co"]') !== null;

    return currentUrl.includes('jobs.lever.co') || hasElement;
  },

  async fill(profile, serverUrl) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Lever' };
    const d = profile.details || {};
    const files = profile.files || {};
    const we0 = (profile.work_experience && profile.work_experience.length > 0) ? profile.work_experience[0] : {};
    const fullName = `${d.given_names || ''} ${d.family_name || ''}`.trim();

    const fieldMap = [
      { selector: 'input[name="name"]', value: fullName, key: 'details.given_names', label: 'Full Name' },
      { selector: 'input[name="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: 'input[name="phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: 'input[name="org"]', value: we0.company, key: 'work_experience[0].company', label: 'Current Company' },
      { selector: 'input[name="urls[LinkedIn]"], input[name*="[linkedin]"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
      { selector: 'input[name="urls[GitHub]"], input[name*="[github]"]', value: d.github_url, key: 'details.github_url', label: 'GitHub' },
      { selector: 'input[name="urls[Portfolio]"], input[name*="[portfolio]"]', value: d.portfolio_url || d.websites, key: 'details.portfolio_url', label: 'Portfolio' },
      { selector: 'input[name="urls[Other]"], input[name*="[website]"]', value: d.websites, key: 'details.websites', label: 'Websites' }
    ];

    for (const item of fieldMap) {
      const el = window.ATSHelpers ? window.ATSHelpers.querySelectorDeep(item.selector, document) : document.querySelector(item.selector);
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

    const fileInput = window.ATSHelpers ? window.ATSHelpers.querySelectorDeep('input[type="file"][name="resume"]', document) : document.querySelector('input[type="file"][name="resume"]');
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
