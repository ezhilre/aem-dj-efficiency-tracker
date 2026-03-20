export default function decorate(block) {
  console.log('🔵Form block is called', block.innerHTML);
  const form = document.createElement('form');
  const rows = [...block.children];

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim().replace(/\s+/g, ' ');
    const valueText = row.children[1]?.textContent.trim() || '';
    let field = null;

    console.log('row label:', labelText);
    console.log('row value:', valueText);

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

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select accelerator';
      placeholder.disabled = true;
      placeholder.selected = true;
      field.appendChild(placeholder);

      const options = valueText
        .split(',')
        .map((opt) => opt.trim())
        .filter(Boolean);

      console.log('accelerator options:', options);

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

    if (field.type === 'submit') {
      wrapper.className = 'form-row form-row-submit';
      wrapper.appendChild(field);
    } else {
      wrapper.className = 'form-row';

      const label = document.createElement('label');
      label.textContent = labelText;
      label.setAttribute('for', field.name || labelText.toLowerCase().replace(/\s+/g, '-'));
      field.id = field.name || labelText.toLowerCase().replace(/\s+/g, '-');

      wrapper.appendChild(label);
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