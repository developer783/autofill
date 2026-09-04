// 4-Tier Form Engine: Tier 0 (Cache), Tier 1 (Adapters), Tier 2 (AI Matching), Tier 3 (Heuristics)

window.ATSHeuristic = {
  availableProfileKeys: [
    { key: "details.how_did_you_hear_about_us", description: "How did you hear about us source" },
    { key: "details.previously_worked_here", description: "Whether candidate previously worked here" },
    { key: "details.given_names", description: "First or given names" },
    { key: "details.family_name", description: "Last or family name" },
    { key: "details.local_given_names", description: "Local given names" },
    { key: "details.local_family_name", description: "Local family name" },
    { key: "details.preferred_name", description: "Preferred name or nickname" },
    { key: "details.country", description: "Country or region" },
    { key: "details.address_line_1", description: "Street address line 1" },
    { key: "details.city", description: "City or town" },
    { key: "details.state", description: "State or province" },
    { key: "details.postal_code", description: "Postal or zip code" },
    { key: "details.email_address", description: "Email address" },
    { key: "details.phone_device_type", description: "Phone device type (Cellular/Home)" },
    { key: "details.country_phone_code", description: "Country phone code" },
    { key: "details.phone_number", description: "Phone number digits" },
    { key: "details.phone_extension", description: "Phone extension" },
    { key: "details.skills", description: "Comma-separated list of skills" },
    { key: "details.websites", description: "Websites or portfolio links" },
    { key: "details.linkedin_url", description: "LinkedIn profile URL" },
    { key: "details.github_url", description: "GitHub profile URL" },
    { key: "details.portfolio_url", description: "Portfolio URL" },
    { key: "details.legally_authorized_to_work", description: "Legally authorized to work in target country" },
    { key: "details.requires_employer_support", description: "Requires visa sponsorship or employer support" },
    { key: "details.ethnicity", description: "Voluntary ethnicity disclosure" },
    { key: "details.gender", description: "Voluntary gender disclosure" },
    { key: "details.protected_veteran_status", description: "Voluntary veteran status disclosure" },
    { key: "details.self_id_language", description: "Language of disability disclosure form" },
    { key: "details.self_id_name", description: "Legal name on disability disclosure" },
    { key: "details.employee_id", description: "Employee ID if applicable" },
    { key: "details.self_id_date", description: "Date of disability disclosure" },
    { key: "details.disability_status", description: "Voluntary disability status disclosure" },
    { key: "details.language", description: "Primary spoken/written language" },
    { key: "work_experience[0].job_title", description: "Recent job title" },
    { key: "work_experience[0].company", description: "Recent employer/company name" },
    { key: "work_experience[0].location", description: "Recent job location" },
    { key: "work_experience[0].from_date", description: "Work start date" },
    { key: "work_experience[0].to_date", description: "Work end date" },
    { key: "work_experience[0].role_description", description: "Work role description" },
    { key: "education[0].school_or_university", description: "School or university name" },
    { key: "education[0].degree", description: "Degree obtained" },
    { key: "education[0].field_of_study", description: "Field of study or major" },
    { key: "education[0].overall_result_gpa", description: "GPA or overall result" },
    { key: "resume", description: "Resume file upload input" }
  ],

  synonymMap: {
    'details.given_names': ['first name', 'given name', 'fname', 'forename', 'given names', 'first_name'],
    'details.family_name': ['last name', 'family name', 'surname', 'lname', 'last_name', 'family_name'],
    'details.email_address': ['email', 'email address', 'e-mail', 'e-mail address', 'contact email', 'email_address'],
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
    'details.websites': ['website', 'personal website', 'websites', 'website url', 'personal link', 'other link', 'url'],
    'details.linkedin_url': ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin link'],
    'details.github_url': ['github', 'github profile', 'github url', 'git repo', 'github link'],
    'details.portfolio_url': ['portfolio', 'portfolio url', 'portfolio link', 'portfolio site', 'personal site'],
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
      atsName: 'Generic ATS (Tier 2 AI / Tier 3 Heuristic)'
    };

    const rawElements = window.ATSHelpers
      ? window.ATSHelpers.querySelectorAllDeep('input, select, textarea, [role="combobox"]', document)
      : Array.from(document.querySelectorAll('input, select, textarea, [role="combobox"]'));
    const candidateInputs = [];

    // Filter candidate input elements and collect field metadata
    for (let index = 0; index < rawElements.length; index++) {
      const el = rawElements[index];
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;

      const labelText = window.ATSHelpers.getElementLabelText(el);
      const fieldId = `field_${index}_${el.id || el.name || 'attr'}`;

      candidateInputs.push({
        element: el,
        fieldId: fieldId,
        labelText: labelText,
        nameAttr: el.name || '',
        idAttr: el.id || '',
        placeholder: el.placeholder || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        inputType: el.type || el.tagName.toLowerCase(),
        nearbyText: labelText
      });
    }

    // 1. Try Batched AI Matcher (/ai/match-fields) for metadata
    let aiMatches = {};
    if (serverUrl && candidateInputs.length > 0) {
      try {
        const payload = {
          ats_domain: window.location.hostname,
          fields: candidateInputs.map(item => ({
            field_id: item.fieldId,
            label_text: item.labelText,
            name_attr: item.nameAttr,
            id_attr: item.idAttr,
            placeholder: item.placeholder,
            aria_label: item.ariaLabel,
            input_type: item.inputType,
            nearby_text: item.nearbyText
          })),
          available_profile_keys: this.availableProfileKeys
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`${serverUrl}/ai/match-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json();
          aiMatches = resData.matches || {};
          console.log('[Smart Autofill] AI matching result received:', aiMatches);
        }
      } catch (e) {
        console.warn('[Smart Autofill] AI endpoint unreachable or timed out; falling through to Tier 3 Heuristics.', e);
      }
    }

    // 2. Process each input element through Tier 0/1/2/3 matching rules
    for (const item of candidateInputs) {
      const el = item.element;
      const labelText = item.labelText;
      const attrString = `${labelText} ${el.name || ''} ${el.id || ''} ${el.placeholder || ''}`.toLowerCase();

      // Check Learned Fields first (label-text match)
      const learnedMatch = this.matchLearnedFields(labelText, profile.learned_fields);
      if (learnedMatch && learnedMatch.field_value) {
        const success = window.ATSHelpers.setInputValue(el, learnedMatch.field_value);
        if (success) {
          console.log('[Smart Autofill] Field filled via Learned Field:', labelText);
          stats.filled.push({ label: labelText || 'Learned Field', key: 'learned_field' });
          continue;
        }
      }

      let matchedKey = null;

      // Check AI result first
      const aiResult = aiMatches[item.fieldId];
      if (aiResult && aiResult.confidence >= 0.6 && aiResult.profile_key) {
        matchedKey = aiResult.profile_key;
        console.log(`[Smart Autofill] Matched field '${labelText}' to key '${matchedKey}' via Tier 2 AI (conf: ${aiResult.confidence})`);
      }

      // If AI did not resolve, fallback to Tier 3 synonym heuristic scoring
      if (!matchedKey) {
        let highestScore = 0;
        for (const [key, synonyms] of Object.entries(this.synonymMap)) {
          for (const syn of synonyms) {
            if (attrString.includes(syn)) {
              const score = syn.length / attrString.length + 0.5;
              if (score > highestScore && score >= 0.6) {
                highestScore = score;
                matchedKey = key;
              }
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
            stats.left_empty.push({ label: labelText || matchedKey, key: matchedKey, reason: 'Setter failed' });
          }
        } else {
          // Profile field was empty/null -> LEAVE FIELD UNTOUCHED!
          console.log(`[Smart Autofill] Profile field '${matchedKey}' is empty in active profile. Leaving '${labelText}' untouched.`);
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

