// Workday ATS Tier 1 Adapter (Multi-step + iframe support)

window.ATSWorkday = {
  atsName: 'Workday',

  detect(url, doc) {
    const currentDoc = doc || document;
    const currentUrl = url || window.location.href;
    const hasElement = window.ATSHelpers
      ? window.ATSHelpers.querySelectorDeep('[data-automation-id="workdayApplication"], [data-automation-id="pageHeader"], [data-automation-id*="legalName"]', currentDoc) !== null
      : currentDoc.querySelector('[data-automation-id="workdayApplication"], [data-automation-id="pageHeader"]') !== null;

    return currentUrl.includes('myworkdayjobs.com') || currentUrl.includes('workday.com') || hasElement;
  },

  detectStep(doc) {
    const stepHeader = window.ATSHelpers
      ? window.ATSHelpers.querySelectorDeep('[data-automation-id="pageHeader"], h2, header', doc)
      : doc.querySelector('[data-automation-id="pageHeader"], h2, header');
    const title = stepHeader ? stepHeader.textContent.toLowerCase() : '';

    if (title.includes('information') || title.includes('contact')) return 'my_information';
    if (title.includes('experience') || title.includes('history')) return 'my_experience';
    if (title.includes('question') || title.includes('application')) return 'custom_questions';
    if (title.includes('voluntary') || title.includes('disclosure') || title.includes('eeo')) return 'voluntary_disclosures';
    return 'generic_workday';
  },

  traverseDocuments(mainDoc, callback) {
    callback(mainDoc);
    const iframes = window.ATSHelpers
      ? window.ATSHelpers.querySelectorAllDeep('iframe', mainDoc)
      : mainDoc.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (frameDoc) callback(frameDoc);
      } catch (e) {}
    }
  },

  async fill(profile, serverUrl) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Workday' };
    const d = profile.details || {};
    const files = profile.files || {};

    this.traverseDocuments(document, async (doc) => {
      const step = this.detectStep(doc);
      console.log(`[Workday Adapter] Detected step: ${step}`);

      const workdaySelectors = [
        { selector: '[data-automation-id="legalNameSection_firstName"], input[id*="firstName"], input[name*="firstName"]', value: d.given_names, key: 'details.given_names', label: 'First Name' },
        { selector: '[data-automation-id="legalNameSection_lastName"], input[id*="lastName"], input[name*="lastName"]', value: d.family_name, key: 'details.family_name', label: 'Last Name' },
        { selector: '[data-automation-id="addressSection_countryRegion"], [data-automation-id="country"], select[name*="country"]', value: d.country, key: 'details.country', label: 'Country' },
        { selector: '[data-automation-id="addressSection_addressLine1"], input[id*="addressLine1"], input[name*="addressLine1"]', value: d.address_line_1, key: 'details.address_line_1', label: 'Address' },
        { selector: '[data-automation-id="addressSection_city"], input[id*="city"], input[name*="city"]', value: d.city, key: 'details.city', label: 'City' },
        { selector: '[data-automation-id="addressSection_postalCode"], input[id*="postalCode"], input[name*="postalCode"]', value: d.postal_code, key: 'details.postal_code', label: 'Postal Code' },
        { selector: '[data-automation-id="email"], input[type="email"], input[id*="email"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
        { selector: '[data-automation-id="phone-number"], input[type="tel"], input[id*="phone"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
        { selector: '[data-automation-id="linkedin-url"], input[name*="linkedin"], input[id*="linkedin"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
        { selector: '[data-automation-id="github-url"], input[name*="github"], input[id*="github"]', value: d.github_url, key: 'details.github_url', label: 'GitHub' },
        { selector: '[data-automation-id="portfolio-url"], input[name*="portfolio"], input[id*="portfolio"]', value: d.portfolio_url || d.websites, key: 'details.portfolio_url', label: 'Portfolio' },
        { selector: '[data-automation-id="website-url"], input[name*="website"], input[id*="website"]', value: d.websites, key: 'details.websites', label: 'Websites' },
        { selector: '[data-automation-id="gender"], select[name*="gender"], select[id*="gender"]', value: d.gender, key: 'details.gender', label: 'Gender' },
        { selector: '[data-automation-id="ethnicity"], select[name*="ethnicity"], select[id*="race"]', value: d.ethnicity, key: 'details.ethnicity', label: 'Ethnicity' },
        { selector: '[data-automation-id="veteranStatus"], select[name*="veteran"], select[id*="veteran"]', value: d.protected_veteran_status, key: 'details.protected_veteran_status', label: 'Veteran Status' },
        { selector: '[data-automation-id="disabilityStatus"], select[name*="disability"], select[id*="disability"]', value: d.disability_status, key: 'details.disability_status', label: 'Disability Status' }
      ];

      for (const item of workdaySelectors) {
        const el = window.ATSHelpers
          ? window.ATSHelpers.querySelectorDeep(item.selector, doc)
          : doc.querySelector(item.selector);

        if (el) {
          el.setAttribute('data-ats-field-key', item.key);

          if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
            let ok = false;
            if (el.getAttribute('role') === 'combobox') {
              ok = await window.ATSHelpers.setCustomComboboxValue(el, item.value);
            } else if (el.tagName === 'SELECT') {
              ok = window.ATSHelpers.setSelectValue(el, item.value);
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

      const fileInput = window.ATSHelpers
        ? window.ATSHelpers.querySelectorDeep('[data-automation-id="file-upload-drop-zone"] input[type="file"], input[type="file"]', doc)
        : doc.querySelector('[data-automation-id="file-upload-drop-zone"] input[type="file"], input[type="file"]');

      if (fileInput) {
        fileInput.setAttribute('data-ats-field-key', 'resume');
        const resumeMeta = files.resume;
        if (resumeMeta && resumeMeta.download_url) {
          const fullBlobUrl = `${serverUrl}${resumeMeta.download_url}`;
          const ok = await window.ATSHelpers.setFileInput(fileInput, fullBlobUrl, resumeMeta.filename, resumeMeta.mimetype);
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
