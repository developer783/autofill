// Helper Utilities for Content Script Form Engine

window.ATSHelpers = {
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

      const options = document.querySelectorAll('[role="option"], li, .option, [class*="option"]');
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

    // 1. Check explicit <label for="...">
    if (el.id) {
      try {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicitLabel) return explicitLabel.textContent.trim();
      } catch (e) {}
    }

    // 2. Check parent <label>
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    // 3. Check aria-labelledby or aria-label
    if (el.getAttribute('aria-label')) {
      return el.getAttribute('aria-label').trim();
    }
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) return labelEl.textContent.trim();
    }

    // 4. Check placeholder, name, id
    if (el.placeholder) return el.placeholder.trim();

    // 5. Look for preceding sibling or parent text container
    const container = el.closest('.form-group, .field, [class*="field"], [class*="form"], tr, td, div');
    if (container) {
      const labelEl = container.querySelector('label, .label, [class*="label"], header, span');
      if (labelEl && labelEl !== el) {
        return labelEl.textContent.trim();
      }
    }

    return el.name || el.id || '';
  }
};
