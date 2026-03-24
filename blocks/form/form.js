export default function decorate(block) {
  /*
    Main form setup:
    - Creates the form element
    - Reads each row from the block content
    - Converts each row into a real field
    - Adds validation
    - Adds the searchable email picker
    - Moves the submit button to the end
    - Replaces the form with a success view after submit
    - Moves the WebSDK script into <head>
  */
  const form = document.createElement('form');
  form.className = 'weekly-report-form';
  form.noValidate = true;

  const rows = [...block.children];

  const state = {
    fields: [],
    submitButton: null,
  };

  // Convert a label like "From Date" into "from-date"
  const normalizeName = (label) => label.toLowerCase().trim().replace(/\s+/g, '-');

  /*
    injectLaunchScript()
    Takes the WebSDK URL from the block and injects it into <head>.
    This keeps the config in content while loading the real script on the page.
  */
  const injectLaunchScript = (url) => {
    if (!url) return;

    const cleanUrl = String(url)
      .replace(/%22/g, '')
      .replace(/"/g, '')
      .trim();

    if (!cleanUrl) return;

    const alreadyLoaded = document.querySelector(`script[src="${cleanUrl}"]`);
    if (alreadyLoaded) return;

    const script = document.createElement('script');
    script.src = cleanUrl;
    script.async = true;

    document.head.appendChild(script);

    console.log('✅ Adobe Launch loaded:', cleanUrl);
  };

  /*
    setFieldError()
    Applies or clears the visual error state for a field.
    - Adds red border when invalid
    - Shows inline error text
    - Clears both when valid
  */
  const setFieldError = (field, errorEl, message) => {
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      field.classList.add('is-invalid');
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      field.removeAttribute('aria-invalid');
      field.classList.remove('is-invalid');
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  };

  const clearFieldError = (field, errorEl) => {
    field.removeAttribute('aria-invalid');
    field.classList.remove('is-invalid');
    errorEl.textContent = '';
    errorEl.hidden = true;
  };

  const normalizeList = (valueText) =>
    valueText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  /*
    createRow()
    Builds a standard form row:
    label on the left, control on the right, error text below the control.
  */
  const createRow = (labelText, field, errorEl) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', field.id);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'form-control-wrap';
    controlWrap.appendChild(field);
    controlWrap.appendChild(errorEl);

    wrapper.appendChild(label);
    wrapper.appendChild(controlWrap);

    return wrapper;
  };

  /*
    registerField()
    Stores every field in state so that validation can be run on all fields
    before submit.
  */
  const registerField = ({ label, field, errorEl, kind, options = [] }) => {
    state.fields.push({
      label,
      field,
      errorEl,
      kind,
      options,
    });

    field.addEventListener('input', () => {
      setFieldError(field, errorEl, '');
    });

    field.addEventListener('change', () => {
      setFieldError(field, errorEl, '');
    });
  };

  /*
    validateField()
    Validates one field and returns an error message if invalid.
    This is used by validateAll().
  */
  const validateField = (item) => {
    const { field, label, kind, options, errorEl } = item;
    let message = '';

    const value = field.value != null ? String(field.value).trim() : '';

    if (!value) {
      message = `${label} is required.`;
    } else if (kind === 'email') {
      if (!options.includes(value)) {
        message = 'Please select a valid email from the list.';
      }
    } else if (kind === 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        message = `${label} must be a number.`;
      } else if (num < 0) {
        message = `${label} must be 0 or greater.`;
      }
    } else if (kind === 'multiselect') {
      if (!value) {
        message = `${label} is required.`;
      }
    }

    setFieldError(field, errorEl, message);
    return message;
  };
  /*
    validateAll()
    Runs validation on every registered field.
    Returns an array of all invalid fields.
  */
  const validateAll = () => {
    const errors = [];
    state.fields.forEach((item) => {
      const message = validateField(item);
      if (message) errors.push({ ...item, message });
    });
    return errors;
  };

  /*
    createSearchableEmailSelect()
    Creates the custom searchable email input.
    Behavior:
    - user types into the input
    - matching emails are shown in a modern dropdown
    - selecting one fills the input
    - only exact values from the source list are accepted
  */
  const createSearchableEmailSelect = ({ labelText, name, options = [] }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row form-row-searchable';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', name);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'searchable-select-wrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = name;
    input.name = name;
    input.placeholder = 'Search and select email';
    input.autocomplete = 'off';
    input.required = true;
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'listbox');

    const menu = document.createElement('div');
    menu.className = 'searchable-select-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.hidden = true;

    const getInitials = (email) => {
      const localPart = email.split('@')[0] || '';
      const parts = localPart.split(/[._-]/).filter(Boolean);

      if (!parts.length) return email.slice(0, 2).toUpperCase();

      return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');
    };

    const getDisplayName = (email) => {
      const localPart = email.split('@')[0] || email;
      return localPart
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    };

    const closeMenu = () => {
      menu.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    let selectedViaMenu = false;

    const renderMenu = (query) => {
      const value = query.trim().toLowerCase();
      menu.replaceChildren();

      if (!value) {
        closeMenu();
        return;
      }

      const filtered = options.filter((opt) => opt.toLowerCase().includes(value));

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'searchable-select-empty';
        empty.textContent = 'No matching emails';
        menu.appendChild(empty);
        openMenu();
        return;
      }

      filtered.forEach((opt) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'searchable-select-option';
        option.setAttribute('role', 'option');

        const avatar = document.createElement('div');
        avatar.className = 'searchable-select-option__avatar';
        avatar.textContent = getInitials(opt);

        const content = document.createElement('div');
        content.className = 'searchable-select-option__content';

        const emailLine = document.createElement('div');
        emailLine.className = 'searchable-select-option__email';
        emailLine.textContent = opt;

        const metaLine = document.createElement('div');
        metaLine.className = 'searchable-select-option__meta';
        metaLine.textContent = `Select ${getDisplayName(opt)}`;

        content.appendChild(emailLine);
        content.appendChild(metaLine);

        option.appendChild(avatar);
        option.appendChild(content);

        option.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });

        option.addEventListener('click', () => {
          selectedViaMenu = true;
          input.value = opt;
          input.setCustomValidity('');
          clearFieldError(input, errorEl);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          closeMenu();

          window.setTimeout(() => {
            selectedViaMenu = false;
          }, 0);
        });

        menu.appendChild(option);
      });

      openMenu();
    };

    input.addEventListener('focus', () => {
      if (input.value.trim()) {
        renderMenu(input.value);
      }
    });

    input.addEventListener('input', () => {
      input.setCustomValidity('');
      clearFieldError(input, errorEl);
      renderMenu(input.value);
    });

    input.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (selectedViaMenu) {
          return;
        }

        const value = input.value.trim();

        if (!value) {
          input.setCustomValidity('Email is required.');
          setFieldError(input, errorEl, 'Email is required.');
          closeMenu();
          return;
        }

        if (!options.includes(value)) {
          input.setCustomValidity('Please select a valid email from the list.');
          setFieldError(input, errorEl, 'Please select a valid email from the list.');
        } else {
          input.setCustomValidity('');
          clearFieldError(input, errorEl);
        }

        closeMenu();
      }, 120);
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) closeMenu();
    });

    controlWrap.appendChild(input);
    controlWrap.appendChild(menu);
    controlWrap.appendChild(errorEl);

    wrapper.appendChild(label);
    wrapper.appendChild(controlWrap);

    registerField({
      label: labelText,
      field: input,
      errorEl,
      kind: 'email',
      options,
    });

    return wrapper;
  };

  const createMultiSelectAccelerator = ({ labelText, name, options = [] }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row form-row-multiselect';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', `${name}-search`);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'multi-select-wrap';

    const selectedRow = document.createElement('div');
    selectedRow.className = 'multi-select-selected';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = `${name}-search`;
    searchInput.placeholder = 'Search accelerators';
    searchInput.autocomplete = 'off';

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = name;
    hiddenInput.id = name;
    hiddenInput.value = '';

    const menu = document.createElement('div');
    menu.className = 'multi-select-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.hidden = true;

    let selected = [];

    const syncValue = () => {
      hiddenInput.value = selected.join(', ');
      if (selected.length) {
        clearFieldError(hiddenInput, errorEl);
      }
    };

    const closeMenu = () => {
      menu.hidden = true;
      searchInput.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      menu.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
    };

    const removeItem = (value) => {
      selected = selected.filter((item) => item !== value);
      renderSelected();
      syncValue();
      renderMenu(searchInput.value);
    };

    const addItem = (value) => {
      if (!selected.includes(value)) {
        selected.push(value);
        renderSelected();
        syncValue();
      }
    };

    const renderSelected = () => {
      selectedRow.replaceChildren();

      selected.forEach((value) => {
        const chip = document.createElement('span');
        chip.className = 'multi-select-chip';

        const text = document.createElement('span');
        text.className = 'multi-select-chip__text';
        text.textContent = value;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'multi-select-chip__remove';
        removeBtn.setAttribute('aria-label', `Remove ${value}`);
        removeBtn.textContent = '×';

        removeBtn.addEventListener('click', () => removeItem(value));

        chip.appendChild(text);
        chip.appendChild(removeBtn);
        selectedRow.appendChild(chip);
      });

      searchInput.placeholder = selected.length
        ? 'Add another accelerator'
        : 'Search accelerators';
    };

    const renderMenu = (query) => {
      const value = query.trim().toLowerCase();
      menu.replaceChildren();

      const filtered = value
        ? options.filter((opt) => opt.toLowerCase().includes(value))
        : options;

      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'multi-select-empty';
        empty.textContent = 'No matching accelerators';
        menu.appendChild(empty);
        openMenu();
        return;
      }

      filtered.forEach((opt) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'multi-select-option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', selected.includes(opt) ? 'true' : 'false');

        if (selected.includes(opt)) {
          option.classList.add('is-selected');
        }

        const left = document.createElement('span');
        left.className = 'multi-select-option__left';

        const check = document.createElement('span');
        check.className = 'multi-select-option__check';
        check.textContent = selected.includes(opt) ? '✓' : '';

        const text = document.createElement('span');
        text.className = 'multi-select-option__text';
        text.textContent = opt;

        left.appendChild(check);
        left.appendChild(text);

        option.appendChild(left);

        option.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });

        option.addEventListener('click', () => {
          if (selected.includes(opt)) {
            removeItem(opt);
          } else {
            addItem(opt);
          }

          clearFieldError(hiddenInput, errorEl);
          searchInput.value = '';
          renderMenu('');
          searchInput.focus();
        });

        menu.appendChild(option);
      });

      openMenu();
    };

    searchInput.addEventListener('input', () => {
      clearFieldError(hiddenInput, errorEl);
      renderMenu(searchInput.value);
    });

    searchInput.addEventListener('focus', () => {
      renderMenu(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !searchInput.value && selected.length) {
        selected.pop();
        renderSelected();
        syncValue();
        renderMenu('');
      }

      if (e.key === 'Escape') {
        closeMenu();
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const firstOption = menu.querySelector('.multi-select-option');
        if (firstOption) firstOption.click();
      }
    });

    searchInput.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (!selected.length) {
          setFieldError(hiddenInput, errorEl, `${labelText} is required.`);
        } else {
          clearFieldError(hiddenInput, errorEl);
        }
        closeMenu();
      }, 120);
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) closeMenu();
    });

    renderSelected();
    syncValue();

    controlWrap.appendChild(selectedRow);
    controlWrap.appendChild(searchInput);
    controlWrap.appendChild(menu);
    controlWrap.appendChild(errorEl);
    controlWrap.appendChild(hiddenInput);

    wrapper.appendChild(label);
    wrapper.appendChild(controlWrap);

    registerField({
      label: labelText,
      field: hiddenInput,
      errorEl,
      kind: 'multiselect',
    });

    return wrapper;
  };

  /*
    renderSuccessView()
    Builds the post-submit screen.
    It shows:
    - a success headline
    - a short summary sentence
    - the submitted values in a clean list
  */
  const renderSuccessView = (data) => {
    const success = document.createElement('div');
    success.className = 'form-success';

    const title = document.createElement('h2');
    title.textContent = 'Weekly report captured successfully';

    const summary = document.createElement('p');
    const name = data.name || 'You';
    const project = data.project || 'your project';
    const hours = data['hours-saved'] || '0';
    summary.textContent = `${name} submitted a weekly report for ${project} and logged ${hours} hours saved.`;

    const details = document.createElement('div');
    details.className = 'form-success-details';

    const items = [
      ['Name', data.name],
      ['Email', data['email-address']],
      ['LDAP', data.ldap],
      ['Project', data.project],
      ['From Date', data['from-date']],
      ['To Date', data['to-date']],
      ['Hours Saved', data['hours-saved']],
      ['Accelerator Used', data['accelerator-used']],
    ];

    items.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'form-success-row';

      const key = document.createElement('span');
      key.className = 'form-success-key';
      key.textContent = label;

      const val = document.createElement('span');
      val.className = 'form-success-value';
      val.textContent = value || '-';

      row.appendChild(key);
      row.appendChild(val);
      details.appendChild(row);
    });

    success.appendChild(title);
    success.appendChild(summary);
    success.appendChild(details);

    return success;
  };

  /*
    handleSubmit()
    Runs full validation.
    If anything is invalid, stop and focus the first invalid field.
    If valid, push data to adobeDataLayer and show the success summary.
  */
  const handleSubmit = () => {
    const errors = validateAll();

    if (errors.length) {
      const firstInvalid = errors[0]?.field;
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    const payload = {
      accelaratorsUsed: data['accelerator-used'] || '',
      emailAddress: data['email-address'] || '',
      fromDate: data['from-date'] || '',
      hoursSaved: Number(data['hours-saved'] || 0),
      ldap: data['ldap'] || '',
      projectName: data['project'] || '',
      toDate: data['to-date'] || '',
      event: 'card.submitted',
    };

    window.adobeDataLayer = window.adobeDataLayer || [];
    window.adobeDataLayer.push(payload);

    console.log('✅ adobeDataLayer push:', payload);

    block.replaceChildren(renderSuccessView(data));
  };

  /*
    Main block parsing loop:
    Reads each row from the source block and converts it into the right field type.
  */
  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueEl = row.children[1];
    const valueText = valueEl?.textContent.trim() || '';

    if (!labelText) return;

    // Move the WebSDK script into <head> and do not render this row.
    if (labelText === 'WebSDK') {
      const link = valueEl?.querySelector('a');
      const url = link?.href || valueText;
      injectLaunchScript(url);
      return;
    }

    if (labelText === 'Submit Weekly Report') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = labelText;
      button.className = 'form-submit-button';
      button.addEventListener('click', handleSubmit);
      state.submitButton = button;
      return;
    }

    let field = null;
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.hidden = true;

    if (labelText === 'Name' || labelText === 'Project' || labelText === 'LDAP') {
      field = document.createElement('input');
      field.type = 'text';
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.placeholder = `Enter ${labelText.toLowerCase()}`;
      field.required = true;

      registerField({
        label: labelText,
        field,
        errorEl,
        kind: 'text',
      });

      form.appendChild(createRow(labelText, field, errorEl));
      return;
    }

    if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.required = true;

      registerField({
        label: labelText,
        field,
        errorEl,
        kind: 'date',
      });

      form.appendChild(createRow(labelText, field, errorEl));
      return;
    }

    if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.step = '0.1';
      field.min = '0';
      field.name = 'hours-saved';
      field.id = field.name;
      field.placeholder = 'Enter hours saved';
      field.required = true;

      registerField({
        label: labelText,
        field,
        errorEl,
        kind: 'number',
      });

      form.appendChild(createRow(labelText, field, errorEl));
      return;
    }

    if (labelText === 'Accelerator Used') {
      const options = normalizeList(valueText);

      form.appendChild(
        createMultiSelectAccelerator({
          labelText,
          name: 'accelerator-used',
          options,
        }),
      );
      return;
    }

    if (labelText === 'Email') {
      const emails = normalizeList(valueText);

      form.appendChild(
        createSearchableEmailSelect({
          labelText,
          name: 'email-address',
          options: emails,
        }),
      );
      return;
    }
  });

  /*
    Submit button is appended at the very end of the form
    so it always appears after every field.
  */
  if (state.submitButton) {
    const submitWrap = document.createElement('div');
    submitWrap.className = 'form-row form-row-submit';
    submitWrap.appendChild(state.submitButton);
    form.appendChild(submitWrap);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  block.replaceChildren(form);
}