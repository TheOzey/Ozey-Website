/* Ozey — interactions + hero network animation */
(() => {
  document.documentElement.classList.add('js');

  // ── Scroll nav ──────────────────────────────────────────────────────────────
  const masthead = document.querySelector('.masthead') || document.getElementById('nav');
  const onScroll = () => masthead.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Reveal on scroll ─────────────────────────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');
  const vh = window.innerHeight;
  reveals.forEach(el => { if (el.getBoundingClientRect().top < vh - 40) el.classList.add('in'); });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // ── Showcase tabs ─────────────────────────────────────────────────────────────
  const tabs   = document.querySelectorAll('.showcase-tab');
  const frames = document.querySelectorAll('.showcase-frame');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.setAttribute('aria-selected', 'false'));
    t.setAttribute('aria-selected', 'true');
    frames.forEach(f => f.classList.toggle('active', f.id === t.dataset.target));
  }));

  // ── Hero network animation ───────────────────────────────────────────────────
  const canvas = document.querySelector('.hero-network');
  if (!canvas) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx       = canvas.getContext('2d');
  let W, H, nodes = [];
  let startTime   = Date.now();
  let raf, lastTs = 0, stopped = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    repopulate();
  }

  function repopulate() {
    const count = Math.min(Math.floor((W * H) / 19000), 50);
    nodes = Array.from({ length: count }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      vx:     (Math.random() - 0.5) * 0.22,
      vy:     (Math.random() - 0.5) * 0.22,
      r:      Math.random() < 0.12 ? 1.9 : 1.2,
      accent: Math.random() < 0.09,   // ~9% cobalt-accent nodes
    }));
  }

  function draw(fullConnect) {
    const elapsed     = (Date.now() - startTime) / 1000;
    const maxDist     = 170;
    // Connection radius grows 0 → maxDist over ~4 seconds: "systems organizing"
    const connectDist = fullConnect ? maxDist : Math.min(elapsed / 4, 1) * maxDist;

    ctx.clearRect(0, 0, W, H);

    // Edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < connectDist) {
          const a = (1 - d / connectDist) * 0.21;
          ctx.strokeStyle = (nodes[i].accent || nodes[j].accent)
            ? `rgba(0,21,252,${(a * 0.48).toFixed(3)})`
            : `rgba(67,70,79,${a.toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.accent ? 'rgba(0,21,252,0.52)' : 'rgba(67,70,79,0.28)';
      ctx.fill();

      if (!prefersReduced) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -10 || n.x > W + 10) n.vx *= -1;
        if (n.y < -10 || n.y > H + 10) n.vy *= -1;
      }
    }
  }

  function tick(ts) {
    if (stopped) return;
    if (ts - lastTs > 34) {   // ~30 fps — gentle on battery
      lastTs = ts;
      draw(false);
    }
    raf = requestAnimationFrame(tick);
  }

  // Fade + parallax on scroll
  window.addEventListener('scroll', () => {
    const ratio = Math.min(window.scrollY / (H * 0.65), 1);
    canvas.style.opacity   = String((1 - ratio * 0.9).toFixed(3));
    canvas.style.transform = `translateY(${(window.scrollY * 0.28).toFixed(1)}px)`;
  }, { passive: true });

  // Pause when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopped = true;
      cancelAnimationFrame(raf);
    } else if (!prefersReduced) {
      stopped = false;
      raf = requestAnimationFrame(tick);
    }
  });

  window.addEventListener('resize', resize, { passive: true });

  resize();

  if (prefersReduced) {
    draw(true);  // static "already organized" state
  } else {
    raf = requestAnimationFrame(tick);
  }
})();
