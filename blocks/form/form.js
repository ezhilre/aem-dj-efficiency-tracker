export default function decorate(block) {
  console.log('FORM BLOCK START');
  console.log('block:', block);
  console.log('block HTML before:', block.innerHTML);

  const form = document.createElement('form');
  const rows = [...block.children];

  console.log('rows count:', rows.length);

  rows.forEach((row, index) => {
    console.log(`row ${index}:`, row);
    console.log(`row ${index} innerHTML:`, row.innerHTML);
    console.log(`row ${index} textContent:`, row.textContent.trim());

    const labelText = row.textContent.trim();
    let field = null;

    if (labelText === 'From Date' || labelText === 'To Date') {
      field = document.createElement('input');
      field.type = 'date';
      field.name = labelText.toLowerCase().replace(/\s+/g, '-');
      console.log(`created date input for ${labelText}`);
    } else if (labelText === 'Hours Saved') {
      field = document.createElement('input');
      field.type = 'number';
      field.step = '0.1';
      field.name = 'hours-saved';
      console.log('created number input for Hours Saved');
    } else if (labelText === 'Accelerator Used') {
      field = document.createElement('select');
      field.name = 'accelerator-used';

      const options = ['Yes', 'No'];
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        field.appendChild(option);
      });

      console.log('created dropdown for Accelerator Used');
    } else if (labelText === 'Submit Weekly Report') {
      field = document.createElement('button');
      field.type = 'submit';
      field.textContent = labelText;
      console.log('created submit button');
    } else if (labelText === 'Name' || labelText === 'Project') {
      field = document.createElement('input');
      field.type = 'text';
      field.name = labelText.toLowerCase().replace(/\s+/g, '-');
      console.log(`created text input for ${labelText}`);
    } else {
      console.log(`no field matched for row ${index}: "${labelText}"`);
    }

    if (field) {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-row';

      if (field.type !== 'submit') {
        const label = document.createElement('label');
        label.textContent = labelText;
        wrapper.appendChild(label);
      }

      wrapper.appendChild(field);
      form.appendChild(wrapper);
      console.log(`appended field for row ${index}`);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('FORM SUBMITTED');

    const data = new FormData(form);
    const result = Object.fromEntries(data.entries());

    console.log('form data object:', result);
    alert('Check console for submitted data');
  });

  block.innerHTML = '';
  block.appendChild(form);

  console.log('block HTML after:', block.innerHTML);
  console.log('FORM BLOCK END');
}