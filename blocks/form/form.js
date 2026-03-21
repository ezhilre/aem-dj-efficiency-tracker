export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'weekly-report-form';
  form.noValidate = true;

  const rows = [...block.children];

  const normalizeName = (label) => label.toLowerCase().trim().replace(/\s+/g, '-');

  const state = {
    fields: [],
    submitButton: null,
  };

  const errorSummary = document.createElement('div');
  errorSummary.className = 'form-error-summary';
  errorSummary.hidden = true;
  errorSummary.setAttribute('role', 'alert');
  errorSummary.setAttribute('aria-live', 'polite');

  const clearSummary = () => {
    errorSummary.hidden = true;
    errorSummary.replaceChildren();
  };

  const showSummary = (errors) => {
    errorSummary.hidden = false;
    errorSummary.replaceChildren();

    const title = document.createElement('div');
    title.className = 'form-error-summary-title';
    title.textContent = 'Please fix the errors below before continuing.';

    const list = document.createElement('ul');
    list.className = 'form-error-summary-list';

    errors.forEach(({ label, message }) => {
      const item = document.createElement('li');
      item.textContent = `${label}: ${message}`;
      list.appendChild(item);
    });

    errorSummary.appendChild(title);
    errorSummary.appendChild(list);
  };

  const setFieldError = (field, errorEl, message) => {
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      field.removeAttribute('aria-invalid');
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  };

  const createRow = (labelText, field, errorEl) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', field.id);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'form-control-wrap';
    controlWrap.appendChild(field);
    if (errorEl) controlWrap.appendChild(errorEl);

    wrapper.appendChild(label);
    wrapper.appendChild(controlWrap);

    return wrapper;
  };

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

    let isOpen = false;

    const closeMenu = () => {
      isOpen = false;
      menu.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      if (!isOpen) {
        isOpen = true;
        menu.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }
    };

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
        option.textContent = opt;
        option.setAttribute('role', 'option');

        option.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });

        option.addEventListener('click', () => {
          input.value = opt;
          input.setCustomValidity('');
          setFieldError(input, errorEl, '');
          closeMenu();
        });

        menu.appendChild(option);
      });

      openMenu();
    };

    input.addEventListener('focus', () => {
      // Do not show all emails on focus. Only show matches after typing.
      if (input.value.trim()) renderMenu(input.value);
    });

    input.addEventListener('input', () => {
      input.setCustomValidity('');
      setFieldError(input, errorEl, '');
      renderMenu(input.value);
      clearSummary();
    });

    input.addEventListener('blur', () => {
      window.setTimeout(() => {
        const value = input.value.trim();
        if (!value) {
          input.setCustomValidity('Email is required.');
          setFieldError(input, errorEl, 'Email is required.');
          closeMenu();
          return;
        }

        const valid = options.includes(value);
        if (!valid) {
          input.setCustomValidity('Please select a valid email from the list.');
          setFieldError(input, errorEl, 'Please select a valid email from the list.');
        } else {
          input.setCustomValidity('');
          setFieldError(input, errorEl, '');
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

    state.fields.push({
      name,
      label: labelText,
      field: input,
      errorEl,
      kind: 'email',
      options,
    });

    return wrapper;
  };

  const validateField = (item) => {
    const { field, label, kind, options, errorEl } = item;
    const value = field.value.trim();
    let message = '';

    if (!value) {
      message = `${label} is required.`;
    } else if (kind === 'email') {
      if (!options.includes(value)) {
        message = 'Please select a valid email from the list.';
      }
    } else if (field.type === 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        message = `${label} must be a number.`;
      } else if (num < 0) {
        message = `${label} must be 0 or greater.`;
      }
    }

    setFieldError(field, errorEl, message);
    return message;
  };

  const validateAll = () => {
    const errors = [];
    state.fields.forEach((item) => {
      const message = validateField(item);
      if (message) {
        errors.push({
          label: item.label,
          message,
          field: item.field,
        });
      }
    });
    return errors;
  };

  const handleAction = () => {
    clearSummary();

    const errors = validateAll();
    if (errors.length) {
      showSummary(errors);

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
      eventType: 'card.submitted',
    };

    window.adobeDataLayer = window.adobeDataLayer || [];
    window.adobeDataLayer.push(payload);

    console.log('✅ adobeDataLayer push:', payload);

    const success = document.createElement('div');
    success.className = 'form-success';
    success.innerHTML = '<h2>Weekly report captured successfully</h2>';
    block.replaceChildren(success);
  };

  let submitRow = null;

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueText = row.children[1]?.textContent.trim() || '';

    if (!labelText) return;

    if (labelText === 'Submit Weekly Report') {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = labelText;
      button.className = 'form-submit-button';
      button.addEventListener('click', handleAction);
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

      state.fields.push({
        name: field.name,
        label: labelText,
        field,
        errorEl,
        kind: 'text',
      });
    } else if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.required = true;

      state.fields.push({
        name: field.name,
        label: labelText,
        field,
        errorEl,
        kind: 'date',
      });
    } else if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.step = '0.1';
      field.min = '0';
      field.name = 'hours-saved';
      field.id = field.name;
      field.placeholder = 'Enter hours saved';
      field.required = true;

      state.fields.push({
        name: field.name,
        label: labelText,
        field,
        errorEl,
        kind: 'number',
      });
    } else if (labelText === 'Accelerator Used') {
      field = document.createElement('select');
      field.name = 'accelerator-used';
      field.id = field.name;
      field.required = true;

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select accelerator';
      placeholder.disabled = true;
      placeholder.selected = true;
      field.appendChild(placeholder);

      valueText
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean)
        .forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          field.appendChild(option);
        });

      state.fields.push({
        name: field.name,
        label: labelText,
        field,
        errorEl,
        kind: 'select',
      });
    } else if (labelText === 'Email') {
      const emails = valueText
        .split(/\n+/)
        .map((email) => email.trim())
        .filter(Boolean);

      const emailRow = createSearchableEmailSelect({
        labelText,
        name: 'email-address',
        options: emails,
      });

      form.appendChild(emailRow);
      return;
    } else {
      return;
    }

    field.addEventListener('input', () => {
      clearSummary();
      setFieldError(field, errorEl, '');
    });

    field.addEventListener('change', () => {
      clearSummary();
      setFieldError(field, errorEl, '');
    });

    const rowEl = createRow(labelText, field, errorEl);
    form.appendChild(rowEl);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  if (state.submitButton) {
    const submitWrap = document.createElement('div');
    submitWrap.className = 'form-row form-row-submit';
    submitWrap.appendChild(state.submitButton);
    form.appendChild(submitWrap);
  }

  form.prepend(errorSummary);
  block.replaceChildren(form);
}