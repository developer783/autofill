// Tier 2 Generic Heuristic Fallback Form Engine (With Strict Accuracy & Empty-Stays-Empty Rules)

window.ATSHeuristic = {
  synonymMap: {
    'details.given_names': ['first name', 'given name', 'fname', 'forename', 'given names'],
    'details.family_name': ['last name', 'family name', 'surname', 'lname', 'last_name'],
    'details.preferred_name': ['preferred name', 'nickname'],
    'details.email_address': ['email', 'e-mail', 'email address', 'contact email'],
    'details.phone_number': ['phone', 'mobile', 'telephone', 'cell', 'phone number', 'contact number'],
    'details.address_line_1': ['street address', 'address line 1', 'address', 'street', 'residence'],
    'details.city': ['city', 'town', 'municipality'],
    'details.state_province': ['state', 'province', 'region', 'state/province'],
    'details.postal_code': ['zip', 'zip code', 'postal code', 'postcode'],
    'details.country': ['country', 'nation'],
    'details.linkedin_url': ['linkedin', 'linkedin profile', 'linkedin url'],
    'details.github_url': ['github', 'github profile', 'github url'],
    'details.portfolio_url': ['portfolio', 'website', 'personal site', 'portfolio url'],
    'details.work_authorization': ['visa status', 'work status', 'authorization status', 'work authorization'],
    'details.gender': ['gender', 'sex', 'gender identity'],
    'details.veteran_status': ['veteran', 'veteran status', 'military'],
    'details.disability_status': ['disability', 'handicap', 'disability status'],
    'details.race_ethnicity': ['race', 'ethnicity', 'demographic', 'origin'],
    'details.languages': ['language', 'languages'],
    'resume': ['resume', 'cv', 'curriculum vitae', 'upload resume', 'attach resume'],
    'cover_letter': ['cover letter', 'letter', 'personal statement'],
    'portfolio_document': ['portfolio document', 'work sample']
  },

  async run(profile, serverUrl, apiKey) {
    const stats = {
      filled: [],
      left_empty: [],
      skipped: [],
      atsName: 'Generic ATS (Heuristic Tier 2)'
    };

    const inputs = Array.from(document.querySelectorAll('input, select, textarea, [role="combobox"]'));

    for (const el of inputs) {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;

      const labelText = window.ATSHelpers.getElementLabelText(el);
      const attrString = `${labelText} ${el.name || ''} ${el.id || ''} ${el.placeholder || ''}`.toLowerCase();

      // 1. Check Learned Fields first (label-text match)
      const learnedMatch = this.matchLearnedFields(labelText, profile.learned_fields);
      if (learnedMatch) {
        const success = window.ATSHelpers.setInputValue(el, learnedMatch.field_value);
        if (success) {
          stats.filled.push({ label: labelText || 'Learned Field', key: 'learned_field' });
          continue;
        }
      }

      // 2. Score against standard profile fields
      let matchedKey = null;
      let highestScore = 0;

      for (const [key, synonyms] of Object.entries(this.synonymMap)) {
        for (const syn of synonyms) {
          if (attrString.includes(syn)) {
            const score = syn.length / attrString.length + 0.5;
            if (score > highestScore) {
              highestScore = score;
              matchedKey = key;
            }
          }
        }
      }

      if (matchedKey) {
        // Tag element with exact DB key for Case A sync
        el.setAttribute('data-ats-field-key', matchedKey);
        const valueToFill = this.extractProfileValue(profile, matchedKey);

        // STRICT ACCURACY RULE: If profile field is empty/null, LEAVE THE FIELD UNTOUCHED!
        if (valueToFill !== undefined && valueToFill !== null && String(valueToFill).trim() !== '') {
          let success = false;

          const fileKey = matchedKey.replace('details.', '');
          if (el.type === 'file') {
            const fileMeta = profile.files ? profile.files[fileKey] : null;
            if (fileMeta && fileMeta.download_url) {
              const fullBlobUrl = `${serverUrl}${fileMeta.download_url}`;
              success = await window.ATSHelpers.setFileInput(el, fullBlobUrl, fileMeta.filename, fileMeta.mimetype, apiKey);
            }
          } else if (el.type === 'checkbox') {
            el.checked = Boolean(valueToFill);
            el.dispatchEvent(new Event('change', { bubbles: true }));
            success = true;
          } else if (el.tagName === 'SELECT') {
            success = window.ATSHelpers.setSelectValue(el, valueToFill);
          } else if (el.getAttribute('role') === 'combobox') {
            success = await window.ATSHelpers.setCustomComboboxValue(el, valueToFill);
          } else {
            success = window.ATSHelpers.setInputValue(el, valueToFill);
          }

          if (success) {
            stats.filled.push({ label: labelText || matchedKey, key: matchedKey });
          } else {
            stats.left_empty.push({ label: labelText || matchedKey, key: matchedKey, reason: 'Value setter unmatched' });
          }
        } else {
          // Profile field was empty/null -> LEAVE FIELD UNTOUCHED!
          stats.left_empty.push({ label: labelText || matchedKey, key: matchedKey, reason: 'Profile data empty (untouched)' });
        }
      } else {
        // 3. Fallback AI Answer Profile ONLY for open-ended free-text screening questions
        if (el.tagName === 'TEXTAREA' || attrString.includes('why') || attrString.includes('describe') || attrString.includes('tell us')) {
          const aiFallback = profile.details?.default_custom_answer;
          if (aiFallback && aiFallback.trim()) {
            const success = window.ATSHelpers.setInputValue(el, aiFallback);
            if (success) {
              stats.filled.push({ label: labelText || 'Screening Question', key: 'ai_fallback' });
              continue;
            }
          }
        }

        stats.skipped.push({ label: labelText || el.name || 'Unknown Field' });
      }
    }

    return stats;
  },

  matchLearnedFields(labelText, learnedFields) {
    if (!labelText || !learnedFields || learnedFields.length === 0) return null;
    const lLower = labelText.toLowerCase().trim();

    for (const lf of learnedFields) {
      const pattern = (lf.field_label_text || '').toLowerCase().trim();
      if (!pattern) continue;
      if (lLower.includes(pattern) || pattern.includes(lLower)) {
        return lf;
      }
    }
    return null;
  },

  extractProfileValue(profile, key) {
    const d = profile.details || {};
    const cleanKey = key.startsWith('details.') ? key.replace('details.', '') : key;

    switch (cleanKey) {
      case 'given_names': return d.given_names;
      case 'family_name': return d.family_name;
      case 'preferred_name': return d.preferred_name;
      case 'email_address': return d.email_address;
      case 'phone_number': return d.phone_number;
      case 'address_line_1': return d.address_line_1;
      case 'city': return d.city;
      case 'state_province': return d.state_province;
      case 'postal_code': return d.postal_code;
      case 'country': return d.country;
      case 'linkedin_url': return d.linkedin_url;
      case 'github_url': return d.github_url;
      case 'portfolio_url': return d.portfolio_url;
      case 'work_authorization': return d.work_authorization;
      case 'gender': return d.gender;
      case 'veteran_status': return d.veteran_status;
      case 'disability_status': return d.disability_status;
      case 'race_ethnicity': return d.race_ethnicity;
      case 'languages': return d.languages;
      case 'resume': return profile.files?.resume;
      case 'cover_letter': return profile.files?.cover_letter;
      case 'portfolio_document': return profile.files?.portfolio_document;
      default: return null;
    }
  }
};
