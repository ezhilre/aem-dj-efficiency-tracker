export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'weekly-report-form';
  form.noValidate = true;

  const rows = [...block.children];

  const state = {
    fields: [],
    submitButton: null,
  };

  let pendingDateField = null;
  let pendingEmailRow = null;
  let pendingHoursRow = null;

  const normalizeName = (label) => label.toLowerCase().trim().replace(/\s+/g, '-');

  const normalizeList = (valueText) =>
    valueText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

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

    // eslint-disable-next-line no-console
    console.log('✅ Adobe Launch loaded:', cleanUrl);
  };

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

  /**
   * Custom calendar widget that opens below the calendar icon.
   * Returns { wrapper, hiddenInput } — wrapper is the styled div with icon,
   * hiddenInput is <input type="hidden"> that stores the ISO date value.
   */
  const createCustomDatePicker = ({ id, name, errorEl }) => {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();
    let selectedDate = null;

    /* Outer wrapper */
    const pickerWrap = document.createElement('div');
    pickerWrap.className = 'cdp-wrap';

    /* Display field */
    const displayInput = document.createElement('div');
    displayInput.className = 'cdp-display';
    displayInput.setAttribute('role', 'button');
    displayInput.setAttribute('tabindex', '0');
    displayInput.setAttribute('aria-label', 'Pick a date');
    displayInput.setAttribute('aria-haspopup', 'dialog');
    displayInput.setAttribute('aria-expanded', 'false');
    displayInput.setAttribute('id', id);

    const displayText = document.createElement('span');
    displayText.className = 'cdp-display-text cdp-placeholder';
    displayText.textContent = 'dd/mm/yyyy';
    displayInput.appendChild(displayText);

    const calIcon = document.createElement('span');
    calIcon.className = 'cdp-icon';
    calIcon.setAttribute('aria-hidden', 'true');
    calIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    displayInput.appendChild(calIcon);

    /* Hidden input for form value */
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = name;
    hiddenInput.id = `${id}-hidden`;

    /* Calendar popup */
    const popup = document.createElement('div');
    popup.className = 'cdp-popup';
    popup.hidden = true;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Date picker');

    let isOpen = false;

    const formatDisplay = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const toISO = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    };

    const renderCalendar = () => {
      popup.replaceChildren();

      /* Header row */
      const header = document.createElement('div');
      header.className = 'cdp-header';

      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'cdp-nav-btn';
      prevBtn.setAttribute('aria-label', 'Previous month');
      prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

      const monthLabel = document.createElement('div');
      monthLabel.className = 'cdp-month-label';
      monthLabel.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'cdp-nav-btn';
      nextBtn.setAttribute('aria-label', 'Next month');
      nextBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewMonth -= 1;
        if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
        renderCalendar();
      });

      /* Disable next button if already on current month/year */
      const isCurrentMonthView = viewYear === today.getFullYear() && viewMonth === today.getMonth();
      const isFutureMonthView = viewYear > today.getFullYear()
        || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
      nextBtn.disabled = isCurrentMonthView || isFutureMonthView;
      nextBtn.classList.toggle('cdp-nav-btn--disabled', nextBtn.disabled);

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (nextBtn.disabled) return;
        viewMonth += 1;
        if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
        renderCalendar();
      });

      header.appendChild(prevBtn);
      header.appendChild(monthLabel);
      header.appendChild(nextBtn);
      popup.appendChild(header);

      /* Day-of-week row */
      const dowRow = document.createElement('div');
      dowRow.className = 'cdp-dow-row';
      ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach((d) => {
        const cell = document.createElement('span');
        cell.className = 'cdp-dow';
        cell.textContent = d;
        dowRow.appendChild(cell);
      });
      popup.appendChild(dowRow);

      /* Days grid */
      const grid = document.createElement('div');
      grid.className = 'cdp-grid';

      const firstDay = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      /* Leading blanks */
      for (let i = 0; i < firstDay; i += 1) {
        const blank = document.createElement('span');
        blank.className = 'cdp-day cdp-day--blank';
        grid.appendChild(blank);
      }

      for (let d = 1; d <= daysInMonth; d += 1) {
        const dayBtn = document.createElement('button');
        dayBtn.type = 'button';
        dayBtn.className = 'cdp-day';
        dayBtn.textContent = d;

        const thisDate = new Date(viewYear, viewMonth, d);
        const isFuture = thisDate > today;

        const isToday = d === today.getDate()
          && viewMonth === today.getMonth()
          && viewYear === today.getFullYear();
        if (isToday) dayBtn.classList.add('cdp-day--today');

        if (isFuture) {
          dayBtn.classList.add('cdp-day--disabled');
          dayBtn.disabled = true;
          dayBtn.setAttribute('aria-disabled', 'true');
        }

        if (selectedDate
          && d === selectedDate.getDate()
          && viewMonth === selectedDate.getMonth()
          && viewYear === selectedDate.getFullYear()) {
          dayBtn.classList.add('cdp-day--selected');
        }

        dayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedDate = new Date(viewYear, viewMonth, d);
          hiddenInput.value = toISO(selectedDate);
          displayText.textContent = formatDisplay(selectedDate);
          displayText.classList.remove('cdp-placeholder');
          displayInput.classList.remove('cdp-display--invalid');

          /* Trigger change for validation */
          hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
          clearFieldError(hiddenInput, errorEl);

          /* Close */
          popup.hidden = true;
          isOpen = false;
          displayInput.classList.remove('cdp-display--open');
        });

        grid.appendChild(dayBtn);
      }

      popup.appendChild(grid);

      /* Footer: Today / Clear */
      const footer = document.createElement('div');
      footer.className = 'cdp-footer';

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'cdp-foot-btn';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = null;
        hiddenInput.value = '';
        displayText.textContent = 'dd/mm/yyyy';
        displayText.classList.add('cdp-placeholder');
        popup.hidden = true;
        isOpen = false;
        displayInput.classList.remove('cdp-display--open');
      });

      const todayBtn = document.createElement('button');
      todayBtn.type = 'button';
      todayBtn.className = 'cdp-foot-btn cdp-foot-btn--today';
      todayBtn.textContent = 'Today';
      todayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        viewYear = selectedDate.getFullYear();
        viewMonth = selectedDate.getMonth();
        hiddenInput.value = toISO(selectedDate);
        displayText.textContent = formatDisplay(selectedDate);
        displayText.classList.remove('cdp-placeholder');
        clearFieldError(hiddenInput, errorEl);
        popup.hidden = true;
        isOpen = false;
        displayInput.classList.remove('cdp-display--open');
      });

      footer.appendChild(clearBtn);
      footer.appendChild(todayBtn);
      popup.appendChild(footer);
    };

    const openPicker = () => {
      isOpen = true;
      renderCalendar();
      popup.hidden = false;
      displayInput.classList.add('cdp-display--open');
      displayInput.setAttribute('aria-expanded', 'true');
    };

    const closePicker = () => {
      isOpen = false;
      popup.hidden = true;
      displayInput.classList.remove('cdp-display--open');
      displayInput.setAttribute('aria-expanded', 'false');
    };

    displayInput.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen) closePicker(); else openPicker();
    });

    displayInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen) closePicker(); else openPicker(); }
      if (e.key === 'Escape') closePicker();
    });

    popup.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', (e) => {
      if (!pickerWrap.contains(e.target) && isOpen) closePicker();
    });

    pickerWrap.appendChild(displayInput);
    pickerWrap.appendChild(popup);

    return { pickerWrap, hiddenInput };
  };

  const createStackField = (labelText, fieldInfo, errorEl) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-date-field';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.setAttribute('for', fieldInfo.id || fieldInfo.name);

    const controlWrap = document.createElement('div');
    controlWrap.className = 'form-control-wrap';
    controlWrap.appendChild(fieldInfo.displayEl || fieldInfo);
    if (fieldInfo.hiddenInput) controlWrap.appendChild(fieldInfo.hiddenInput);
    controlWrap.appendChild(errorEl);

    wrapper.appendChild(label);
    wrapper.appendChild(controlWrap);

    return wrapper;
  };

  const createDateRangeRow = (fromField, toField) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row form-row-dates';
    wrapper.appendChild(createStackField(fromField.label, fromField.fieldInfo, fromField.errorEl));
    wrapper.appendChild(createStackField(toField.label, toField.fieldInfo, toField.errorEl));
    return wrapper;
  };

  const registerField = ({ label, field, errorEl, kind, options = [] }) => {
    state.fields.push({
      label,
      field,
      errorEl,
      kind,
      options,
    });

    field.addEventListener('input', () => {
      clearFieldError(field, errorEl);
    });

    field.addEventListener('change', () => {
      clearFieldError(field, errorEl);
    });
  };

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

  const validateAll = () => {
    const errors = [];
    state.fields.forEach((item) => {
      /* Skip disabled fields (e.g. when PTO mode is active) */
      if (item.field.disabled) return;
      const message = validateField(item);
      if (message) errors.push({ ...item, message });
    });
    return errors;
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
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', `${name}-menu`);

    const menu = document.createElement('div');
    menu.className = 'searchable-select-menu';
    menu.id = `${name}-menu`;
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
        if (selectedViaMenu) return;

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

  /**
   * createHierarchicalAcceleratorSelect
   * Builds a rich hierarchical multi-select with search, collapsible groups,
   * checkboxes, chips, and Adobe red theming.
   * @param {string} labelText  - field label
   * @param {string} name       - input name / id
   * @param {Element} contentEl - the authored DOM element containing <p> + <ul>s
   */
  const createHierarchicalAcceleratorSelect = ({ labelText, name, contentEl: domEl }) => {
    /* ── 1. Parse authored DOM into tree ────────────────────────── */
    const parseList = (ul) => {
      if (!ul) return [];
      return [...ul.children].map((li) => {
        const headingEl = li.querySelector(':scope > p');
        const lbl = headingEl
          ? headingEl.textContent.trim()
          : (li.firstChild?.nodeType === 3 ? li.firstChild.textContent.trim() : null)
            || li.textContent.trim();
        const nestedUl = li.querySelector(':scope > ul');
        const children = nestedUl ? parseList(nestedUl) : [];
        return { label: lbl, children, isLeaf: children.length === 0 };
      });
    };

    const topLevelP = domEl?.querySelector(':scope > p');
    const sectionLabel = topLevelP?.textContent.trim() || 'Accelerators';
    const allUls = domEl ? [...domEl.querySelectorAll(':scope > ul')] : [];
    const flatUl = allUls[0];
    const groupedUl = allUls[1];

    const flatItems = flatUl
      ? [...flatUl.children].map((li) => ({
          label: li.textContent.trim(),
          children: [],
          isLeaf: true,
        }))
      : [];

    const groupedItems = parseList(groupedUl);
    const tree = [
      { label: sectionLabel, children: flatItems, isLeaf: false },
      ...groupedItems,
    ];

    /* Collect every leaf label */
    const allLeaves = [];
    const collectLeaves = (nodes) => {
      nodes.forEach((n) => {
        if (n.isLeaf) allLeaves.push(n.label);
        else collectLeaves(n.children);
      });
    };
    collectLeaves(tree);

    /* ── 2. State ────────────────────────────────────────────────── */
    let auSelected = new Set();
    let expandedGroups = new Set([sectionLabel]); // first group open by default
    let auSearchQuery = '';
    let auDropdownOpen = false;

    /* ── 3. DOM scaffold ─────────────────────────────────────────── */
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row form-row-au';

    const formLabel = document.createElement('label');
    formLabel.textContent = labelText;
    formLabel.setAttribute('for', `${name}-search`);

    /* Shell */
    const shell = document.createElement('div');
    shell.className = 'au-shell';

    /* Header */
    const auHeader = document.createElement('div');
    auHeader.className = 'au-header';

    const auTitleGroup = document.createElement('div');
    auTitleGroup.className = 'au-title-group';
    const auSubtitle = document.createElement('div');
    auSubtitle.className = 'au-subtitle';
    auSubtitle.textContent = 'Select one or more';
    auTitleGroup.appendChild(auSubtitle);

    const auClearAll = document.createElement('button');
    auClearAll.type = 'button';
    auClearAll.className = 'au-clear-all';
    auClearAll.textContent = 'Clear all';
    auClearAll.style.display = 'none';

    auHeader.appendChild(auTitleGroup);
    auHeader.appendChild(auClearAll);

    /* Selected chips area — sits ABOVE the search bar, outside the panel */
    const auChipsArea = document.createElement('div');
    auChipsArea.className = 'au-chips-area';
    auChipsArea.hidden = true;

    /* Search bar */
    const auSearchWrap = document.createElement('div');
    auSearchWrap.className = 'au-search-wrap';

    const auSearchIcon = document.createElement('span');
    auSearchIcon.className = 'au-search-icon';
    auSearchIcon.setAttribute('aria-hidden', 'true');
    auSearchIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

    const auSearchInput = document.createElement('input');
    auSearchInput.type = 'text';
    auSearchInput.id = `${name}-search`;
    auSearchInput.className = 'au-search-input';
    auSearchInput.placeholder = 'Search or select accelerators';
    auSearchInput.setAttribute('aria-label', 'Search accelerators');
    auSearchInput.autocomplete = 'off';

    const auChevronBtn = document.createElement('button');
    auChevronBtn.type = 'button';
    auChevronBtn.className = 'au-chevron-btn';
    auChevronBtn.setAttribute('aria-label', 'Toggle dropdown');
    auChevronBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    auSearchWrap.appendChild(auSearchIcon);
    auSearchWrap.appendChild(auSearchInput);
    auSearchWrap.appendChild(auChevronBtn);

    /* Dropdown panel */
    const auPanel = document.createElement('div');
    auPanel.className = 'au-panel';
    auPanel.hidden = true;

    /* Custom input row */
    const auCustomWrap = document.createElement('div');
    auCustomWrap.className = 'au-custom-wrap';
    const auCustomInput = document.createElement('input');
    auCustomInput.type = 'text';
    auCustomInput.className = 'au-custom-input';
    auCustomInput.placeholder = 'Enter custom accelerator';
    const auCustomAddBtn = document.createElement('button');
    auCustomAddBtn.type = 'button';
    auCustomAddBtn.className = 'au-custom-add';
    auCustomAddBtn.textContent = 'Add';
    auCustomWrap.appendChild(auCustomInput);
    auCustomWrap.appendChild(auCustomAddBtn);

    /* Hidden input for form submission */
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = name;
    hiddenInput.id = name;

    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.hidden = true;

    /* ── 4. Render helpers ───────────────────────────────────────── */
    const syncHidden = () => {
      hiddenInput.value = [...auSelected].join(', ');
      auClearAll.style.display = auSelected.size ? '' : 'none';
      if (auSelected.size) clearFieldError(hiddenInput, errorEl);
    };

    const renderChips = () => {
      auChipsArea.replaceChildren();
      if (!auSelected.size) { auChipsArea.hidden = true; return; }
      auChipsArea.hidden = false;

      /* "Selected items" heading */
      const chipsLabel = document.createElement('div');
      chipsLabel.className = 'au-chips-label';
      chipsLabel.textContent = 'Selected items';
      auChipsArea.appendChild(chipsLabel);

      const chipsRow = document.createElement('div');
      chipsRow.className = 'au-chips-row';
      auChipsArea.appendChild(chipsRow);

      [...auSelected].forEach((val) => {
        const chip = document.createElement('span');
        chip.className = 'au-chip';

        const chkMark = document.createElement('span');
        chkMark.className = 'au-chip-check';
        chkMark.innerHTML = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>';

        const chipText = document.createElement('span');
        chipText.className = 'au-chip-text';
        chipText.textContent = val;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'au-chip-remove';
        removeBtn.setAttribute('aria-label', `Remove ${val}`);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('mousedown', (e) => e.preventDefault());
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          auSelected.delete(val);
          renderAll(); // eslint-disable-line no-use-before-define
        });

        chip.appendChild(chkMark);
        chip.appendChild(chipText);
        chip.appendChild(removeBtn);
        chipsRow.appendChild(chip);
      });
    };

    const nodeMatchesQuery = (node, q) => {
      if (!q) return true;
      if (node.label.toLowerCase().includes(q)) return true;
      return node.children.some((c) => nodeMatchesQuery(c, q));
    };

    const buildLeafRow = (lbl, depth) => {
      const row = document.createElement('label');
      row.className = `au-item au-item--leaf au-item--depth-${depth}`;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'au-checkbox';
      cb.value = lbl;
      cb.checked = auSelected.has(lbl);
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        if (cb.checked) auSelected.add(lbl);
        else auSelected.delete(lbl);
        renderAll(); // eslint-disable-line no-use-before-define
      });
      row.addEventListener('click', (e) => e.stopPropagation());

      const cbCustom = document.createElement('span');
      cbCustom.className = 'au-checkbox-custom';

      const txt = document.createElement('span');
      txt.className = 'au-item-label';
      txt.textContent = lbl;

      row.appendChild(cb);
      row.appendChild(cbCustom);
      row.appendChild(txt);
      return row;
    };

    const getGroupState = (node) => {
      const leaves = [];
      const collect = (n) => { if (n.isLeaf) leaves.push(n.label); else n.children.forEach(collect); };
      collect(node);
      if (!leaves.length) return { checked: false, indeterminate: false };
      const cnt = leaves.filter((l) => auSelected.has(l)).length;
      return { checked: cnt === leaves.length, indeterminate: cnt > 0 && cnt < leaves.length };
    };

    const toggleGroupLeaves = (node, val) => {
      const setLeaf = (n) => {
        if (n.isLeaf) { if (val) auSelected.add(n.label); else auSelected.delete(n.label); }
        else n.children.forEach(setLeaf);
      };
      setLeaf(node);
    };

    const buildGroupSection = (node, depth, parentEl) => {
      const q = auSearchQuery.toLowerCase();
      if (!nodeMatchesQuery(node, q)) return;

      const isExpanded = expandedGroups.has(node.label) || !!(q && nodeMatchesQuery(node, q));
      const { checked, indeterminate } = getGroupState(node);

      const groupRow = document.createElement('div');
      groupRow.className = `au-group-row au-item--depth-${depth}`;
      if (isExpanded) groupRow.classList.add('au-group-row--open');

      const chevron = document.createElement('span');
      chevron.className = 'au-group-chevron';
      chevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

      const groupLbl = document.createElement('span');
      groupLbl.className = 'au-group-label';
      groupLbl.textContent = node.label;

      groupRow.appendChild(chevron);

      /* Only add group checkbox when all direct children are leaves */
      if (node.children.length && node.children.every((c) => c.isLeaf)) {
        const groupCb = document.createElement('input');
        groupCb.type = 'checkbox';
        groupCb.className = 'au-checkbox au-group-cb';
        groupCb.checked = checked;
        groupCb.indeterminate = indeterminate;
        const groupCbCustom = document.createElement('span');
        groupCbCustom.className = 'au-checkbox-custom';
        const groupCbWrap = document.createElement('label');
        groupCbWrap.className = 'au-group-cb-wrap';
        groupCbWrap.appendChild(groupCb);
        groupCbWrap.appendChild(groupCbCustom);
        groupCb.addEventListener('change', (e) => {
          e.stopPropagation();
          toggleGroupLeaves(node, groupCb.checked);
          renderAll(); // eslint-disable-line no-use-before-define
        });
        groupCbWrap.addEventListener('click', (e) => e.stopPropagation());
        groupRow.appendChild(groupCbWrap);
      }

      groupRow.appendChild(groupLbl);

      const toggleExpand = (e) => {
        e.stopPropagation();
        if (expandedGroups.has(node.label)) expandedGroups.delete(node.label);
        else expandedGroups.add(node.label);
        renderAll(); // eslint-disable-line no-use-before-define
      };
      chevron.addEventListener('click', toggleExpand);
      groupLbl.addEventListener('click', toggleExpand);
      groupRow.addEventListener('click', (e) => e.stopPropagation());
      parentEl.appendChild(groupRow);

      if (isExpanded) {
        const childrenEl = document.createElement('div');
        childrenEl.className = `au-group-children au-group-children--depth-${depth}`;

        const allAreGroups = node.children.every((c) => !c.isLeaf);
        if (node.children.length >= 2 && allAreGroups) {
          childrenEl.classList.add('au-group-children--columns');
          node.children.forEach((child) => {
            if (!nodeMatchesQuery(child, q)) return;
            const col = document.createElement('div');
            col.className = 'au-col';
            buildGroupSection(child, depth + 1, col);
            childrenEl.appendChild(col);
          });
        } else {
          node.children.forEach((child) => {
            if (child.isLeaf) {
              if (!q || child.label.toLowerCase().includes(q)) {
                childrenEl.appendChild(buildLeafRow(child.label, depth + 1));
              }
            } else {
              buildGroupSection(child, depth + 1, childrenEl);
            }
          });
        }
        parentEl.appendChild(childrenEl);
      }
    };

    /** Collect all non-leaf group labels in the tree */
    const allGroupLabels = [];
    const collectGroupLabels = (nodes) => {
      nodes.forEach((n) => {
        if (!n.isLeaf) {
          allGroupLabels.push(n.label);
          collectGroupLabels(n.children);
        }
      });
    };
    collectGroupLabels(tree);

    const areAllGroupsExpanded = () =>
      allGroupLabels.length > 0 && allGroupLabels.every((l) => expandedGroups.has(l));

    const expandAll = () => allGroupLabels.forEach((l) => expandedGroups.add(l));

    const collapseAll = () => expandedGroups.clear();

    const renderPanel = () => {
      auPanel.replaceChildren();
      const q = auSearchQuery.toLowerCase();

      if (q) {
        const filtered = allLeaves.filter((l) => l.toLowerCase().includes(q));
        if (!filtered.length) {
          const empty = document.createElement('div');
          empty.className = 'au-empty';
          empty.textContent = 'No matching accelerators found.';
          auPanel.appendChild(empty);
        } else {
          const list = document.createElement('div');
          list.className = 'au-flat-list';
          filtered.forEach((lbl) => list.appendChild(buildLeafRow(lbl, 1)));
          auPanel.appendChild(list);
        }
      } else {
        /* Expand All / Collapse All toolbar */
        const panelToolbar = document.createElement('div');
        panelToolbar.className = 'au-panel-toolbar';

        const expandAllBtn = document.createElement('button');
        expandAllBtn.type = 'button';
        expandAllBtn.className = 'au-expand-all-btn';
        expandAllBtn.textContent = areAllGroupsExpanded() ? 'Collapse All' : 'Expand All';
        expandAllBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (areAllGroupsExpanded()) collapseAll();
          else expandAll();
          renderAll(); // eslint-disable-line no-use-before-define
        });
        panelToolbar.appendChild(expandAllBtn);
        auPanel.appendChild(panelToolbar);

        const treeEl = document.createElement('div');
        treeEl.className = 'au-tree';
        tree.forEach((topNode) => {
          /* Skip "Any Other" empty groups — rendered separately as a label */
          const isAnyOther = topNode.label.toLowerCase().includes('any other')
            || (topNode.label.toLowerCase().includes('other') && topNode.children.length === 0);
          if (isAnyOther) return;

          const section = document.createElement('div');
          section.className = 'au-section';
          buildGroupSection(topNode, 0, section);
          treeEl.appendChild(section);
        });
        auPanel.appendChild(treeEl);
      }

      const hasAnyOther = tree.some(
        (n) => n.label.toLowerCase().includes('any other')
          || (n.label.toLowerCase().includes('other') && n.children.length === 0),
      );
      if (hasAnyOther) {
        const anyOtherSection = document.createElement('div');
        anyOtherSection.className = 'au-any-other-section';

        const anyOtherLabel = document.createElement('div');
        anyOtherLabel.className = 'au-any-other-label';
        anyOtherLabel.textContent = 'Any Other';
        anyOtherSection.appendChild(anyOtherLabel);

        anyOtherSection.appendChild(auCustomWrap);
        auPanel.appendChild(anyOtherSection);
      }
    };

    const renderAll = () => {
      syncHidden();
      renderChips();
      renderPanel();
    };

    /* ── 5. Open / Close ────────────────────────────────────────── */
    const openDropdown = () => {
      auDropdownOpen = true;
      auPanel.hidden = false;
      auChevronBtn.classList.add('au-chevron-btn--open');
      auSearchWrap.classList.add('au-search-wrap--open');
    };

    const closeDropdown = () => {
      auDropdownOpen = false;
      auPanel.hidden = true;
      auChevronBtn.classList.remove('au-chevron-btn--open');
      auSearchWrap.classList.remove('au-search-wrap--open');
      if (!auSelected.size) {
        setFieldError(hiddenInput, errorEl, `${labelText} is required.`);
      } else {
        clearFieldError(hiddenInput, errorEl);
      }
    };

    auSearchInput.addEventListener('focus', () => { if (!auDropdownOpen) openDropdown(); });
    auSearchInput.addEventListener('input', () => {
      auSearchQuery = auSearchInput.value;
      clearFieldError(hiddenInput, errorEl);
      renderAll();
      if (!auDropdownOpen) openDropdown();
    });

    auChevronBtn.addEventListener('click', () => {
      if (auDropdownOpen) closeDropdown();
      else openDropdown();
    });

    document.addEventListener('click', (e) => {
      if (!shell.contains(e.target)) {
        if (auDropdownOpen) closeDropdown();
      }
    });

    auClearAll.addEventListener('click', () => {
      auSelected.clear();
      auSearchInput.value = '';
      auSearchQuery = '';
      renderAll();
    });

    /* ── 6. Custom accelerator ──────────────────────────────────── */
    const addCustom = () => {
      const val = auCustomInput.value.trim();
      if (!val) return;
      auSelected.add(val);
      auCustomInput.value = '';
      renderAll();
    };
    auCustomAddBtn.addEventListener('click', addCustom);
    auCustomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
    });

    /* Stop clicks inside the chips area from bubbling to document (which would close dropdown) */
    auChipsArea.addEventListener('click', (e) => e.stopPropagation());

    /* ── 7. Assemble ────────────────────────────────────────────── */
    shell.appendChild(auHeader);
    shell.appendChild(auChipsArea);
    shell.appendChild(auSearchWrap);
    shell.appendChild(auPanel);

    wrapper.appendChild(formLabel);
    wrapper.appendChild(shell);
    wrapper.appendChild(hiddenInput);
    wrapper.appendChild(errorEl);

    registerField({
      label: labelText,
      field: hiddenInput,
      errorEl,
      kind: 'multiselect',
    });

    renderAll();
    return wrapper;
  };

  const renderSuccessView = (data) => {
    const success = document.createElement('div');
    success.className = 'form-success';

    /* ── Hero banner ── */
    const banner = document.createElement('div');
    banner.className = 'form-success-banner';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'form-success-icon';
    iconWrap.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    const bannerText = document.createElement('div');
    bannerText.className = 'form-success-banner-text';

    const title = document.createElement('h2');
    title.textContent = 'Weekly report captured successfully';

    const project = data.project || 'your project';
    const hours = data['hours-saved'] || '0';
    const summary = document.createElement('p');
    summary.textContent = `Your weekly report for ${project} was captured and logged ${hours} hours saved.`;

    bannerText.appendChild(title);
    bannerText.appendChild(summary);
    banner.appendChild(iconWrap);
    banner.appendChild(bannerText);

    /* ── Detail grid ── */
    const details = document.createElement('div');
    details.className = 'form-success-details';

    const items = [
      ['Email', data['email-address'], 'person'],
      ['Project', data.project, 'folder'],
      ['From Date', data['from-date'], 'calendar'],
      ['To Date', data['to-date'], 'calendar'],
      ['Hours Saved', data['hours-saved'], 'clock'],
      ['Accelerator Used', data['accelerator-used'], 'bolt'],
    ];

    const icons = {
      person: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      id: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L2 7"/></svg>',
      folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      bolt: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    };

    items.forEach(([label, value, iconKey]) => {
      const row = document.createElement('div');
      row.className = 'form-success-row';

      const keyWrap = document.createElement('div');
      keyWrap.className = 'form-success-key';

      const iconEl = document.createElement('span');
      iconEl.className = 'form-success-key-icon';
      iconEl.innerHTML = icons[iconKey] || '';

      const keyLabel = document.createElement('span');
      keyLabel.textContent = label;

      keyWrap.appendChild(iconEl);
      keyWrap.appendChild(keyLabel);

      const val = document.createElement('span');
      val.className = 'form-success-value';
      val.textContent = value || '-';

      row.appendChild(keyWrap);
      row.appendChild(val);
      details.appendChild(row);
    });

    /* ── Footer action ── */
    const addAnotherWrap = document.createElement('div');
    addAnotherWrap.className = 'form-success-add-another';

    const addAnotherBtn = document.createElement('button');
    addAnotherBtn.type = 'button';
    addAnotherBtn.className = 'form-success-add-another-btn';
    addAnotherBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Another Project';
    addAnotherBtn.addEventListener('click', () => {
      window.location.reload();
    });

    addAnotherWrap.appendChild(addAnotherBtn);

    success.appendChild(banner);
    success.appendChild(details);
    success.appendChild(addAnotherWrap);

    return success;
  };

  const showConfirmationDialog = (onProceed) => {
    const overlay = document.createElement('div');
    overlay.className = 'form-confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-describedby', 'form-confirm-desc');

    const dialog = document.createElement('div');
    dialog.className = 'form-confirm-dialog';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'form-confirm-icon';
    iconWrap.innerHTML = '<svg width="36" height="36" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="40" height="44" rx="4" ry="4" stroke="currentColor" stroke-width="2.5" fill="none"/><rect x="16" y="4" width="16" height="8" rx="3" ry="3" stroke="currentColor" stroke-width="2.5" fill="none"/><circle cx="24" cy="26" r="9" stroke="currentColor" stroke-width="2.5" fill="none"/><line x1="24" y1="21" x2="24" y2="26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="26" x2="28" y2="29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><polyline points="10,43 14,47 22,39" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="28" y1="43" x2="38" y2="43" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="47" x2="34" y2="47" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    const message = document.createElement('p');
    message.id = 'form-confirm-desc';
    message.className = 'form-confirm-message';
    message.textContent = 'Please review your information before submitting.';

    const btnRow = document.createElement('div');
    btnRow.className = 'form-confirm-buttons';

    const proceedBtn = document.createElement('button');
    proceedBtn.type = 'button';
    proceedBtn.className = 'form-confirm-btn form-confirm-btn--proceed';
    proceedBtn.textContent = 'Proceed';
    proceedBtn.addEventListener('click', () => {
      overlay.remove();
      onProceed();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'form-confirm-btn form-confirm-btn--cancel';
    cancelBtn.textContent = 'Cancel. I want to review';
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    btnRow.appendChild(proceedBtn);
    btnRow.appendChild(cancelBtn);
    dialog.appendChild(iconWrap);
    dialog.appendChild(message);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    proceedBtn.focus();
  };

  const doSubmit = () => {
    const data = Object.fromEntries(new FormData(form).entries());

    const isPto = typeof ptoCheckbox !== 'undefined' && ptoCheckbox.checked;

    const payload = {
      accelaratorsUsed: isPto ? '' : (data['accelerator-used'] || ''),
      emailAddress: data['email-address'] || '',
      fromDate: data['from-date'] || '',
      hoursSaved: isPto ? 0 : Number(data['hours-saved'] || 0),
      ldap: isPto ? '' : (data['ldap'] || ''),
      projectName: isPto ? '' : (data['project'] || ''),
      toDate: data['to-date'] || '',
      pto: isPto,
      weekNumber: week,
      weekRange,
      weekYear: year,
      event: 'card.submitted',
    };

    window.adobeDataLayer = window.adobeDataLayer || [];
    window.adobeDataLayer.push(payload);

    // eslint-disable-next-line no-console
    console.log('✅ adobeDataLayer push:', payload);

    block.replaceChildren(renderSuccessView(data));
  };

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

    showConfirmationDialog(doSubmit);
  };

  /* ── Week indicator banner ──────────────────────────────────── */
  const getISOWeek = (d) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayOfWeek = date.getUTCDay() || 7; // ISO: Mon=1 … Sun=7
    date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek); // nearest Thursday
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return { week: weekNo, year: date.getUTCFullYear() };
  };

  const getWeekRange = (d) => {
    const date = new Date(d);
    const day = date.getDay() || 7; // Mon=1
    const mon = new Date(date);
    mon.setDate(date.getDate() - (day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(mon)} – ${fmt(sun)}`;
  };

  const now = new Date();
  const { week, year } = getISOWeek(now);
  const weekRange = getWeekRange(now);

  /* Week banner is intentionally not rendered in the UI —
     weekNumber / weekRange are sent silently in the datalayer payload. */

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueEl = row.children[1];
    const valueText = valueEl?.textContent.trim() || '';

    if (!labelText) return;

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

    if (labelText === 'Project' || labelText === 'LDAP') {
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
      const dateId = normalizeName(labelText);
      const { pickerWrap, hiddenInput: dateHidden } = createCustomDatePicker({
        id: dateId,
        name: dateId,
        errorEl,
      });

      /* Register the hidden input for validation */
      registerField({
        label: labelText,
        field: dateHidden,
        errorEl,
        kind: 'date',
      });

      const fieldInfo = { id: dateId, displayEl: pickerWrap, hiddenInput: dateHidden };

      if (labelText === 'From Date') {
        pendingDateField = { label: labelText, fieldInfo, errorEl };
        return;
      }

      if (pendingDateField) {
        form.appendChild(createDateRangeRow(pendingDateField, { label: labelText, fieldInfo, errorEl }));
        pendingDateField = null;
      } else {
        const singleWrap = document.createElement('div');
        singleWrap.className = 'form-row';
        const lbl = document.createElement('label');
        lbl.textContent = labelText;
        lbl.setAttribute('for', dateId);
        const ctrl = document.createElement('div');
        ctrl.className = 'form-control-wrap';
        ctrl.appendChild(pickerWrap);
        ctrl.appendChild(dateHidden);
        ctrl.appendChild(errorEl);
        singleWrap.appendChild(lbl);
        singleWrap.appendChild(ctrl);
        form.appendChild(singleWrap);
      }
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

      pendingHoursRow = createRow(labelText, field, errorEl);
      if (pendingEmailRow) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-row form-row-pair';
        wrapper.appendChild(pendingEmailRow);
        wrapper.appendChild(pendingHoursRow);
        form.appendChild(wrapper);
        pendingEmailRow = null;
        pendingHoursRow = null;
      }
      return;
    }

    if (labelText === 'Accelerator Used') {
      form.appendChild(
        createHierarchicalAcceleratorSelect({
          labelText,
          name: 'accelerator-used',
          contentEl: valueEl,
        }),
      );
      return;
    }

    if (labelText === 'Email') {
      const emails = normalizeList(valueText);

      pendingEmailRow = createSearchableEmailSelect({
        labelText,
        name: 'email-address',
        options: emails,
      });
      if (pendingHoursRow) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-row form-row-pair';
        wrapper.appendChild(pendingEmailRow);
        wrapper.appendChild(pendingHoursRow);
        form.appendChild(wrapper);
        pendingEmailRow = null;
        pendingHoursRow = null;
      }
      return;
    }
  });

  if (pendingDateField) {
    const singleWrap = document.createElement('div');
    singleWrap.className = 'form-row';
    const lbl = document.createElement('label');
    lbl.textContent = pendingDateField.label;
    const fi = pendingDateField.fieldInfo;
    lbl.setAttribute('for', fi.id);
    const ctrl = document.createElement('div');
    ctrl.className = 'form-control-wrap';
    ctrl.appendChild(fi.displayEl);
    ctrl.appendChild(fi.hiddenInput);
    ctrl.appendChild(pendingDateField.errorEl);
    singleWrap.appendChild(lbl);
    singleWrap.appendChild(ctrl);
    form.appendChild(singleWrap);
    pendingDateField = null;
  }

  if (pendingEmailRow) {
    form.appendChild(pendingEmailRow);
    pendingEmailRow = null;
  }

  if (pendingHoursRow) {
    form.appendChild(pendingHoursRow);
    pendingHoursRow = null;
  }

  /* ── PTO checkbox ─────────────────────────────────────────── */
  const ptoWrap = document.createElement('label');
  ptoWrap.className = 'form-pto-label';

  const ptoCheckbox = document.createElement('input');
  ptoCheckbox.type = 'checkbox';
  ptoCheckbox.className = 'form-pto-checkbox';
  ptoCheckbox.id = 'pto-full-week';

  const ptoCustomBox = document.createElement('span');
  ptoCustomBox.className = 'form-pto-box';
  ptoCustomBox.setAttribute('aria-hidden', 'true');

  const ptoText = document.createElement('span');
  ptoText.className = 'form-pto-text';
  ptoText.textContent = 'Check this box to apply PTO for the full week';

  ptoWrap.setAttribute('for', 'pto-full-week');
  ptoWrap.appendChild(ptoCheckbox);
  ptoWrap.appendChild(ptoCustomBox);
  ptoWrap.appendChild(ptoText);

  /* Fields that stay enabled even when PTO mode is active */
  const ptoEnabledKinds = ['date', 'email'];

  const applyPtoMode = (active) => {
    state.fields.forEach((item) => {
      const isDate = ptoEnabledKinds.includes(item.kind);
      if (active && !isDate) {
        /* Disable non-date fields */
        item.field.disabled = true;
        item.field.closest('.form-row, .form-row-pair, .form-row-au, .form-row-searchable')
          ?.classList.toggle('form-row--pto-disabled', true);
      } else {
        item.field.disabled = false;
        item.field.closest('.form-row, .form-row-pair, .form-row-au, .form-row-searchable')
          ?.classList.toggle('form-row--pto-disabled', false);
      }
    });

    /* Also visually disable the cdp-display buttons for non-date pickers
       (there are none, but guard for future fields) */
    form.querySelectorAll('.cdp-display').forEach((el) => {
      /* from-date and to-date pickers should remain enabled */
      const wrap = el.closest('.form-date-field');
      const lbl = wrap?.querySelector('label')?.textContent?.trim() || '';
      const isDateField = lbl === 'From Date' || lbl === 'To Date';
      if (!isDateField) {
        el.style.pointerEvents = active ? 'none' : '';
        el.style.opacity = active ? '0.4' : '';
      }
    });
  };

  ptoCheckbox.addEventListener('change', () => {
    applyPtoMode(ptoCheckbox.checked);
  });

  const ptoRowWrap = document.createElement('div');
  ptoRowWrap.className = 'form-row form-pto-row';
  ptoRowWrap.appendChild(ptoWrap);

  if (state.submitButton) {
    const submitWrap = document.createElement('div');
    submitWrap.className = 'form-row form-row-submit';
    submitWrap.appendChild(state.submitButton);
    form.appendChild(ptoRowWrap);
    form.appendChild(submitWrap);
  } else {
    form.appendChild(ptoRowWrap);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  block.replaceChildren(form);
}
