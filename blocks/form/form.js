export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'weekly-report-form';
  form.noValidate = true;

  const rows = [...block.children];

  const state = {
    fields: [],
    submitButton: null,
  };

  const normalizeName = (label) => label.toLowerCase().trim().replace(/\s+/g, '-');

  /*
    Inject Adobe Launch script into <head>
  */
  const injectLaunchScript = (url) => {
    if (!url) return;

    const cleanUrl = url.replace('%22', '').replace('"', '');

    if (document.querySelector(`script[src="${cleanUrl}"]`)) return;

    const script = document.createElement('script');
    script.src = cleanUrl;
    script.async = true;

    document.head.appendChild(script);

    console.log('✅ Adobe Launch loaded:', cleanUrl);
  };

  const setFieldError = (field, errorEl, message) => {
    if (message) {
      field.classList.add('is-invalid');
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      field.classList.remove('is-invalid');
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
    controlWrap.appendChild(errorEl);

    wrapper.appendChild(label);
    wrapper.appendChild(controlWrap);

    return wrapper;
  };

  const registerField = ({ label, field, errorEl, kind, options = [] }) => {
    state.fields.push({ label, field, errorEl, kind, options });

    field.addEventListener('input', () => setFieldError(field, errorEl, ''));
    field.addEventListener('change', () => setFieldError(field, errorEl, ''));
  };

  const validateField = (item) => {
    const { field, label, kind, options, errorEl } = item;
    let message = '';

    const value = field.value?.trim();

    if (!value) {
      message = `${label} is required.`;
    } else if (kind === 'email' && !options.includes(value)) {
      message = 'Please select a valid email from the list.';
    } else if (kind === 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) message = `${label} must be a number.`;
      else if (num < 0) message = `${label} must be 0 or greater.`;
    }

    setFieldError(field, errorEl, message);
    return message;
  };

  const validateAll = () => state.fields.map(validateField).filter(Boolean);

  /*
    Searchable Email Dropdown
  */
  const createSearchableEmailSelect = ({ labelText, name, options = [] }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = labelText;

    const controlWrap = document.createElement('div');
    controlWrap.className = 'searchable-select-wrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = name;
    input.id = name;
    input.placeholder = 'Search and select email';
    input.required = true;

    const menu = document.createElement('div');
    menu.className = 'searchable-select-menu';
    menu.hidden = true;

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.hidden = true;

    const renderMenu = (query) => {
      const value = query.toLowerCase().trim();
      menu.innerHTML = '';

      if (!value) {
        menu.hidden = true;
        return;
      }

      const filtered = options.filter((e) => e.toLowerCase().includes(value));

      filtered.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt;

        btn.onclick = () => {
          input.value = opt;
          menu.hidden = true;
        };

        menu.appendChild(btn);
      });

      menu.hidden = !filtered.length;
    };

    input.addEventListener('input', () => {
      renderMenu(input.value);
      setFieldError(input, errorEl, '');
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!options.includes(input.value)) {
          setFieldError(input, errorEl, 'Select valid email');
        }
      }, 100);
    });

    controlWrap.append(input, menu, errorEl);
    wrapper.append(label, controlWrap);

    registerField({ label: labelText, field: input, errorEl, kind: 'email', options });

    return wrapper;
  };

  /*
    Success View
  */
  const renderSuccessView = (data) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <h2>Weekly report captured successfully</h2>
      <p>${data.name} submitted ${data['hours-saved']} hours for ${data.project}</p>
    `;
    return div;
  };

  const handleSubmit = () => {
    const errors = validateAll();

    if (errors.length) return;

    const data = Object.fromEntries(new FormData(form).entries());

    window.adobeDataLayer = window.adobeDataLayer || [];
    window.adobeDataLayer.push({
      accelaratorsUsed: data['accelerator-used'],
      emailAddress: data['email-address'],
      fromDate: data['from-date'],
      hoursSaved: Number(data['hours-saved']),
      ldap: data['ldap'],
      projectName: data['project'],
      toDate: data['to-date'],
      eventType: 'card.submitted',
    });

    block.replaceChildren(renderSuccessView(data));
  };

  /*
    MAIN LOOP
  */
  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueEl = row.children[1];
    const valueText = valueEl?.textContent.trim() || '';

    // ✅ HANDLE WebSDK (move script to head)
    if (labelText === 'WebSDK') {
      const link = valueEl?.querySelector('a');
      const url = link?.href || valueText;
      injectLaunchScript(url);
      return;
    }

    if (labelText === 'Submit Weekly Report') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = labelText;
      btn.onclick = handleSubmit;
      state.submitButton = btn;
      return;
    }

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.hidden = true;

    let field;

    if (['Name', 'Project', 'LDAP'].includes(labelText)) {
      field = document.createElement('input');
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.required = true;
      registerField({ label: labelText, field, errorEl, kind: 'text' });
      form.appendChild(createRow(labelText, field, errorEl));
    }

    else if (labelText === 'Email') {
      const emails = [...valueEl.querySelectorAll('p')].map((p) => p.textContent.trim());
      form.appendChild(createSearchableEmailSelect({
        labelText,
        name: 'email-address',
        options: emails,
      }));
    }

    else if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.name = 'hours-saved';
      field.id = field.name;
      field.required = true;
      registerField({ label: labelText, field, errorEl, kind: 'number' });
      form.appendChild(createRow(labelText, field, errorEl));
    }

    else if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = normalizeName(labelText);
      field.id = field.name;
      field.required = true;
      registerField({ label: labelText, field, errorEl, kind: 'date' });
      form.appendChild(createRow(labelText, field, errorEl));
    }

    else if (labelText === 'Accelerator Used') {
      field = document.createElement('select');
      field.name = 'accelerator-used';
      field.id = field.name;

      valueText.split(',').forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.trim();
        o.textContent = opt.trim();
        field.appendChild(o);
      });

      registerField({ label: labelText, field, errorEl, kind: 'select' });
      form.appendChild(createRow(labelText, field, errorEl));
    }
  });

  if (state.submitButton) {
    const wrap = document.createElement('div');
    wrap.className = 'form-row form-row-submit';
    wrap.appendChild(state.submitButton);
    form.appendChild(wrap);
  }

  block.replaceChildren(form);
}