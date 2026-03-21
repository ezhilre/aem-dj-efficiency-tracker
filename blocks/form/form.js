export default function decorate(block) {
  const form = document.createElement('form');
  const rows = [...block.children];
  const fieldLabels = {};

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueText = row.children[1]?.textContent.trim() || '';
    let field = null;

    if (labelText === 'Name' || labelText === 'Project' || labelText === 'Email Address' || labelText === 'LDAP') {
      field = document.createElement('input');
      field.type = 'text';
      field.name = labelText.toLowerCase().replace(/\s+/g, '-');
      field.placeholder = `Enter ${labelText.toLowerCase()}`;
    } else if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = labelText.toLowerCase().replace(/\s+/g, '-');
    } else if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.step = '0.1';
      field.min = '0';
      field.name = 'hours-saved';
      field.placeholder = 'Enter hours saved';
    } else if (labelText === 'Accelerator Used') {
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
    } else if (labelText === 'Submit Weekly Report') {
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

      const nameAttr = field.name || labelText.toLowerCase().replace(/\s+/g, '-');
      label.setAttribute('for', nameAttr);
      field.id = nameAttr;

      wrapper.appendChild(label);
      wrapper.appendChild(field);

      fieldLabels[nameAttr] = labelText;
    }

    form.appendChild(wrapper);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

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

    const summary = document.createElement('div');
    summary.className = 'form-success';

    summary.innerHTML = `
      <h2>Weekly report submitted successfully</h2>
      <p>Here is what was submitted:</p>
      <ul>
        <li><strong>From Date:</strong> ${data['from-date'] || '-'}</li>
        <li><strong>To Date:</strong> ${data['to-date'] || '-'}</li>
        <li><strong>Name:</strong> ${data['name'] || '-'}</li>
        <li><strong>Email Address:</strong> ${data['email-address'] || '-'}</li>
        <li><strong>LDAP:</strong> ${data['ldap'] || '-'}</li>
        <li><strong>Project:</strong> ${data['project'] || '-'}</li>
        <li><strong>Hours Saved:</strong> ${data['hours-saved'] || '-'}</li>
        <li><strong>Accelerator Used:</strong> ${data['accelerator-used'] || '-'}</li>
      </ul>
    `;

    block.replaceChildren(summary);
  });

  block.replaceChildren(form);
}