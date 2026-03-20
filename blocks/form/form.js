export default function decorate(block) {
  const form = document.createElement('form');
  const rows = [...block.children];

  rows.forEach((row) => {
    const labelText = row.textContent.trim().replace(/\s+/g, ' ');
    let field = null;

    if (labelText === 'Name' || labelText === 'Project') {
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

      // 👉 get 2nd column text
      const valueCell = row.children[1];
      let optionsText = valueCell ? valueCell.textContent.trim() : '';

      // fallback if empty
      if (!optionsText) {
        optionsText = 'Yes, No';
      }

      const options = optionsText.split(',').map(opt => opt.trim());

      // default option
      const placeholder = document.createElement('option');
      placeholder.textContent = 'Select accelerator';
      placeholder.disabled = true;
      placeholder.selected = true;
      field.appendChild(placeholder);

      options.forEach((opt) => {
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
    wrapper.className = 'form-row';

    if (field.type !== 'submit') {
      const label = document.createElement('label');
      label.textContent = labelText;
      label.setAttribute('for', field.name);
      field.id = field.name;

      wrapper.appendChild(label);
      wrapper.appendChild(field);
    } else {
      wrapper.className = 'form-row form-row-submit';
      wrapper.appendChild(field);
    }

    form.appendChild(wrapper);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const values = Object.fromEntries(data.entries());

    console.log('Weekly report submitted:', values);
    alert('Weekly report submitted. Check the console for values.');
  });

  block.replaceChildren(form);
}