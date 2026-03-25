/**
 * Accelerator Used Block
 * Renders a rich hierarchical multi-select with search, collapsible groups,
 * checkboxes, chips, and Adobe red theming.
 */

export default function decorate(block) {
  /* ─── 1. Parse the authored DOM into a tree ─────────────────────── */
  const titleEl = block.children[0]?.children[0];
  const contentEl = block.children[0]?.children[1];

  const blockTitle = titleEl?.textContent.trim() || 'Accelerators Used';

  /**
   * Recursively converts a <ul> into an array of node objects:
   *  { label, children[], isLeaf }
   */
  const parseList = (ul) => {
    if (!ul) return [];
    return [...ul.children].map((li) => {
      // A <p> inside <li> acts as the group heading
      const headingEl = li.querySelector(':scope > p');
      const label = headingEl
        ? headingEl.textContent.trim()
        : li.firstChild?.textContent.trim() || li.textContent.trim();

      // Nested <ul> inside the <li>
      const nestedUl = li.querySelector(':scope > ul');
      const children = nestedUl ? parseList(nestedUl) : [];

      return { label, children, isLeaf: children.length === 0 };
    });
  };

  // The content area holds:
  //   1st <p>  → top-level section heading (e.g. "Accelerators")
  //   1st <ul> → flat leaf items under that heading
  //   2nd <ul> → nested groups (Tools & Platforms, Built by Products, Any Other)
  const topLevelP = contentEl?.querySelector(':scope > p');
  const sectionLabel = topLevelP?.textContent.trim() || 'Accelerators';

  const allUls = contentEl ? [...contentEl.querySelectorAll(':scope > ul')] : [];
  const flatUl = allUls[0]; // flat accelerator items
  const groupedUl = allUls[1]; // nested groups

  const flatItems = flatUl
    ? [...flatUl.children].map((li) => ({
        label: li.textContent.trim(),
        children: [],
        isLeaf: true,
      }))
    : [];

  const groupedItems = parseList(groupedUl);

  // Full tree: first group = flat items (e.g. "Accelerators"), rest = groupedItems
  const tree = [
    { label: sectionLabel, children: flatItems, isLeaf: false },
    ...groupedItems,
  ];

  /* ─── 2. State ───────────────────────────────────────────────────── */
  let selected = new Set();
  let expandedGroups = new Set(); // stores group labels that are open
  let searchQuery = '';
  let dropdownOpen = false;

  /** Collect every leaf label in the tree */
  const allLeaves = [];
  const collectLeaves = (nodes) => {
    nodes.forEach((n) => {
      if (n.isLeaf) allLeaves.push(n.label);
      else collectLeaves(n.children);
    });
  };
  collectLeaves(tree);

  /* ─── 3. Build shell DOM ─────────────────────────────────────────── */
  const shell = document.createElement('div');
  shell.className = 'au-shell';

  // Header row
  const header = document.createElement('div');
  header.className = 'au-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'au-title-group';

  const titleH = document.createElement('h3');
  titleH.className = 'au-title';
  titleH.textContent = blockTitle;

  const subtitle = document.createElement('div');
  subtitle.className = 'au-subtitle';
  subtitle.textContent = 'Select one or more';

  titleGroup.appendChild(titleH);
  titleGroup.appendChild(subtitle);

  const clearAllBtn = document.createElement('button');
  clearAllBtn.type = 'button';
  clearAllBtn.className = 'au-clear-all';
  clearAllBtn.textContent = 'Clear all';

  header.appendChild(titleGroup);
  header.appendChild(clearAllBtn);

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'au-search-wrap';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'au-search-icon';
  searchIcon.setAttribute('aria-hidden', 'true');
  searchIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'au-search-input';
  searchInput.placeholder = `Search or select accelerators`;
  searchInput.setAttribute('aria-label', 'Search accelerators');
  searchInput.autocomplete = 'off';

  const dropdownChevron = document.createElement('button');
  dropdownChevron.type = 'button';
  dropdownChevron.className = 'au-chevron-btn';
  dropdownChevron.setAttribute('aria-label', 'Toggle dropdown');
  dropdownChevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInput);
  searchWrap.appendChild(dropdownChevron);

  // Dropdown panel
  const panel = document.createElement('div');
  panel.className = 'au-panel';
  panel.hidden = true;

  // Chips area (selected items shown at the bottom of panel)
  const chipsArea = document.createElement('div');
  chipsArea.className = 'au-chips-area';

  // Custom input for "Any Other"
  const customWrap = document.createElement('div');
  customWrap.className = 'au-custom-wrap';
  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'au-custom-input';
  customInput.placeholder = 'Enter custom accelerator';
  customInput.setAttribute('aria-label', 'Enter custom accelerator');
  const customAddBtn = document.createElement('button');
  customAddBtn.type = 'button';
  customAddBtn.className = 'au-custom-add';
  customAddBtn.textContent = 'Add';
  customWrap.appendChild(customInput);
  customWrap.appendChild(customAddBtn);

  // Hidden input for form submission
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = 'accelerator-used';
  hiddenInput.id = 'accelerator-used';

  /* ─── 4. Rendering helpers ───────────────────────────────────────── */
  const syncHidden = () => {
    hiddenInput.value = [...selected].join(', ');
  };

  const renderChips = () => {
    chipsArea.replaceChildren();
    if (!selected.size) {
      chipsArea.hidden = true;
      return;
    }
    chipsArea.hidden = false;
    [...selected].forEach((val) => {
      const chip = document.createElement('span');
      chip.className = 'au-chip';

      const checkmark = document.createElement('span');
      checkmark.className = 'au-chip-check';
      checkmark.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>`;

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
        selected.delete(val);
        renderAll();
      });

      chip.appendChild(checkmark);
      chip.appendChild(chipText);
      chip.appendChild(removeBtn);
      chipsArea.appendChild(chip);
    });
  };

  /** Returns true if a node (or any of its descendants) matches the query */
  const nodeMatchesQuery = (node, q) => {
    if (!q) return true;
    if (node.label.toLowerCase().includes(q)) return true;
    return node.children.some((c) => nodeMatchesQuery(c, q));
  };

  /** Build checkbox row for a leaf item */
  const buildLeafRow = (label, depth) => {
    const row = document.createElement('label');
    row.className = `au-item au-item--leaf au-item--depth-${depth}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'au-checkbox';
    cb.value = label;
    cb.checked = selected.has(label);
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(label);
      else selected.delete(label);
      renderAll();
    });

    const cbCustom = document.createElement('span');
    cbCustom.className = 'au-checkbox-custom';

    const text = document.createElement('span');
    text.className = 'au-item-label';
    text.textContent = label;

    row.appendChild(cb);
    row.appendChild(cbCustom);
    row.appendChild(text);
    return row;
  };

  /** Check if all leaves under a group are selected (for parent checkbox state) */
  const getGroupState = (node) => {
    const leaves = [];
    const collect = (n) => {
      if (n.isLeaf) leaves.push(n.label);
      else n.children.forEach(collect);
    };
    collect(node);
    if (!leaves.length) return { checked: false, indeterminate: false };
    const selectedCount = leaves.filter((l) => selected.has(l)).length;
    return {
      checked: selectedCount === leaves.length,
      indeterminate: selectedCount > 0 && selectedCount < leaves.length,
    };
  };

  /** Toggle all leaves under a group */
  const toggleGroup = (node, forceValue) => {
    const setLeaf = (n) => {
      if (n.isLeaf) {
        if (forceValue) selected.add(n.label);
        else selected.delete(n.label);
      } else {
        n.children.forEach(setLeaf);
      }
    };
    setLeaf(node);
  };

  /** Recursively build tree section */
  const buildGroupSection = (node, depth, parentEl) => {
    const q = searchQuery.toLowerCase();

    if (!nodeMatchesQuery(node, q)) return;

    const isExpanded = expandedGroups.has(node.label) || (q && nodeMatchesQuery(node, q));
    const { checked, indeterminate } = getGroupState(node);

    // Group header row
    const groupRow = document.createElement('div');
    groupRow.className = `au-group-row au-item--depth-${depth}`;
    if (isExpanded) groupRow.classList.add('au-group-row--open');

    // Toggle chevron
    const chevron = document.createElement('span');
    chevron.className = 'au-group-chevron';
    chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    // Group label (acts as collapse toggle)
    const groupLabel = document.createElement('span');
    groupLabel.className = 'au-group-label';
    groupLabel.textContent = node.label;

    // Group checkbox (selects / deselects all children)
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
      toggleGroup(node, groupCb.checked);
      renderAll();
    });

    groupRow.appendChild(chevron);
    groupRow.appendChild(groupLabel);

    // Only add group checkbox if this group has leaf children
    const hasLeaves = allLeaves.some((l) =>
      node.children.some((c) => (c.isLeaf ? c.label === l : false))
    );
    if (hasLeaves || node.children.every((c) => c.isLeaf)) {
      // insert checkbox before label
      groupRow.insertBefore(groupCbWrap, groupLabel);
    }

    // Chevron / collapse on click
    const toggleExpand = () => {
      if (expandedGroups.has(node.label)) expandedGroups.delete(node.label);
      else expandedGroups.add(node.label);
      renderAll();
    };

    chevron.addEventListener('click', toggleExpand);
    groupLabel.addEventListener('click', toggleExpand);

    parentEl.appendChild(groupRow);

    // Children container
    if (isExpanded) {
      const childrenEl = document.createElement('div');
      childrenEl.className = `au-group-children au-group-children--depth-${depth}`;

      // Check if children should be displayed in 2 columns
      const allChildrenAreGroups = node.children.every((c) => !c.isLeaf);
      const bigEnoughForColumns = node.children.length >= 2 && allChildrenAreGroups;

      if (bigEnoughForColumns) {
        childrenEl.classList.add('au-group-children--columns');
        node.children.forEach((child) => {
          if (!nodeMatchesQuery(child, q)) return;
          const colEl = document.createElement('div');
          colEl.className = 'au-col';
          buildGroupSection(child, depth + 1, colEl);
          childrenEl.appendChild(colEl);
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

  /** Check if all groups are currently expanded */
  const areAllGroupsExpanded = () => {
    const allGroupLabels = [];
    const collectGroups = (nodes) => {
      nodes.forEach((n) => {
        if (!n.isLeaf) {
          allGroupLabels.push(n.label);
          collectGroups(n.children);
        }
      });
    };
    collectGroups(tree);
    return allGroupLabels.length > 0 && allGroupLabels.every((l) => expandedGroups.has(l));
  };

  /** Expand all groups recursively */
  const expandAll = () => {
    const addAll = (nodes) => {
      nodes.forEach((n) => {
        if (!n.isLeaf) {
          expandedGroups.add(n.label);
          addAll(n.children);
        }
      });
    };
    addAll(tree);
  };

  /** Collapse all groups */
  const collapseAll = () => {
    expandedGroups.clear();
  };

  const renderPanel = () => {
    panel.replaceChildren();

    const q = searchQuery.toLowerCase();

    // If searching, show flat filtered results
    if (q) {
      const filtered = allLeaves.filter((l) => l.toLowerCase().includes(q));
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'au-empty';
        empty.textContent = 'No matching accelerators found.';
        panel.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.className = 'au-flat-list';
        filtered.forEach((label) => {
          list.appendChild(buildLeafRow(label, 1));
        });
        panel.appendChild(list);
      }
    } else {
      // Expand All / Collapse All toolbar
      const panelToolbar = document.createElement('div');
      panelToolbar.className = 'au-panel-toolbar';

      const expandAllBtn = document.createElement('button');
      expandAllBtn.type = 'button';
      expandAllBtn.className = 'au-expand-all-btn';
      const allExpanded = areAllGroupsExpanded();
      expandAllBtn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
      expandAllBtn.addEventListener('click', () => {
        if (areAllGroupsExpanded()) {
          collapseAll();
        } else {
          expandAll();
        }
        renderAll();
      });

      panelToolbar.appendChild(expandAllBtn);
      panel.appendChild(panelToolbar);

      // Show full tree
      const treeEl = document.createElement('div');
      treeEl.className = 'au-tree';

      tree.forEach((topNode) => {
        // Top-level section divider
        const section = document.createElement('div');
        section.className = 'au-section';

        buildGroupSection(topNode, 0, section);
        treeEl.appendChild(section);
      });

      panel.appendChild(treeEl);
    }

    // Chips + custom input at the bottom
    panel.appendChild(chipsArea);

    // Find if "Any Other" group exists in tree for custom input
    const hasAnyOther = tree.some(
      (n) => n.label.toLowerCase().includes('any other') || n.label.toLowerCase().includes('other'),
    );
    if (hasAnyOther) {
      panel.appendChild(customWrap);
    }
  };

  const renderAll = () => {
    syncHidden();
    renderChips();
    renderPanel();

    // Update "Clear all" visibility
    clearAllBtn.style.display = selected.size ? '' : 'none';
  };

  /* ─── 5. Open / Close panel ──────────────────────────────────────── */
  const openDropdown = () => {
    dropdownOpen = true;
    panel.hidden = false;
    dropdownChevron.classList.add('au-chevron-btn--open');
    searchWrap.classList.add('au-search-wrap--open');
  };

  const closeDropdown = () => {
    dropdownOpen = false;
    panel.hidden = true;
    dropdownChevron.classList.remove('au-chevron-btn--open');
    searchWrap.classList.remove('au-search-wrap--open');
  };

  searchInput.addEventListener('focus', () => {
    if (!dropdownOpen) openDropdown();
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderAll();
    if (!dropdownOpen) openDropdown();
  });

  dropdownChevron.addEventListener('click', () => {
    if (dropdownOpen) closeDropdown();
    else openDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!shell.contains(e.target)) closeDropdown();
  });

  clearAllBtn.addEventListener('click', () => {
    selected.clear();
    searchInput.value = '';
    searchQuery = '';
    renderAll();
  });

  /* ─── 6. Custom accelerator ──────────────────────────────────────── */
  const addCustom = () => {
    const val = customInput.value.trim();
    if (!val) return;
    selected.add(val);
    customInput.value = '';
    renderAll();
  };

  customAddBtn.addEventListener('click', addCustom);
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  });

  /* ─── 7. Initial expand state ────────────────────────────────────── */
  // Expand the first top-level group by default
  if (tree.length) expandedGroups.add(tree[0].label);

  /* ─── 8. Assemble & mount ────────────────────────────────────────── */
  clearAllBtn.style.display = 'none';

  shell.appendChild(header);
  shell.appendChild(searchWrap);
  shell.appendChild(panel);
  shell.appendChild(hiddenInput);

  block.replaceChildren(shell);

  // Initial render
  renderAll();
}
