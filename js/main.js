/* ══════════════════════════════════════
   Rahul Ramesh — Portfolio JS
   ══════════════════════════════════════ */

// ── Navbar scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});


// ── Word-split text animation ──
(function initWordAnim() {
  document.querySelectorAll('h2, h1.hero-name').forEach(el => {
    if (el.closest('#hero')) return; // skip hero h1 — handled separately
    el.classList.add('word-anim');
    const words = el.innerHTML.split(/(\s+|<[^>]+>)/g);
    el.innerHTML = words.map(w =>
      /^\s+$/.test(w) ? w :
      /^</.test(w)    ? w :
      `<span class="word" style="white-space:pre">${w}</span>`
    ).join('');
  });

  const wordObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      e.target.querySelectorAll('.word').forEach((w, i) => {
        w.style.transitionDelay = `${i * 0.06}s`;
      });
      wordObs.unobserve(e.target);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.word-anim').forEach(el => wordObs.observe(el));
})();

// ── Section heading shimmer ──
(function initShimmer() {
  document.querySelectorAll('.section-label').forEach(el => el.classList.add('heading-shimmer'));
})();

// ── Hamburger ──
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
hamburger?.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));

// ══════════════════════════════════════
// THREE.JS — Capsule Wave + Water Ripple
// ══════════════════════════════════════
(function initHero() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
  camera.position.set(0, 0, 28);

  // ── Capsule Sprite Texture ──
  function makeCapsuleTexture() {
    const cw = 32, ch = 80;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);
    const r = cw * 0.42;        // semicircle radius
    const cx = cw / 2;
    const top = r + 1;
    const bot = ch - r - 1;
    ctx.beginPath();
    ctx.arc(cx, top, r, Math.PI, 0);
    ctx.lineTo(cx + r, bot);
    ctx.arc(cx, bot, r, 0, Math.PI);
    ctx.closePath();
    // Soft inner glow to look polished
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    g.addColorStop(1,   'rgba(255,255,255,0.55)');
    ctx.fillStyle = g;
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  // ── Particle Grid ──
  // Camera z=28, fov=60 → visible: ~57.5w × 32.3h at 16:9
  // Use generous oversize to guarantee no gaps on any screen
  const cols = 76, rows = 42;
  const spacing = 0.92;
  const total = cols * rows;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(total * 3);
  const colors    = new Float32Array(total * 3);

  // Store base positions for ripple calc
  const baseX = new Float32Array(total);
  const baseY = new Float32Array(total);

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const idx = (i * rows + j);
      const bx = (i - cols / 2) * spacing;
      const by = (j - rows / 2) * spacing;
      baseX[idx] = bx;
      baseY[idx] = by;
      positions[idx * 3]     = bx;
      positions[idx * 3 + 1] = by;
      positions[idx * 3 + 2] = 0;
      // base blue
      colors[idx * 3]     = 0.13;
      colors[idx * 3 + 1] = 0.48;
      colors[idx * 3 + 2] = 0.99;
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.42,
    map: makeCapsuleTexture(),
    transparent: true,
    vertexColors: true,
    alphaTest: 0.05,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ── Ripple System ──
  // Each ripple: { wx, wy, t }  — wx/wy in world units
  const ripples = [];
  const MAX_RIPPLES = 6;
  const RIPPLE_LIFE  = 480; // frames — very long graceful fade

  // Convert canvas mouse → world XY at z=0 plane
  function mouseToWorld(ex, ey) {
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((ex - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((ey - rect.top)  / rect.height) * 2 + 1;
    const halfH = Math.tan(30 * Math.PI / 180) * camera.position.z;
    const halfW = halfH * camera.aspect;
    return { wx: ndcX * halfW, wy: ndcY * halfH };
  }

  let lastMX = -999, lastMY = -999;
  window.addEventListener('mousemove', e => {
    const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
    if (dx * dx + dy * dy < 900) return; // throttle: every ~30px
    lastMX = e.clientX; lastMY = e.clientY;
    const { wx, wy } = mouseToWorld(e.clientX, e.clientY);
    ripples.push({ wx, wy, t: 0 });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  });

  // Smooth camera parallax
  let targetCX = 0, targetCY = 0;
  window.addEventListener('mousemove', e => {
    targetCX = ((e.clientX / window.innerWidth)  - 0.5) * 4;
    targetCY = -((e.clientY / window.innerHeight) - 0.5) * 2.5;
  });

  window.addEventListener('resize', () => {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.0032; // slow visible swell — full cycle ~33 seconds

    const pos = geo.attributes.position;
    const col = geo.attributes.color;

    // Age ripples, remove dead ones
    for (let r = ripples.length - 1; r >= 0; r--) {
      ripples[r].t++;
      if (ripples[r].t > RIPPLE_LIFE) ripples.splice(r, 1);
    }

    for (let idx = 0; idx < total; idx++) {
      const bx = baseX[idx];
      const by = baseY[idx];

      // ── Base superposition wave (smoother, like calm water) ──
      // ── Base wave: Z depth + visible Y displacement ──
      const bz =
        1.4 * Math.sin(bx * 0.14 + t) * Math.cos(by * 0.11 + t * 0.38) +
        0.45 * Math.sin(bx * 0.20 - t * 0.45 + by * 0.06) +
        0.18 * Math.cos(by * 0.16 + t * 0.22);

      // Y offset — makes the wave visually obvious on screen
      const dy_wave =
        0.18 * Math.sin(bx * 0.14 + t) * Math.cos(by * 0.11 + t * 0.38) +
        0.06 * Math.sin(bx * 0.20 - t * 0.45 + by * 0.06);

      // ── Ripple contributions (stone-on-water) ──
      let rz = 0;
      let ry = 0;
      for (const ripple of ripples) {
        const rdx  = bx - ripple.wx;
        const rdy  = by - ripple.wy;
        const dist = Math.sqrt(rdx * rdx + rdy * rdy);
        const age  = ripple.t;

        // Super slow stone-on-water: ring expands lazily, fades gracefully
        const front    = age * 0.028;
        const spread   = 2.8;
        const envelope = Math.exp(-((dist - front) ** 2) / (spread * spread));
        const timeFade = Math.exp(-age * 0.004);
        const wave     = 2.8 * envelope * timeFade * Math.sin(dist * 0.65 - age * 0.045);
        rz += wave;
        ry += wave * 0.12; // slight Y component for visible ripple movement
      }

      pos.array[idx * 3 + 1] = by + dy_wave + ry;
      pos.array[idx * 3 + 2] = bz + rz;

      // ── Color: solid blue, brighten at wave crests ──
      const height = (bz + rz + 4) / 8; // normalize ~0-1
      const h = Math.max(0, Math.min(1, height));
      col.array[idx * 3]     = 0.05 + h * 0.15; // r
      col.array[idx * 3 + 1] = 0.36 + h * 0.28; // g
      col.array[idx * 3 + 2] = 0.82 + h * 0.18; // b
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;

    // Smooth parallax
    camera.position.x += (targetCX - camera.position.x) * 0.04;
    camera.position.y += (targetCY - camera.position.y) * 0.04;

    renderer.render(scene, camera);
  }
  animate();
})();

// ── Animated Counters ──
function animateCounter(el) {
  const target   = parseFloat(el.dataset.target);
  const suffix   = el.dataset.suffix || '';
  const duration = 2200;
  const steps    = 70;
  let current    = 0;
  const inc      = target / steps;
  const timer    = setInterval(() => {
    current += inc;
    if (current >= target) { current = target; clearInterval(timer); }
    const display = Number.isInteger(target) ? Math.floor(current) : current.toFixed(1);
    el.textContent = display + suffix;
  }, duration / steps);
}

// ── Intersection Observers ──
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterObs.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num[data-target]').forEach(el => counterObs.observe(el));

const tlObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); tlObs.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.tl-item').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.12}s`;
  tlObs.observe(el);
});

// Timeline line-grow animation
const timelineEl = document.querySelector('.timeline');
if (timelineEl) {
  const tlLineObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { timelineEl.classList.add('visible'); tlLineObs.unobserve(timelineEl); } });
  }, { threshold: 0.05 });
  tlLineObs.observe(timelineEl);
}

// ── Neural Network Skill Canvas ──
(function initSkillNetwork() {
  const canvas = document.getElementById('skill-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', () => { resize(); initNodes(); });

  const skills = [
    { label: 'LangGraph',     group: 'genai', size: 22 },
    { label: 'LangChain',     group: 'genai', size: 20 },
    { label: 'CrewAI',        group: 'genai', size: 18 },
    { label: 'GraphRAG',      group: 'genai', size: 19 },
    { label: 'RAG',           group: 'genai', size: 17 },
    { label: 'DeepEval',      group: 'genai', size: 15 },
    { label: 'Autogen',       group: 'genai', size: 15 },
    { label: 'Vertex AI',     group: 'cloud', size: 20 },
    { label: 'SageMaker',     group: 'cloud', size: 20 },
    { label: 'GCP',           group: 'cloud', size: 18 },
    { label: 'AWS',           group: 'cloud', size: 18 },
    { label: 'BigQuery',      group: 'cloud', size: 16 },
    { label: 'Python',        group: 'core',  size: 24 },
    { label: 'FastAPI',       group: 'core',  size: 15 },
    { label: 'TensorFlow',    group: 'ml',    size: 19 },
    { label: 'PyTorch',       group: 'ml',    size: 18 },
    { label: 'LightGBM',      group: 'ml',    size: 17 },
    { label: 'Snowflake',     group: 'data',  size: 17 },
    { label: 'Spark',         group: 'data',  size: 16 },
    { label: 'Docker',        group: 'devops',size: 16 },
    { label: 'MLOps',         group: 'devops',size: 17 },
    { label: 'Playwright',    group: 'devops',size: 14 },
    { label: 'Resp. AI',      group: 'genai', size: 17 },
  ];

  const groupColors = {
    genai:  '#217bfe',
    cloud:  '#64b8fb',
    ml:     '#ac87eb',
    core:   '#ee4d5d',
    data:   '#f59e0b',
    devops: '#22c55e',
  };

  let nodes = [];
  let mouse = { x: -9999, y: -9999 };
  let lastScrollY = window.scrollY;
  let scrollVY = 0;

  function initNodes() {
    const W = canvas.width, H = canvas.height;
    nodes = skills.map(s => ({
      ...s,
      x: 80 + Math.random() * (W - 160),
      y: 60 + Math.random() * (H - 120),
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      r: s.size, color: groupColors[s.group], hovered: false,
    }));
  }
  initNodes();

  // Track scroll delta to add gentle drift
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastScrollY;
    scrollVY = dy * 0.06; // small fraction of scroll applied as drift
    lastScrollY = window.scrollY;
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  function draw() {
    requestAnimationFrame(draw);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Apply scroll drift then decay it
    if (Math.abs(scrollVY) > 0.001) {
      nodes.forEach(n => { n.vy += scrollVY * 0.15; });
      scrollVY *= 0.85;
    }

    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      n.vx = Math.max(-0.18, Math.min(0.18, n.vx));
      n.vy = Math.max(-0.18, Math.min(0.18, n.vy));
      if (n.x < n.r + 10 || n.x > W - n.r - 10) n.vx *= -1;
      if (n.y < n.r + 10 || n.y > H - n.r - 10) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y;
      n.hovered = Math.sqrt(dx * dx + dy * dy) < n.r + 15;
    });

    // Connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
        if (d < 160) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(100,184,251,${(1-d/160)*0.55})`;
          ctx.lineWidth = (a.hovered || b.hovered) ? 2 : 0.9;
          ctx.stroke();
        }
      }
    }

    // Nodes — original style
    nodes.forEach(n => {
      const scale = n.hovered ? 1.3 : 1;
      const r = n.r * scale;
      if (n.hovered) {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.2);
        g.addColorStop(0, n.color + '40'); g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.color + (n.hovered ? 'cc' : '22');
      ctx.fill();
      ctx.strokeStyle = n.color + (n.hovered ? 'ff' : '88');
      ctx.lineWidth = n.hovered ? 2 : 1;
      ctx.stroke();
      ctx.font = `${n.hovered ? 600 : 500} ${Math.max(10, r * 0.55)}px 'DM Sans', sans-serif`;
      ctx.fillStyle = n.hovered ? '#fff' : n.color + 'cc';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
    });
  }
  draw();
})();

// ── Command Palette ──
(function initCommandPalette() {
  const overlay  = document.getElementById('cmd-overlay');
  const input    = document.getElementById('cmd-input');
  const results  = document.getElementById('cmd-results');
  if (!overlay || !input) return;

  const commands = [
    { label: 'About Rahul',                  icon: 'fa-user',      href: '#about' },
    { label: 'Multi-Agent System',           icon: 'fa-robot',     href: '#agents' },
    { label: 'Work Experience',              icon: 'fa-briefcase', href: '#experience' },
    { label: 'Skills Network',              icon: 'fa-brain',     href: '#skills' },
    { label: 'Avarta Life — Gemini Project', icon: 'fa-gem',       href: '#avarta' },
    { label: 'YouTube Studio',              icon: 'fa-youtube',   href: '#studio' },
    { label: 'AI Governance',               icon: 'fa-shield',    href: '#governance' },
    { label: 'Contact Me',                  icon: 'fa-envelope',  href: '#contact' },
    { label: 'Download CV',                 icon: 'fa-download',  href: 'cv/Rahul_Ramesh_CV_2026.pdf', download: 'Rahul_Ramesh_CV_2026.pdf' },
    { label: 'LinkedIn Profile',            icon: 'fa-linkedin',  href: 'https://www.linkedin.com/in/rahul-ramesh97/' },
    { label: 'GitHub',                      icon: 'fa-github',    href: 'https://github.com/Rahulramesh97' },
    { label: 'YouTube Channel',             icon: 'fa-play',      href: 'https://www.youtube.com/@rahul27812' },
  ];

  let selected = 0;
  function open()  { overlay.classList.add('open'); input.value = ''; render(''); input.focus(); }
  function close() { overlay.classList.remove('open'); }

  function render(query) {
    const q = query.toLowerCase();
    const filtered = commands.filter(c => c.label.toLowerCase().includes(q));
    selected = 0;
    results.innerHTML = filtered.map((c, i) => `
      <a class="cmd-result-item${i === 0 ? ' selected' : ''}" href="${c.href}"${c.download ? ` download="${c.download}"` : ''}>
        <i class="fa-solid ${c.icon}"></i><span>${c.label}</span>
      </a>`).join('');
    results.querySelectorAll('.cmd-result-item').forEach(item => item.addEventListener('click', close));
  }

  input.addEventListener('input', e => render(e.target.value));
  input.addEventListener('keydown', e => {
    const items = results.querySelectorAll('.cmd-result-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); }
    else if (e.key === 'Enter')  { e.preventDefault(); items[selected]?.click(); close(); }
    else if (e.key === 'Escape') close();
    items.forEach((el, i) => el.classList.toggle('selected', i === selected));
    items[selected]?.scrollIntoView({ block: 'nearest' });
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); overlay.classList.contains('open') ? close() : open(); }
  });
  document.getElementById('cmd-trigger')?.addEventListener('click', open);
  document.getElementById('cmd-trigger-hero')?.addEventListener('click', open);
})();

// ── Force PDF Download (bypasses browser PDF viewer) ──
(function initForceDownload() {
  document.querySelectorAll('a[download]').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      const filename = this.getAttribute('download') || href.split('/').pop();
      if (!href.match(/\.pdf$/i)) return; // only intercept PDFs
      e.preventDefault();
      fetch(href)
        .then(r => {
          if (!r.ok) throw new Error('not found');
          return r.blob();
        })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href     = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        })
        .catch(() => { window.location.href = href; }); // fallback
    });
  });
})();
