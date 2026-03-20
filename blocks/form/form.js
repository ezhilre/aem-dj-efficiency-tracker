// blocks/form/form.js

export default function decorate(block) {
  console.log('🔵 form.js decorate() called');

  const form = document.createElement('form');
  const rows = [...block.children];

  // Capture the WebSDK URL (if provided in the table)
  let webSDKUrl = '';

  rows.forEach((row) => {
    const labelText = row.children[0]?.textContent.trim();
    const valueText = row.children[1]?.textContent.trim() || '';
    let field = null;

    // Handle WebSDK row: extract URL and skip rendering
    if (labelText === 'WebSDK' || labelText === 'Web SDK') {
      const anchor = row.querySelector('a[href]');
      webSDKUrl = anchor ? anchor.href : valueText;
      console.log('🔵 Found WebSDK row, URL =', webSDKUrl);
      return;
    }

    // Build form fields based on known labels
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
      valueText.split(',')
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

    // Skip unknown labels
    if (!field) return;

    // Wrap label and field
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
    }
    form.appendChild(wrapper);
  });

  // Handle form submission
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    console.log('Weekly report submitted:', data);
    alert('Weekly report submitted. Check the console for values.');
  });

  // Replace block content with the built form
  block.replaceChildren(form);

  // Inject Web SDK script into <head> if a URL was provided
  if (webSDKUrl && !document.head.querySelector(`script[src="${webSDKUrl}"]`)) {
    const scriptEl = document.createElement('script');
    scriptEl.src = webSDKUrl;
    scriptEl.async = true;
    document.head.appendChild(scriptEl);
    console.log('🟢 WebSDK script injected into <head>:', webSDKUrl);
  } else if (!webSDKUrl) {
    console.log('🔴 No WebSDK URL found; script not injected.');
  } else {
    console.log('🔵 WebSDK script already present; not injecting again.');
  }
}