// Greenhouse ATS Tier 1 Adapter

window.ATSGreenhouse = {
  atsName: 'Greenhouse',

  detect(url, doc) {
    return url.includes('greenhouse.io') || doc.querySelector('#grnhse_app, form#application_form, [action*="greenhouse"]') !== null;
  },

  async fill(profile, serverUrl) {
    const stats = { filled: [], left_empty: [], skipped: [], atsName: 'Greenhouse' };
    const d = profile.details || {};
    const files = profile.files || {};
    const we0 = (profile.work_experience && profile.work_experience.length > 0) ? profile.work_experience[0] : {};

    const fieldMap = [
      { selector: '#first_name, input[name="job_application[first_name]"]', value: d.given_names, key: 'details.given_names', label: 'First Name' },
      { selector: '#last_name, input[name="job_application[last_name]"]', value: d.family_name, key: 'details.family_name', label: 'Last Name' },
      { selector: '#email, input[name="job_application[email]"]', value: d.email_address, key: 'details.email_address', label: 'Email' },
      { selector: '#phone, input[name="job_application[phone]"]', value: d.phone_number, key: 'details.phone_number', label: 'Phone' },
      { selector: '#linkedin_url, input[name*="[linkedin]"]', value: d.linkedin_url, key: 'details.linkedin_url', label: 'LinkedIn' },
      { selector: '#github_url, input[name*="[github]"]', value: d.github_url || d.websites, key: 'details.github_url', label: 'GitHub' },
      { selector: '#portfolio_url, input[name*="[portfolio]"]', value: d.portfolio_url || d.websites, key: 'details.portfolio_url', label: 'Portfolio' },
      { selector: '#website_url, input[name*="[website]"]', value: d.websites, key: 'details.websites', label: 'Websites' },
      { selector: '#gender_id, select[name*="gender"]', value: d.gender, key: 'details.gender', label: 'Gender' },
      { selector: '#veteran_status_id, select[name*="veteran"]', value: d.protected_veteran_status, key: 'details.protected_veteran_status', label: 'Veteran' },
      { selector: '#disability_status_id, select[name*="disability"]', value: d.disability_status, key: 'details.disability_status', label: 'Disability' },
      { selector: '#race_id, select[name*="race"]', value: d.ethnicity, key: 'details.ethnicity', label: 'Ethnicity' },
      { selector: 'input[name*="[company]"]', value: we0.company, key: 'work_experience[0].company', label: 'Company' },
      { selector: 'input[name*="[title]"]', value: we0.job_title, key: 'work_experience[0].job_title', label: 'Job Title' }
    ];

    for (const item of fieldMap) {
      const el = document.querySelector(item.selector);
      if (el) {
        // Tag element with exact structured DB key for Case A sync
        el.setAttribute('data-ats-field-key', item.key);

        // STRICT ACCURACY RULE: If profile field is empty/null, LEAVE UNTOUCHED!
        if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
          let ok = false;
          if (el.tagName === 'SELECT') {
            ok = window.ATSHelpers.setSelectValue(el, item.value);
          } else {
            ok = window.ATSHelpers.setInputValue(el, item.value);
          }

          const outcomeState = ok ? 'matched-and-filled' : 'matched-but-no-data';
          console.log('[Smart Autofill] [Step 2 Diagnostic] Adapter (Greenhouse) field attempt:', {
            label: item.label, name: el.name, id: el.id, type: el.type,
            matchedKey: item.key, outcomeState, value: item.value
          });

          if (ok) {
            stats.filled.push({ label: item.label, key: item.key });
          } else {
            stats.left_empty.push({ label: item.label, key: item.key, reason: 'Setter error' });
          }
        } else {
          console.log('[Smart Autofill] [Step 2 Diagnostic] Adapter (Greenhouse) field attempt:', {
            label: item.label, name: el.name, id: el.id, type: el.type,
            matchedKey: item.key, outcomeState: 'matched-but-no-data', reason: 'Profile field empty'
          });
          stats.left_empty.push({ label: item.label, key: item.key, reason: 'Profile field empty (untouched)' });
        }
      }
    }

    // Greenhouse Resume Attachment
    const fileInput = document.querySelector('input[type="file"][name*="resume"], #resume_file');
    if (fileInput) {
      fileInput.setAttribute('data-ats-field-key', 'resume');
      const resumeMeta = files.resume;
      if (resumeMeta && resumeMeta.download_url) {
        const fullBlobUrl = `${serverUrl}${resumeMeta.download_url}`;
        const ok = await window.ATSHelpers.setFileInput(fileInput, fullBlobUrl, resumeMeta.filename, resumeMeta.mimetype);
        const outcomeState = ok ? 'matched-and-filled' : 'matched-but-no-data';
        console.log('[Smart Autofill] [Step 2 Diagnostic] Adapter (Greenhouse) resume field attempt:', {
          label: 'Attach Resume', name: fileInput.name, id: fileInput.id, type: 'file',
          matchedKey: 'resume', outcomeState, filename: resumeMeta.filename
        });
        if (ok) {
          stats.filled.push({ label: 'Resume File', key: 'resume' });
        } else {
          stats.left_empty.push({ label: 'Resume File', key: 'resume', reason: 'File error' });
        }
      } else {
        console.log('[Smart Autofill] [Step 2 Diagnostic] Adapter (Greenhouse) resume field attempt:', {
          label: 'Attach Resume', name: fileInput.name, id: fileInput.id, type: 'file',
          matchedKey: 'resume', outcomeState: 'matched-but-no-data', reason: 'No resume uploaded'
        });
        stats.left_empty.push({ label: 'Resume File', key: 'resume', reason: 'No resume uploaded (untouched)' });
      }
    }

    return stats;
  }
};
