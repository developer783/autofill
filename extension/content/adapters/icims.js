// iCIMS ATS Tier 1 Adapter

window.ATSiCIMS = {
  atsName: 'iCIMS',

  detect(url, doc) {
    return url.includes('icims.com') || doc.querySelector('[class*="icims"], iframe[id*="icims"]') !== null;
  },

  async fill(profile, serverUrl, apiKey) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'iCIMS' };
    const d = profile.details || {};
    const files = profile.files || {};

    const fieldMap = [
      { selector: 'input[id$="_FirstName"], input[name$="FirstName"]', value: d.given_names, key: 'details.given_names', label: 'First Name' },
      { selector: 'input[id$="_LastName"], input[name$="LastName"]', value: d.family_name, key: 'details.family_name', label: 'Last Name' },
      { selector: 'input[id$="_Email"], input[name$="Email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: 'input[id$="_Phone"], input[name$="Phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: 'input[id$="_AddressLine1"], input[name$="AddressLine1"]', value: d.address_line_1, key: 'details.address_line_1', label: 'Address' },
      { selector: 'input[id$="_City"], input[name$="City"]', value: d.city, key: 'details.city', label: 'City' },
      { selector: 'input[id$="_PostalCode"], input[name$="PostalCode"]', value: d.postal_code, key: 'details.postal_code', label: 'Postal Code' }
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

    const fileInput = document.querySelector('input[type="file"][id*="Resume"]');
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
