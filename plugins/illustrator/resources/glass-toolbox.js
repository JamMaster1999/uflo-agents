// Glass Toolbox - Editor for adding/removing/positioning lenses
// Uses a pool of pre-initialized lenses for live real-time effect

document.addEventListener('DOMContentLoaded', () => {
  const POOL_SIZE = 10;
  const storageKey = 'glass-lens-positions-' + location.pathname;
  const isScreenshot = window.__SCREENSHOT_MODE__;

  // Wrap .container in .lens-scene for relative positioning
  const container = document.querySelector('.container');
  if (!container) return;

  const scene = document.createElement('div');
  scene.className = 'lens-scene';
  container.parentNode.insertBefore(scene, container);
  scene.appendChild(container);

  // Check for existing HTML lenses before creating pool
  const existingLenses = document.querySelectorAll('.glass-lens');
  const hasHtmlLenses = existingLenses.length > 0;

  // In screenshot mode, just move any existing HTML lenses into the scene and stop
  if (isScreenshot) {
    existingLenses.forEach(lens => {
      if (!scene.contains(lens)) scene.appendChild(lens);
    });
    return;
  }

  // If HTML lenses exist, clear localStorage and use them as source of truth
  if (hasHtmlLenses) {
    localStorage.removeItem(storageKey);
  }

  // Move existing HTML lenses into scene and save their positions
  const htmlPositions = [];
  existingLenses.forEach(lens => {
    htmlPositions.push({ top: lens.style.top, left: lens.style.left });
    lens.remove(); // Remove - will be recreated in pool
  });

  // Create lens pool inside scene (all hidden initially)
  const pool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const lens = document.createElement('div');
    lens.className = 'glass-lens';
    lens.dataset.poolIndex = i;
    lens.style.top = '-9999px';
    lens.style.left = '-9999px';
    lens.style.visibility = 'hidden';
    scene.appendChild(lens);
    pool.push(lens);
  }

  // Track which lenses are "active" (visible)
  let activeLenses = [];

  // Load positions: prefer HTML lenses, fall back to localStorage
  const saved = htmlPositions.length > 0 ? htmlPositions : JSON.parse(localStorage.getItem(storageKey) || '[]');
  saved.forEach((pos, i) => {
    if (i < POOL_SIZE) {
      showLens(i, pos.top, pos.left);
    }
  });

  // Create toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'glass-toolbox';
  toolbar.innerHTML = `
    <button class="gt-btn gt-add">+ Lens</button>
    <button class="gt-btn gt-export">Export</button>
    <span class="gt-count"></span>
  `;
  document.body.appendChild(toolbar);

  updateCount();

  // Add lens
  toolbar.querySelector('.gt-add').onclick = () => {
    const idx = getNextAvailable();
    if (idx === -1) {
      toast('Max ' + POOL_SIZE + ' lenses');
      return;
    }
    showLens(idx, '200px', '300px');
    savePositions();
    updateCount();
  };

  // Export
  toolbar.querySelector('.gt-export').onclick = () => {
    if (activeLenses.length === 0) {
      toast('No lenses to export');
      return;
    }

    let html = '';
    activeLenses.forEach(idx => {
      const lens = pool[idx];
      html += `<div class="glass-lens" style="top: ${lens.style.top}; left: ${lens.style.left};"></div>\n`;
    });

    navigator.clipboard.writeText(html.trim()).then(() => {
      toast('Copied ' + activeLenses.length + ' lens(es)');
    }).catch(() => {
      console.log('--- EXPORT ---\n' + html);
      toast('Check console');
    });
  };

  // Listen for drag events from glass-lens.js
  window.addEventListener('lens-moved', savePositions);

  function showLens(idx, top, left) {
    const lens = pool[idx];
    lens.style.top = top;
    lens.style.left = left;
    lens.style.visibility = 'visible';

    if (!activeLenses.includes(idx)) {
      activeLenses.push(idx);
      addDeleteButton(lens);
    }
  }

  function hideLens(idx) {
    const lens = pool[idx];
    lens.style.top = '-9999px';
    lens.style.left = '-9999px';
    lens.style.visibility = 'hidden';
    activeLenses = activeLenses.filter(i => i !== idx);
  }

  function getNextAvailable() {
    for (let i = 0; i < POOL_SIZE; i++) {
      if (!activeLenses.includes(i)) return i;
    }
    return -1;
  }

  function addDeleteButton(lens) {
    if (lens.querySelector('.gt-delete')) return;
    const del = document.createElement('button');
    del.className = 'gt-delete';
    del.innerHTML = '&times;';
    del.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      hideLens(parseInt(lens.dataset.poolIndex));
      savePositions();
      updateCount();
    };
    lens.appendChild(del);
  }

  function savePositions() {
    const positions = activeLenses.map(idx => ({
      top: pool[idx].style.top,
      left: pool[idx].style.left
    }));
    localStorage.setItem(storageKey, JSON.stringify(positions));
  }

  function updateCount() {
    const count = activeLenses.length;
    toolbar.querySelector('.gt-count').textContent = count + '/' + POOL_SIZE;
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'gt-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
});
