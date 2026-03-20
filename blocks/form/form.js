export default function decorate(block) {
  console.log('🔵 form.js loaded');

  const form = document.createElement('form');
  const rows = [...block.children];

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueText = row.children[1]?.textContent.trim() || '';
    let field = null;

    // TEXT FIELDS
    if (labelText === 'Name' || labelText === 'Project') {
      field = document.createElement('input');
      field.type = 'text';
      field.name = labelText.toLowerCase().replace(/\s+/g, '-');
      field.placeholder = `Enter ${labelText.toLowerCase()}`;
    }

    // DATE FIELDS
    else if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = labelText.toLowerCase().replace(/\s+/g, '-');
    }

    // NUMBER FIELD
    else if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.step = '0.1';
      field.min = '0';
      field.name = 'hours-saved';
      field.placeholder = 'Enter hours saved';
    }

    // DROPDOWN (from doc values)
    else if (labelText === 'Accelerator Used') {
      field = document.createElement('select');
      field.name = 'accelerator-used';

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
    }

    // SUBMIT BUTTON
    else if (labelText === 'Submit Weekly Report') {
      field = document.createElement('button');
      field.type = 'submit';
      field.textContent = labelText;
    }

    if (!field) return;

    const wrapper = document.createElement('div');

    if (field.type === 'submit') {
      wrapper.className = 'form-row form-row-submit';
      wrapper.appendChild(field);
    } else {
      wrapper.className = 'form-row';

      const label = document.createElement('label');
      label.textContent = labelText;

      const nameAttr =
        field.name || labelText.toLowerCase().replace(/\s+/g, '-');

      label.setAttribute('for', nameAttr);
      field.id = nameAttr;

      wrapper.appendChild(label);
      wrapper.appendChild(field);
    }

    form.appendChild(wrapper);
  });

  // ✅ SUBMIT HANDLER WITH ADOBE DATALAYER
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    const payload = {
      accelaratorsUsed: data['accelerator-used'] || '',
      emailAddress: data['email-address'] || 'ezhilarasur@adobe.com',
      fromDate: data['from-date'] || '',
      hoursSaved: Number(data['hours-saved'] || 0),
      ldap: data['ldap'] || 'ezhilarasur',
      projectName: data['project'] || '',
      toDate: data['to-date'] || '',
      eventType: 'card.submitted',
    };

    // ✅ SAFE Adobe Data Layer push (queue pattern)
    window.adobeDataLayer = window.adobeDataLayer || [];
    window.adobeDataLayer.push(payload);

    console.log('✅ adobeDataLayer push:', payload);

    alert('Weekly report submitted successfully!');
  });

  block.replaceChildren(form);
}