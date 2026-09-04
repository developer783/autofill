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

  // Select dropdown option matcher
  setSelectValue(selectEl, value) {
    if (!selectEl || value === undefined || value === null) return false;
    const valLower = String(value).toLowerCase().trim();
    if (!valLower) return false;

    let bestMatchIndex = -1;

    for (let i = 0; i < selectEl.options.length; i++) {
      const opt = selectEl.options[i];
      const optVal = opt.value.toLowerCase().trim();
      const optText = opt.text.toLowerCase().trim();

      if (optVal === valLower || optText === valLower) {
        bestMatchIndex = i;
        break;
      }
      if (optText.includes(valLower) || valLower.includes(optText)) {
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex !== -1) {
      selectEl.selectedIndex = bestMatchIndex;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      selectEl.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  },

  // Radio button clicker by value or label text
  setRadioValue(radioElements, value) {
    if (!radioElements || radioElements.length === 0 || value === undefined || value === null) return false;
    const valLower = String(value).toLowerCase().trim();
    if (!valLower) return false;

    for (const radio of radioElements) {
      const radioVal = (radio.value || '').toLowerCase().trim();
      const labelText = this.getElementLabelText(radio).toLowerCase().trim();

      if (radioVal === valLower || labelText.includes(valLower) || valLower.includes(labelText)) {
        radio.checked = true;
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  },

  // Custom Combobox / ARIA Dropdown Clicker
  async setCustomComboboxValue(comboboxEl, value) {
    if (!comboboxEl || value === undefined || value === null) return false;
    const valLower = String(value).toLowerCase().trim();
    if (!valLower) return false;

    try {
      comboboxEl.focus();
      comboboxEl.click();

      // Wait 150ms for popup menu to render in DOM
      await new Promise(r => setTimeout(r, 150));

      const options = this.querySelectorAllDeep('[role="option"], li, .option, [class*="option"]');
      for (const opt of options) {
        const text = (opt.textContent || '').toLowerCase().trim();
        if (text === valLower || text.includes(valLower) || valLower.includes(text)) {
          opt.click();
          return true;
        }
      }
    } catch (e) {
      console.warn('Combobox select failed', e);
    }
    return false;
  },

  // File Upload Assigner (DataTransfer + File object)
  async setFileInput(fileInput, fileBlobUrl, filename, mimetype) {
    if (!fileInput || !fileBlobUrl) return false;

    try {
      const res = await fetch(fileBlobUrl);
      if (!res.ok) return false;

      const blob = await res.blob();
      const file = new File([blob], filename || 'resume.pdf', { type: mimetype || 'application/pdf' });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
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
