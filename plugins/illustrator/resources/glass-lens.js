// Glass Lens - initializes liquidGL on all .glass-lens elements
// Runs after toolbox creates the lens pool
document.addEventListener('DOMContentLoaded', () => {
  // Resolve <use href="#…"> into inline paths so html2canvas can rasterize them
  document.querySelectorAll('svg use[href]').forEach(use => {
    const sym = document.querySelector(use.getAttribute('href'));
    if (!sym) return;
    const svg = use.closest('svg');
    if (sym.hasAttribute('viewBox')) svg.setAttribute('viewBox', sym.getAttribute('viewBox'));
    use.replaceWith(...Array.from(sym.children).map(n => n.cloneNode(true)));
  });

  // Small delay to ensure toolbox has created the pool
  setTimeout(() => {
    const lenses = document.querySelectorAll('.glass-lens');
    if (!lenses.length) return;

    liquidGL({
      snapshot: '.lens-scene',
      target: '.glass-lens',
      resolution: 10,
      refraction: 0.01,
      bevelDepth: 0.05,
      bevelWidth: 0.1,
      frost: 0.5,
      magnify: 2,
      shadow: false,
      specular: true,
      reveal: 'none',
      tilt: false,
      on: {
        init() {
          // Set up drag after liquidGL has initialized
          lenses.forEach(lens => {
            let dragging = false, ox, oy;
            lens.style.pointerEvents = 'auto';

            lens.onmousedown = e => {
              if (e.target.classList.contains('gt-delete')) return;
              dragging = true;
              ox = e.clientX - lens.offsetLeft;
              oy = e.clientY - lens.offsetTop;
              lens.style.cursor = 'grabbing';
              e.preventDefault();
            };

            document.addEventListener('mousemove', e => {
              if (!dragging) return;
              lens.style.left = (e.clientX - ox) + 'px';
              lens.style.top = (e.clientY - oy) + 'px';
            });

            document.addEventListener('mouseup', () => {
              if (dragging) {
                dragging = false;
                lens.style.cursor = 'grab';
                // Trigger save in toolbox
                window.dispatchEvent(new CustomEvent('lens-moved'));
              }
            });
          });
        }
      }
    });
  }, 50);
});
