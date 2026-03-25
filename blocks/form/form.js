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

  const createStackField = (labelText, field, errorEl) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-date-field';

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

  const createDateRangeRow = (fromField, toField) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row form-row-dates';
    wrapper.appendChild(createStackField(fromField.label, fromField.field, fromField.errorEl));
    wrapper.appendChild(createStackField(toField.label, toField.field, toField.errorEl));
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

    /* Chips area */
    const auChipsArea = document.createElement('div');
    auChipsArea.className = 'au-chips-area';
    auChipsArea.hidden = true;

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
        removeBtn.addEventListener('click', () => {
          auSelected.delete(val);
          renderAll(); // eslint-disable-line no-use-before-define
        });

        chip.appendChild(chkMark);
        chip.appendChild(chipText);
        chip.appendChild(removeBtn);
        auChipsArea.appendChild(chip);
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
      cb.addEventListener('change', () => {
        if (cb.checked) auSelected.add(lbl);
        else auSelected.delete(lbl);
        renderAll(); // eslint-disable-line no-use-before-define
      });

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
        groupRow.appendChild(groupCbWrap);
      }

      groupRow.appendChild(groupLbl);

      const toggleExpand = () => {
        if (expandedGroups.has(node.label)) expandedGroups.delete(node.label);
        else expandedGroups.add(node.label);
        renderAll(); // eslint-disable-line no-use-before-define
      };
      chevron.addEventListener('click', toggleExpand);
      groupLbl.addEventListener('click', toggleExpand);
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
        const treeEl = document.createElement('div');
        treeEl.className = 'au-tree';
        tree.forEach((topNode) => {
          const section = document.createElement('div');
          section.className = 'au-section';
          buildGroupSection(topNode, 0, section);
          treeEl.appendChild(section);
        });
        auPanel.appendChild(treeEl);
      }

      auPanel.appendChild(auChipsArea);

      const hasAnyOther = tree.some((n) => n.label.toLowerCase().includes('other'));
      if (hasAnyOther) auPanel.appendChild(auCustomWrap);
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

    /* ── 7. Assemble ────────────────────────────────────────────── */
    shell.appendChild(auHeader);
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

    const title = document.createElement('h2');
    title.textContent = 'Weekly report captured successfully';

    const summary = document.createElement('p');
    const project = data.project || 'your project';
    const hours = data['hours-saved'] || '0';
    summary.textContent = `Your weekly report for ${project} was captured and logged ${hours} hours saved.`;

    const details = document.createElement('div');
    details.className = 'form-success-details';

    const items = [
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

    // eslint-disable-next-line no-console
    console.log('✅ adobeDataLayer push:', payload);

    block.replaceChildren(renderSuccessView(data));
  };

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

      if (labelText === 'From Date') {
        pendingDateField = { label: labelText, field, errorEl };
        return;
      }

      if (pendingDateField) {
        form.appendChild(createDateRangeRow(pendingDateField, { label: labelText, field, errorEl }));
        pendingDateField = null;
      } else {
        form.appendChild(createRow(labelText, field, errorEl));
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
    form.appendChild(createRow(pendingDateField.label, pendingDateField.field, pendingDateField.errorEl));
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
