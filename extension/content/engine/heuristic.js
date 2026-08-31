// Tier 2 Generic Heuristic Fallback Form Engine (With Strict Accuracy & Empty-Stays-Empty Rules)

window.ATSHeuristic = {
  synonymMap: {
    'details.given_names': ['first name', 'given name', 'fname', 'forename', 'given names', 'first_name'],
    'details.family_name': ['last name', 'family name', 'surname', 'lname', 'last_name', 'family_name'],
    'details.preferred_name': ['preferred name', 'nickname'],
    'details.country': ['country', 'nation', 'location country'],
    'details.address_line_1': ['street address', 'address line 1', 'address', 'street', 'residence'],
    'details.city': ['city', 'town', 'municipality'],
    'details.state': ['state', 'province', 'region', 'state/province'],
    'details.postal_code': ['zip', 'zip code', 'postal code', 'postcode'],
    'details.phone_number': ['phone', 'mobile', 'telephone', 'cell', 'phone number', 'contact number'],
    'details.how_did_you_hear_about_us': ['how did you hear', 'source', 'hear about us', 'referral source'],
    'details.previously_worked_here': ['previously worked', 'former employee', 'have you worked here'],
    'details.skills': ['skills', 'technologies', 'proficiencies', 'key skills'],
    'details.websites': ['website', 'personal website', 'portfolio site', 'websites'],
    'details.linkedin_url': ['linkedin', 'linkedin profile', 'linkedin url'],
    'details.legally_authorized_to_work': ['authorized to work', 'legally authorized', 'work authorization', 'eligible to work'],
    'details.requires_employer_support': ['sponsorship', 'require sponsorship', 'require support', 'visa support'],
    'details.ethnicity': ['ethnicity', 'race', 'ethnic background'],
    'details.gender': ['gender', 'sex', 'gender identity'],
    'details.protected_veteran_status': ['veteran', 'veteran status', 'military status', 'protected veteran'],
    'details.disability_status': ['disability', 'disability status', 'handicap'],
    'details.self_id_name': ['disability name', 'signature name', 'self-id name'],
    'details.language': ['language', 'languages spoken'],
    'work_experience[0].job_title': ['job title', 'current title', 'most recent title', 'position title'],
    'work_experience[0].company': ['company', 'employer', 'organization name', 'current employer'],
    'work_experience[0].location': ['company location', 'work location', 'employer location'],
    'education[0].school_or_university': ['school', 'university', 'college', 'institution'],
    'education[0].degree': ['degree', 'qualification', 'degree type'],
    'education[0].field_of_study': ['field of study', 'major', 'discipline', 'specialization'],
    'resume': ['resume', 'cv', 'curriculum vitae', 'upload resume', 'attach resume']
  },

  async run(profile, serverUrl) {
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
      if (learnedMatch && learnedMatch.field_value) {
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
            if (score > highestScore && score >= 0.6) { // Conservative threshold
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

          if (el.type === 'file') {
            const fileMeta = profile.files ? profile.files.resume : null;
            if (fileMeta && fileMeta.download_url) {
              const fullBlobUrl = `${serverUrl}${fileMeta.download_url}`;
              success = await window.ATSHelpers.setFileInput(el, fullBlobUrl, fileMeta.filename, fileMeta.mimetype);
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
    const we0 = (profile.work_experience && profile.work_experience.length > 0) ? profile.work_experience[0] : {};
    const edu0 = (profile.education && profile.education.length > 0) ? profile.education[0] : {};

    if (key.startsWith('details.')) {
      const attr = key.replace('details.', '');
      return d[attr];
    }

    if (key.startsWith('work_experience[')) {
      const attr = key.split('.').pop();
      return we0[attr];
    }

    if (key.startsWith('education[')) {
      const attr = key.split('.').pop();
      return edu0[attr];
    }

    if (key === 'resume') {
      return profile.files?.resume;
    }

    return null;
  }
};
