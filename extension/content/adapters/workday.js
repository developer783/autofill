// Workday ATS Tier 1 Adapter (Multi-step + iframe support)

window.ATSWorkday = {
  atsName: 'Workday',

  detect(url, doc) {
    return url.includes('myworkdayjobs.com') || url.includes('workday.com') || doc.querySelector('[data-automation-id="workdayApplication"], [data-automation-id="pageHeader"]') !== null;
  },

  detectStep(doc) {
    const stepHeader = doc.querySelector('[data-automation-id="pageHeader"], h2, header');
    const title = stepHeader ? stepHeader.textContent.toLowerCase() : '';

    if (title.includes('information') || title.includes('contact')) return 'my_information';
    if (title.includes('experience') || title.includes('history')) return 'my_experience';
    if (title.includes('question') || title.includes('application')) return 'custom_questions';
    if (title.includes('voluntary') || title.includes('disclosure') || title.includes('eeo')) return 'voluntary_disclosures';
    return 'generic_workday';
  },

  traverseDocuments(mainDoc, callback) {
    callback(mainDoc);
    const iframes = mainDoc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (frameDoc) callback(frameDoc);
      } catch (e) {}
    }
  },

  async fill(profile, serverUrl, apiKey) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Workday' };
    const d = profile.details || {};
    const files = profile.files || {};

    this.traverseDocuments(document, async (doc) => {
      const step = this.detectStep(doc);
      console.log(`[Workday Adapter] Detected step: ${step}`);

      const workdaySelectors = [
        { selector: '[data-automation-id="legalNameSection_firstName"]', value: d.given_names, key: 'details.given_names', label: 'First Name' },
        { selector: '[data-automation-id="legalNameSection_lastName"]', value: d.family_name, key: 'details.family_name', label: 'Last Name' },
        { selector: '[data-automation-id="addressSection_addressLine1"]', value: d.address_line_1, key: 'details.address_line_1', label: 'Address' },
        { selector: '[data-automation-id="addressSection_city"]', value: d.city, key: 'details.city', label: 'City' },
        { selector: '[data-automation-id="addressSection_postalCode"]', value: d.postal_code, key: 'details.postal_code', label: 'Postal Code' },
        { selector: '[data-automation-id="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
        { selector: '[data-automation-id="phone-number"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
        { selector: '[data-automation-id="linkedin-url"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
        { selector: '[data-automation-id="gender"]', value: d.gender, key: 'details.gender', label: 'Gender' },
        { selector: '[data-automation-id="hispanicOrLatino"]', value: d.hispanic_latino, key: 'details.hispanic_latino', label: 'Hispanic/Latino' },
        { selector: '[data-automation-id="veteranStatus"]', value: d.veteran_status, key: 'details.veteran_status', label: 'Veteran Status' }
      ];

      for (const item of workdaySelectors) {
        const el = doc.querySelector(item.selector);
        if (el) {
          el.setAttribute('data-ats-field-key', item.key);

          if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
            let ok = false;
            if (el.getAttribute('role') === 'combobox') {
              ok = await window.ATSHelpers.setCustomComboboxValue(el, item.value);
            } else {
              ok = window.ATSHelpers.setInputValue(el, item.value);
            }

            if (ok) {
              stats.filled.push({ label: item.label, key: item.key });
            } else {
              stats.left_empty.push({ label: item.label, key: item.key, reason: 'Workday input setter failed' });
            }
          } else {
            stats.left_empty.push({ label: item.label, key: item.key, reason: 'Profile data empty (untouched)' });
          }
        }
      }

      const fileInput = doc.querySelector('[data-automation-id="file-upload-drop-zone"] input[type="file"], input[type="file"]');
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
    });

    return stats;
  }
};
