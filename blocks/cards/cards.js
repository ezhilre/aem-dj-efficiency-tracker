import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  console.log('🔵 decorate() called with block:', block);

  const ul = document.createElement('ul');

  [...block.children].forEach((row, rowIndex) => {
    console.log(`➡️ Processing row ${rowIndex}:`, row);

    const li = document.createElement('li');

    while (row.firstElementChild) {
      console.log('  ↪️ Moving child:', row.firstElementChild);
      li.append(row.firstElementChild);
    }

    [...li.children].forEach((div, divIndex) => {
      console.log(`  🔹 Processing div ${divIndex}:`, div);

      if (div.children.length === 1 && div.querySelector('picture')) {
        console.log('    🖼️ Identified as IMAGE section');

        div.className = 'cards-card-image';

        const p = document.createElement('p');
        p.textContent = 'time to work';
        div.append(p);

      } else {
        console.log('    📝 Identified as BODY section');

        div.className = 'cards-card-body';

        const p = document.createElement('p');
        p.textContent = 'time to fun';
        div.append(p);
      }
    });

    ul.append(li);
  });

  console.log('🟡 Before image optimization:', ul);

  ul.querySelectorAll('picture > img').forEach((img, imgIndex) => {
    console.log(`🖼️ Optimizing image ${imgIndex}:`, img.src);

    const optimized = createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ width: '750' }]
    );

    img.closest('picture').replaceWith(optimized);
  });

  console.log('🟢 Final UL structure:', ul);

  block.replaceChildren(ul);

  console.log('✅ Block updated successfully');
}