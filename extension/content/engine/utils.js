// Helper Utilities for Content Script Form Engine

window.ATSHelpers = {
  // Recursive DOM & Shadow DOM Query Selector All
  querySelectorAllDeep(selector, root = document) {
    if (!root) return [];
    const results = [];
    const visited = new Set();

    function walk(node) {
      if (!node || visited.has(node)) return;
      visited.add(node);

      if (node.querySelectorAll) {
        try {
          const matches = node.querySelectorAll(selector);
          for (let i = 0; i < matches.length; i++) {
            if (!results.includes(matches[i])) {
              results.push(matches[i]);
            }
          }
        } catch (e) {}
      }

      // Query all elements inside this node to find shadow roots
      const allElements = node.querySelectorAll ? node.querySelectorAll('*') : [];
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el.shadowRoot) {
          walk(el.shadowRoot);
        }
      }
    }

    walk(root);
    return results;
  },

  // Recursive DOM & Shadow DOM Query Selector Single Match
  querySelectorDeep(selector, root = document) {
    const matches = this.querySelectorAllDeep(selector, root);
    return matches.length > 0 ? matches[0] : null;
  },

  // Wait for DOM stabilization / dynamic field loading
  async waitForDOM(root = document, timeoutMs = 2000) {
    if (!root) return [];
    return new Promise((resolve) => {
      const startTime = Date.now();
      let timer = null;

      const getFields = () => this.querySelectorAllDeep('input, select, textarea, [role="combobox"]', root);

      const finish = () => {
        if (timer) clearTimeout(timer);
        if (observer) observer.disconnect();
        resolve(getFields());
      };

      const initialFields = getFields();
      if (initialFields.length >= 3 || timeoutMs <= 0) {
        return resolve(initialFields);
      }

      let observer = null;
      if (typeof MutationObserver !== 'undefined' && (root.body || root)) {
        observer = new MutationObserver(() => {
          if (getFields().length >= 3 || Date.now() - startTime >= timeoutMs) {
            finish();
          }
        });
        observer.observe(root.body || root, { childList: true, subtree: true });
      }

      timer = setTimeout(() => {
        finish();
      }, timeoutMs);
    });
  },

  // Controlled input value setter for React / Vue / Angular apps
  setInputValue(element, value) {
    if (!element || value === undefined || value === null) return false;
    const strVal = String(value);
    if (!strVal.trim()) return false;

    let prototype = window.HTMLInputElement.prototype;
    if (element.tagName === 'TEXTAREA') {
      prototype = window.HTMLTextAreaElement.prototype;
    } else if (element.tagName === 'SELECT') {
      return this.setSelectValue(element, strVal);
    }

    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(element, strVal);
    } else {
      element.value = strVal;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  },

  // Select dropdown option matcher (with boolean conversion, fuzzy matching, and ATS synonyms)
  setSelectValue(selectEl, value) {
    if (!selectEl || value === undefined || value === null) return false;

    // Convert boolean profile values to Yes/No
    let searchVals = [];
    if (value === true || String(value).toLowerCase().trim() === 'true') {
      searchVals = ['yes', 'true', 'authorized', 'eligible'];
    } else if (value === false || String(value).toLowerCase().trim() === 'false') {
      searchVals = ['no', 'false', 'unauthorized', 'ineligible'];
    } else {
      searchVals = [String(value).toLowerCase().trim()];
    }

    let bestMatchIndex = -1;

    for (const searchVal of searchVals) {
      if (!searchVal) continue;

      // Pass 1: Exact match
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        const optVal = opt.value.toLowerCase().trim();
        const optText = opt.text.toLowerCase().trim();

        if (optVal === searchVal || optText === searchVal) {
          bestMatchIndex = i;
          break;
        }
      }
      if (bestMatchIndex !== -1) break;

      // Pass 2: Prefix or Word overlap match (e.g. "India" -> "India (IN)", "Male" -> "Male / He")
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        const optText = opt.text.toLowerCase().trim();
        const optVal = opt.value.toLowerCase().trim();

        if (optText.startsWith(searchVal) || optVal.startsWith(searchVal) ||
            optText.includes(searchVal) || searchVal.includes(optText)) {
          bestMatchIndex = i;
          break;
        }
      }
      if (bestMatchIndex !== -1) break;

      // Pass 3: Common ATS Synonyms (Decline -> Choose not to disclose, No -> I do not have)
      for (let i = 0; i < selectEl.options.length; i++) {
        const optText = selectEl.options[i].text.toLowerCase().trim();
        if (searchVal.includes('decline') && (optText.includes('decline') || optText.includes('choose not') || optText.includes('prefer not'))) {
          bestMatchIndex = i;
          break;
        }
        if (searchVal.includes('no') && (optText.includes('no') || optText.includes('do not') || optText.includes('don\'t'))) {
          bestMatchIndex = i;
          break;
        }
        if (searchVal.includes('yes') && (optText.includes('yes') || optText.includes('i have') || optText.includes('am a'))) {
          bestMatchIndex = i;
          break;
        }
      }
      if (bestMatchIndex !== -1) break;
    }

    if (bestMatchIndex !== -1) {
      selectEl.selectedIndex = bestMatchIndex;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      selectEl.dispatchEvent(new Event('input', { bubbles: true }));
      selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    }
    return false;
  },

  // Radio button clicker by value or label text
  setRadioValue(radioElements, value) {
    if (!radioElements || radioElements.length === 0 || value === undefined || value === null) return false;
    let searchVal = String(value).toLowerCase().trim();
    if (value === true) searchVal = 'yes';
    if (value === false) searchVal = 'no';
    if (!searchVal) return false;

    for (const radio of radioElements) {
      const radioVal = (radio.value || '').toLowerCase().trim();
      const labelText = this.getElementLabelText(radio).toLowerCase().trim();

      if (radioVal === searchVal || labelText === searchVal ||
          labelText.includes(searchVal) || searchVal.includes(labelText)) {
        radio.checked = true;
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  },

  // Custom Combobox / ARIA Dropdown Clicker (Workday, React Select, Vue, ARIA listbox)
  async setCustomComboboxValue(comboboxEl, value) {
    if (!comboboxEl || value === undefined || value === null) return false;
    let valStr = String(value).toLowerCase().trim();
    if (value === true) valStr = 'yes';
    if (value === false) valStr = 'no';
    if (!valStr) return false;

    try {
      comboboxEl.focus();
      comboboxEl.click();

      // Wait 150ms for popup menu / listbox options to render in DOM or shadow root
      await new Promise(r => setTimeout(r, 150));

      const optionSelectors = '[role="option"], [data-automation-id*="option"], [data-automation-id*="promptOption"], li, .option, [class*="option"], [id*="option"], div[tabindex="-1"], span[class*="item"]';
      const options = this.querySelectorAllDeep(optionSelectors);

      for (const opt of options) {
        const text = (opt.textContent || opt.getAttribute('data-value') || '').toLowerCase().trim();
        if (!text) continue;

        if (text === valStr || text.startsWith(valStr) || text.includes(valStr) || valStr.includes(text)) {
          opt.click();
          opt.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        // Synonym match
        if (valStr.includes('decline') && (text.includes('decline') || text.includes('choose not') || text.includes('prefer not'))) {
          opt.click();
          return true;
        }
        if (valStr.includes('no') && (text.includes('no') || text.includes('do not') || text.includes('don\'t'))) {
          opt.click();
          return true;
        }
      }

      // Fallback: If input element, type value and press Enter key
      if (comboboxEl.tagName === 'INPUT' || comboboxEl.getAttribute('contenteditable') === 'true') {
        this.setInputValue(comboboxEl, String(value));
        comboboxEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        comboboxEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
        return true;
      }
    } catch (e) {
      console.warn('Combobox select failed', e);
    }
    return false;
  },

  // File Upload Assigner (DataTransfer + File object + Dropzone dispatches)
  async setFileInput(fileInput, fileBlobUrl, filename, mimetype) {
    if (!fileInput || !fileBlobUrl) return false;

    try {
      const res = await fetch(fileBlobUrl);
      if (!res.ok) return false;

      const blob = await res.blob();
      const file = new File([blob], filename || 'resume.pdf', { type: mimetype || 'application/pdf' });

      if (typeof DataTransfer !== 'undefined') {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      }

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Also trigger event on parent dropzone if present
      const container = fileInput.closest ? fileInput.closest('.drop-zone, [data-automation-id*="drop-zone"], [class*="dropzone"], [class*="upload"]') : null;
      if (container) {
        container.dispatchEvent(new Event('change', { bubbles: true }));
        container.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    } catch (e) {
      console.error('Failed to set file input:', e);
      return false;
    }
  },

  // Extract label text from associated elements or nearby DOM
  getElementLabelText(el) {
    if (!el) return '';
    const rootDoc = el.ownerDocument || document;

    // 1. Check explicit <label for="...">
    if (el.id) {
      try {
        const explicitLabel = this.querySelectorDeep(`label[for="${CSS.escape(el.id)}"]`, rootDoc);
        if (explicitLabel) return explicitLabel.textContent.trim();
      } catch (e) {}
    }

    // 2. Check parent <label>
    const parentLabel = el.closest ? el.closest('label') : null;
    if (parentLabel) return parentLabel.textContent.trim();

    // 3. Check aria-labelledby or aria-label
    if (el.getAttribute && el.getAttribute('aria-label')) {
      return el.getAttribute('aria-label').trim();
    }
    const ariaLabelledBy = el.getAttribute ? el.getAttribute('aria-labelledby') : null;
    if (ariaLabelledBy) {
      const labelEl = this.querySelectorDeep(`#${CSS.escape(ariaLabelledBy)}`, rootDoc);
      if (labelEl) return labelEl.textContent.trim();
    }

    // 4. Check placeholder, name, id
    if (el.placeholder) return el.placeholder.trim();

    // 5. Look for preceding sibling or parent text container
    if (el.closest) {
      const container = el.closest('.form-group, .field, [class*="field"], [class*="form"], tr, td, div');
      if (container) {
        const labelEl = container.querySelector('label, .label, [class*="label"], header, span');
        if (labelEl && labelEl !== el) {
          return labelEl.textContent.trim();
        }
      }
    }

    return el.name || el.id || '';
  }
};
