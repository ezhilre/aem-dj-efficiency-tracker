export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'weekly-report-form';
  form.noValidate = true;

  const rows = [...block.children];

  const normalizeName = (label) => label.toLowerCase().trim().replace(/\s+/g, '-');

  const createRow = (labelText, field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', field.id);

    wrapper.appendChild(label);
    wrapper.appendChild(field);

    return wrapper;
  };

  const createSearchableSelect = ({
    labelText,
    name,
    options = [],
    placeholder = `Select ${labelText.toLowerCase()}`,
  }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row form-row-searchable';

    const label = document.createElement('label');
    label.textContent = labelText;

    const control = document.createElement('div');
    control.className = 'searchable-select';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = name;
    input.name = name;
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.required = true;
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'listbox');

    const menu = document.createElement('div');
    menu.className = 'searchable-select-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'listbox');

    const emptyState = document.createElement('div');
    emptyState.className = 'searchable-select-empty';
    emptyState.textContent = 'No matching emails';
    emptyState.hidden = true;

    const setValidity = () => {
      const value = input.value.trim();
      const isValid = options.includes(value);
      input.setCustomValidity(isValid ? '' : 'Please select a valid email from the list');
      return isValid;
    };

    const closeMenu = () => {
      menu.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      menu.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    const renderOptions = (filterText = '') => {
      const query = filterText.trim().toLowerCase();
      menu.replaceChildren();

      const filtered = options.filter((opt) => opt.toLowerCase().includes(query));

      if (!filtered.length) {
        emptyState.hidden = false;
        menu.appendChild(emptyState);
        return;
      }

      emptyState.hidden = true;

      filtered.forEach((opt) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'searchable-select-option';
        option.textContent = opt;
        option.setAttribute('role', 'option');
        option.addEventListener('mousedown', (e) => {
          e.preventDefault(); // keep focus on input
        });
        option.addEventListener('click', () => {
          input.value = opt;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.setCustomValidity('');
          closeMenu();
        });
        menu.appendChild(option);
      });
    };

    input.addEventListener('focus', () => {
      renderOptions(input.value);
      openMenu();
    });

    input.addEventListener('input', () => {
      renderOptions(input.value);
      openMenu();
      setValidity();
    });

    input.addEventListener('blur', () => {
      window.setTimeout(() => {
        setValidity();
      }, 120);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        closeMenu();
        setValidity();
      }
    });

    label.setAttribute('for', name);

    control.appendChild(input);
    control.appendChild(menu);

    wrapper.appendChild(label);
    wrapper.appendChild(control);

    return { wrapper, input, setValidity };
  };

  const handleAction = () => {
    const fields = [...form.querySelectorAll('input, select, textarea')];
    let firstInvalid = null;

    fields.forEach((field) => {
      if (typeof field.checkValidity === 'function' && !field.checkValidity()) {
        if (!firstInvalid) firstInvalid = field;
      }
    });

    if (firstInvalid) {
      firstInvalid.reportValidity();
      firstInvalid.focus();
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
  };

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueText = row.children[1]?.textContent.trim() || '';

    if (!labelText) return;

    let field = null;

    if (
      labelText === 'Name' ||
      labelText === 'Project' ||
      labelText === 'LDAP'
    ) {
      field = document.createElement('input');
      field.type = 'text';
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.placeholder = `Enter ${labelText.toLowerCase()}`;
      field.required = true;
    } else if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.required = true;
    } else if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.step = '0.1';
      field.min = '0';
      field.name = 'hours-saved';
      field.id = field.name;
      field.placeholder = 'Enter hours saved';
      field.required = true;
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
    } else if (labelText === 'Email') {
      const emails = valueText
        .split(/\n+/)
        .map((email) => email.trim())
        .filter(Boolean);

      const searchable = createSearchableSelect({
        labelText,
        name: 'email-address',
        options: emails,
        placeholder: 'Search and select email',
      });

      form.appendChild(searchable.wrapper);
      return;
    } else if (labelText === 'Submit Weekly Report') {
      field = document.createElement('button');
      field.type = 'button';
      field.textContent = labelText;
      field.className = 'form-submit-button';
      field.addEventListener('click', handleAction);
    }

    if (!field) return;

    if (field.type !== 'button') {
      field.required = true;
    }

    if (field.type === 'button') {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-row form-row-submit';
      wrapper.appendChild(field);
      form.appendChild(wrapper);
      return;
    }

    form.appendChild(createRow(labelText, field));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  block.replaceChildren(form);
}