/* =====================================================================
   RPTN 3D story — section 3 onward.
   - One WebGL world (sticky behind the content): a corridor of particles and red light
     trails with a different object group for every chapter. Scroll moves the camera
     through it; the pointer adds a little parallax.
   - A second, transparent WebGL layer draws a small 3D object into each card's .c3-icon slot.
   - GSAP ScrollTrigger brings cards forward out of the dark and sends them back into
     depth once read; cards tilt toward the pointer and step forward on hover.
   Three.js and GSAP load only when the visitor nears section 3.
   ===================================================================== */
const STORY = document.getElementById("w3d");

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
// 0 = phone, 1 = tablet / touch laptop, 2 = desktop
const tier = innerWidth < 768 ? 0 : innerWidth < 1100 || !fine ? 1 : 2;

const GSAP = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/";
const loadScript = (src) => new Promise((ok, fail) => {
  const s = document.createElement("script");
  s.src = src; s.onload = ok; s.onerror = fail;
  document.head.appendChild(s);
});

if (STORY) {
  const io = new IntersectionObserver((en) => {
    if (!en[0].isIntersecting) return;
    io.disconnect();
    start();
  }, { rootMargin: "150% 0px" });
  io.observe(STORY);
}

async function start() {
  try {
    await loadScript(GSAP + "gsap.min.js");
    await loadScript(GSAP + "ScrollTrigger.min.js");
    motion(window.gsap, window.ScrollTrigger);
  } catch (e) { console.warn("RPTN story: GSAP unavailable", e); }
  try {
    const THREE = await import("three");
    world(THREE);
  } catch (e) { console.warn("RPTN story: WebGL world unavailable", e); }
}

/* =====================================================================
   Card + section choreography (GSAP)
   ===================================================================== */
function motion(gsap, ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const $$ = (s, r = STORY) => [...r.querySelectorAll(s)];
  const cards = $$(".c3");
  const lite = tier === 0;

  // "Explore" opens the site's existing photo panel for that discipline / sector
  $$(".c3[data-shot]").forEach((card) => {
    const btn = card.querySelector(".c3-go");
    if (!btn) return;
    if (typeof window.rptnOpenShot !== "function") { btn.hidden = true; return; }
    btn.addEventListener("click", (e) => { e.stopPropagation(); window.rptnOpenShot(card.dataset.shot, card); });
  });
  // sector cards open on tap / Enter for touch and keyboard users
  $$(".c3--sector").forEach((card) => {
    card.addEventListener("click", () => { if (!fine) card.classList.toggle("open"); });
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.classList.toggle("open"); } });
  });

  // chapter HUD + story visibility
  const hud = $$(".w3d-hud a");
  ScrollTrigger.create({ trigger: STORY, start: "top 40%", end: "bottom 60%", toggleClass: { targets: STORY, className: "in-view" } });
  $$(":scope > section.w3s").forEach((sec) => ScrollTrigger.create({
    trigger: sec, start: "top 55%", end: "bottom 55%",
    onToggle: (st) => { if (st.isActive) hud.forEach((a) => a.classList.toggle("on", a.dataset.ch === sec.id)); },
  }));

  // count-up facts
  $$("[data-count]").forEach((el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0);
    if (reduce) return;
    const o = { v: from };
    el.textContent = from;
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: () => gsap.to(o, { v: to, duration: to > 100 ? 2.2 : 1.8, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(o.v); } }),
    });
  });

  // six moves: the spine fills as you read, each node lights when reached
  const spine = STORY.querySelector(".flow-spine i");
  if (spine) gsap.fromTo(spine, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".flow", start: "top 62%", end: "bottom 62%", scrub: reduce ? false : 0.6 } });
  $$(".c3--move").forEach((m) => ScrollTrigger.create({ trigger: m, start: "top 62%", toggleClass: { targets: m, className: "lit" } }));

  if (reduce) { ScrollTrigger.refresh(); return; }

  // cards come forward out of the dark, hold while read, then sink back into depth
  const vh = innerHeight;
  cards.forEach((card) => {
    const tall = card.offsetHeight > vh * 0.75 || card.hasAttribute("data-norecede");
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: lite ? 0.35 : 0.9 } });
    tl.fromTo(card,
      { z: lite ? -160 : -560, rotationX: lite ? 8 : 18, yPercent: lite ? 6 : 14, opacity: 0 },
      { z: 0, rotationX: 0, yPercent: 0, opacity: 1, ease: "power3.out", duration: tall ? 0.2 : 0.42 });
    if (tall) tl.to(card, { duration: 0.8 });
    else tl.to(card, { duration: 0.2 }).to(card, { z: lite ? -120 : -380, rotationX: lite ? -5 : -12, opacity: 0.2, ease: "power1.in", duration: 0.38 });
  });
  // section headings drift up from depth too
  $$(".w3h").forEach((hd) => gsap.fromTo(hd, { z: -200, opacity: 0, y: 40 }, {
    z: 0, opacity: 1, y: 0, ease: "power3.out",
    scrollTrigger: { trigger: hd, start: "top 95%", end: "top 55%", scrub: 0.8 },
  }));
  $$(".w3h").forEach((hd) => { hd.style.transformStyle = "preserve-3d"; hd.parentElement.style.perspective = "1400px"; });

  // card text flips up line by line as the card settles
  cards.forEach((card) => {
    const parts = card.querySelectorAll(".c3-head, .c3-t, .c3-lead, .c3-in > .c3-d, .c3-x, .c3-tags li, .c3-in > .c3-go, .c3-num, .c3--stat .c3-k, .transp li");
    if (!parts.length) return;
    gsap.fromTo(parts, { opacity: 0, y: 26, rotationX: -40, transformOrigin: "50% 0%" }, {
      opacity: 1, y: 0, rotationX: 0, duration: 0.9, ease: "power3.out", stagger: 0.05,
      scrollTrigger: { trigger: card, start: "top 84%", toggleActions: "play none none reverse" },
    });
  });

  // pointer tilt + step forward on hover (smoothed, so it never jitters)
  if (fine) cards.forEach((card) => {
    const inner = card.querySelector(".c3-in");
    const rx = gsap.quickTo(inner, "rotationX", { duration: 0.8, ease: "power3" });
    const ry = gsap.quickTo(inner, "rotationY", { duration: 0.8, ease: "power3" });
    const z = gsap.quickTo(inner, "z", { duration: 0.7, ease: "power3" });
    const big = card.classList.contains("c3--panel");
    card.addEventListener("pointerenter", () => { card.classList.add("is-hover"); z(big ? 12 : 48); });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * (big ? 3 : 11)); rx((0.5 - y) * (big ? 2 : 9));
      inner.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      inner.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
    card.addEventListener("pointerleave", () => { card.classList.remove("is-hover"); rx(0); ry(0); z(0); });
  });

  // heights above can still change (fonts, hero layout), so keep trigger positions honest
  let t = 0;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 200); }).observe(document.body);
  addEventListener("load", () => ScrollTrigger.refresh());
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 200); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  ScrollTrigger.refresh();
}

/* =====================================================================
   WebGL: shared object library (used for both card icons and the world)
   ===================================================================== */
function library(THREE) {
  const metal = () => new THREE.MeshStandardMaterial({ color: 0x1c1c1f, metalness: 0.88, roughness: 0.26, transparent: true });
  const steel = () => new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: 1, roughness: 0.18, transparent: true });
  const red = () => new THREE.MeshStandardMaterial({ color: 0xe10600, emissive: 0xe10600, emissiveIntensity: 1.1, metalness: 0.3, roughness: 0.35, transparent: true });
  const line = (o = 0.85) => new THREE.LineBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: o });
  const add = (g, geo, mat, edges = true, edgeOpacity = 0.75) => {
    const m = new THREE.Mesh(geo, mat);
    g.add(m);
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), line(edgeOpacity)));
    return m;
  };
  const S = (r, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);
  const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const C = (rt, rb, h, s = 32) => new THREE.CylinderGeometry(rt, rb, h, s);
  const T = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 12, 64, arc);
  const lathe = (pts, s = 40) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s);
  const shapeGeo = (draw, depth = 0.22) => {
    const sh = new THREE.Shape(); draw(sh);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    g.center(); return g;
  };
  const orbit = (g, obj, r, speed, tilt = 0, phase = 0) => {
    const piv = new THREE.Group(); piv.rotation.x = tilt; piv.rotation.z = tilt * 0.6; g.add(piv);
    obj.position.x = r; piv.add(obj);
    piv.rotation.y = phase;
    (g.userData.ticks ||= []).push((t) => { piv.rotation.y = phase + t * speed; });
  };

  const B_ = {
    ai(g) {
      const geo = new THREE.IcosahedronGeometry(0.82, 1);
      add(g, geo, metal(), true, 0.6).material.flatShading = true;
      const nodes = new THREE.IcosahedronGeometry(0.86, 0).attributes.position;
      const seen = new Set();
      for (let i = 0; i < nodes.count; i++) {
        const k = [nodes.getX(i), nodes.getY(i), nodes.getZ(i)].map((v) => v.toFixed(2)).join();
        if (seen.has(k)) continue; seen.add(k);
        const n = add(g, S(0.07, 10, 8), red(), false); n.position.set(nodes.getX(i), nodes.getY(i), nodes.getZ(i));
      }
    },
    cyber(g) {
      add(g, shapeGeo((s) => { s.moveTo(0, 1); s.quadraticCurveTo(0.82, 0.86, 0.82, 0.38); s.quadraticCurveTo(0.76, -0.5, 0, -1); s.quadraticCurveTo(-0.76, -0.5, -0.82, 0.38); s.quadraticCurveTo(-0.82, 0.86, 0, 1); }, 0.24), metal());
      const k = add(g, C(0.16, 0.16, 0.36), red(), false); k.rotation.x = Math.PI / 2; k.position.y = 0.12;
      const k2 = add(g, B(0.1, 0.32, 0.36), red(), false); k2.position.y = -0.12;
    },
    cloud(g) {
      [[0, 0.1, 0.5], [-0.48, -0.08, 0.38], [0.5, -0.06, 0.4], [-0.15, 0.42, 0.34], [0.25, 0.36, 0.3]].forEach(([x, y, r]) => { const m = add(g, S(r), metal(), false); m.position.set(x, y, 0); });
      const ring = add(g, T(0.95, 0.02), red(), false); ring.rotation.x = Math.PI / 2; ring.position.y = -0.38;
    },
    iot(g) {
      add(g, S(0.42), metal(), true, 0.25);
      add(g, S(0.2, 16, 12), red(), false);
      [[0.95, 0.9, 0.3, 0], [0.8, -1.3, -0.5, 2], [1.05, 0.7, 1.1, 4]].forEach(([r, sp, tilt, ph]) => {
        orbit(g, new THREE.Mesh(S(0.09, 12, 8), red()), r, sp, tilt, ph);
        const ring = new THREE.Mesh(T(r, 0.006), line(0.35)); ring.rotation.x = Math.PI / 2 + tilt; ring.rotation.y = tilt * 0.6; g.add(ring);
      });
    },
    chain(g) {
      [[-0.62, -0.42], [0, 0], [0.62, 0.42]].forEach(([x, y], i) => { const m = add(g, B(0.46, 0.46, 0.46), i === 1 ? red() : metal()); m.position.set(x, y, 0); m.rotation.set(0.5, 0.6, 0); });
      [[-0.31, -0.21], [0.31, 0.21]].forEach(([x, y]) => { const l = add(g, C(0.035, 0.035, 0.5, 8), steel(), false); l.position.set(x, y, 0); l.rotation.z = -0.97; });
    },
    nano(g) {
      const pts = [[0, 0, 0]];
      for (let i = 0; i < 6; i++) pts.push([Math.cos(i * Math.PI / 3) * 0.62, Math.sin(i * Math.PI / 3) * 0.62, 0]);
      pts.forEach(([x, y], i) => { [-0.25, 0.25].forEach((z, k) => { const m = add(g, S(0.13, 14, 10), i === 0 && k ? red() : metal(), false); m.position.set(x, y, z); }); });
      const pos = [];
      pts.slice(1).forEach(([x, y]) => [-0.25, 0.25].forEach((z) => pos.push(0, 0, z, x, y, z)));
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.add(new THREE.LineSegments(lg, line(0.6)));
    },
    consult(g) {
      [[0.9, 0, 0], [0.74, Math.PI / 2, 0], [0.58, 0, Math.PI / 2]].forEach(([r, rx, ry], i) => {
        const m = add(g, T(r, 0.04), i ? metal() : steel(), false); m.rotation.set(rx, ry, 0);
        (g.userData.ticks ||= []).push((t) => { m.rotation.z = t * (0.4 + i * 0.3); });
      });
      add(g, S(0.2), red(), false);
    },
    finance(g) {
      for (let i = 0; i < 4; i++) { const m = add(g, C(0.6, 0.6, 0.13), i === 3 ? red() : metal(), true, 0.5); m.position.set(Math.sin(i) * 0.06, -0.42 + i * 0.17, Math.cos(i * 2) * 0.05); }
      const t = add(g, C(0.6, 0.6, 0.13), metal(), true, 0.5); t.position.set(0.55, -0.42, 0.45); t.rotation.z = 1.2;
    },
    gov(g) {
      add(g, B(1.5, 0.12, 0.8), metal()).position.y = -0.6;
      for (let i = 0; i < 4; i++) { const c = add(g, C(0.07, 0.07, 0.8, 12), steel(), false); c.position.set(-0.54 + i * 0.36, -0.14, 0); }
      add(g, B(1.4, 0.1, 0.72), metal()).position.y = 0.3;
      const roof = add(g, C(0, 0.85, 0.4, 3), red()); roof.position.y = 0.55; roof.rotation.y = Math.PI / 2; roof.scale.z = 0.5;
    },
    energy(g) {
      add(g, C(0.05, 0.1, 1.5, 12), steel(), false).position.y = -0.35;
      const hub = new THREE.Group(); hub.position.y = 0.4; g.add(hub);
      hub.add(new THREE.Mesh(S(0.11, 14, 10), red()));
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(B(0.09, 0.85, 0.03), metal()); b.position.y = 0.45; const p = new THREE.Group(); p.rotation.z = (i * Math.PI * 2) / 3; p.add(b); hub.add(p); }
      (g.userData.ticks ||= []).push((t) => { hub.rotation.z = -t * 1.4; });
    },
    factory(g) {
      const teeth = 12, ro = 0.85, ri = 0.68;
      add(g, shapeGeo((s) => {
        for (let i = 0; i <= teeth * 4; i++) { const a = (i / (teeth * 4)) * Math.PI * 2, r = i % 4 < 2 ? ro : ri; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        const hole = new THREE.Path(); hole.absarc(0, 0, 0.26, 0, Math.PI * 2, true); s.holes.push(hole);
      }, 0.2), metal(), true, 0.5);
      const ax = add(g, C(0.12, 0.12, 0.42, 20), red(), false); ax.rotation.x = Math.PI / 2;
      (g.userData.ticks ||= []).push((t) => { g.children[0].rotation.z = t * 0.5; });
    },
    build(g) {
      [[0, -0.55, 1.5, 0.14, 0.2, 0], [-0.4, 0, 0.16, 1.1, 0.16, 0], [0.4, 0, 0.16, 1.1, 0.16, 0], [0, 0.6, 1.5, 0.14, 0.2, 0]].forEach(([x, y, w, h, d], i) => { add(g, B(w, h, d), metal()).position.set(x, y, 0); });
      const arm = add(g, B(1.2, 0.08, 0.08), red()); arm.position.set(0.25, 0.86, 0); arm.rotation.z = 0.12;
      const cable = add(g, B(0.01, 0.42, 0.01), steel(), false); cable.position.set(0.72, 0.62, 0);
    },
    edu(g) {
      const cap = add(g, B(1.3, 0.06, 1.3), metal()); cap.rotation.y = Math.PI / 4; cap.position.y = 0.18;
      add(g, C(0.42, 0.48, 0.38), metal(), true, 0.4).position.y = -0.1;
      const tas = add(g, B(0.03, 0.5, 0.03), red(), false); tas.position.set(0.62, -0.06, 0);
      add(g, S(0.06), red(), false).position.y = 0.23;
    },
    retail(g) {
      add(g, B(0.9, 0.95, 0.38), metal()).position.y = -0.2;
      const h = add(g, T(0.26, 0.035, Math.PI), red(), false); h.position.y = 0.27;
    },
    agri(g) {
      add(g, C(0.03, 0.04, 1.1, 8), steel(), false).position.y = -0.2;
      [[-0.28, 0.06, 0.6], [0.3, 0.32, -0.6], [-0.2, 0.55, 0.5]].forEach(([x, y, rz], i) => { const l = add(g, S(0.3, 20, 12), i === 1 ? red() : metal(), false); l.scale.set(1, 0.32, 0.55); l.position.set(x, y, 0); l.rotation.z = rz; });
      add(g, C(0.4, 0.3, 0.24, 24), metal(), true, 0.4).position.y = -0.78;
    },
    media(g) {
      add(g, B(1.5, 0.92, 0.07), metal()).position.y = 0.1;
      const p = add(g, C(0.28, 0.28, 0.08, 3), red(), false); p.rotation.set(Math.PI / 2, 0, -Math.PI / 2); p.position.set(0.04, 0.1, 0.07);
      add(g, B(0.5, 0.06, 0.3), steel(), false).position.y = -0.5;
    },
    travel(g) {
      add(g, S(0.58, 28, 18), metal(), false);
      g.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.6, 12, 8)), line(0.25)));
      const r = new THREE.Mesh(T(0.95, 0.008), line(0.5)); r.rotation.set(Math.PI / 2 - 0.35, 0.3, 0); g.add(r);
      orbit(g, new THREE.Mesh(S(0.08, 12, 8), red()), 0.95, 1.2, 0.35, 0);
    },
    enviro(g) {
      add(g, lathe([[0, -0.75], [0.35, -0.62], [0.52, -0.3], [0.5, 0.0], [0.35, 0.35], [0.14, 0.65], [0, 0.85]]), metal(), false);
      add(g, S(0.18), red(), false).position.y = -0.3;
    },
    pro(g) {
      add(g, B(1.3, 0.85, 0.34), metal()).position.y = -0.12;
      const h = add(g, T(0.22, 0.04, Math.PI), steel(), false); h.position.y = 0.31;
      add(g, B(0.22, 0.12, 0.06), red(), false).position.set(0, 0.04, 0.19);
    },
    hotel(g) {
      add(g, lathe([[0, 0.7], [0.12, 0.66], [0.5, 0.42], [0.72, 0.05], [0.76, 0]]), metal(), false);
      add(g, C(0.95, 0.95, 0.06, 40), steel(), false).position.y = -0.03;
      add(g, S(0.08), red(), false).position.y = 0.76;
    },
    arch(g) {
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(B(1.3, 1.3, 1.3)), line(0.8)));
      add(g, B(0.62, 0.62, 0.62), metal(), true, 0.4).rotation.set(0.6, 0.6, 0);
      [[1, 1, 1], [-1, -1, 1], [1, -1, -1], [-1, 1, -1]].forEach(([x, y, z]) => add(g, S(0.07, 10, 8), red(), false).position.set(x * 0.65, y * 0.65, z * 0.65));
    },
    deeptech(g) {
      add(g, S(0.22), red(), false);
      [0, Math.PI / 3, -Math.PI / 3].forEach((rz, i) => {
        const p = new THREE.Group(); p.rotation.z = rz; g.add(p);
        const ring = new THREE.Mesh(T(0.9, 0.012), metal()); ring.scale.y = 0.38; p.add(ring);
        const e = new THREE.Mesh(S(0.07, 10, 8), steel()); p.add(e);
        (g.userData.ticks ||= []).push((t) => { const a = t * (1.2 + i * 0.4) + i * 2; e.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9 * 0.38, 0); });
      });
    },
    secure(g) {
      add(g, B(1, 0.8, 0.36), metal()).position.y = -0.3;
      const sh = add(g, T(0.3, 0.07, Math.PI), steel(), false); sh.position.y = 0.1;
      add(g, C(0.09, 0.09, 0.4, 16), red(), false).rotation.x = Math.PI / 2;
      g.children[g.children.length - 1].position.y = -0.24;
    },
    sector(g) {
      const hex = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * 0.56, Math.sin(i * Math.PI / 3) * 0.56])];
      hex.forEach(([x, z], i) => { const h = 0.3 + ((i * 37) % 7) / 10; const m = add(g, C(0.3, 0.3, h, 6), i === 3 ? red() : metal(), true, 0.45); m.position.set(x, h / 2 - 0.4, z); });
      g.rotation.x = 0.5;
    },
    pin(g) {
      add(g, lathe([[0, -0.85], [0.18, -0.4], [0.42, 0.08], [0.46, 0.3], [0.36, 0.6], [0, 0.72]]), metal(), false);
      add(g, S(0.16), red(), false).position.y = 0.3;
      const r = add(g, T(0.42, 0.015), red(), false); r.rotation.x = Math.PI / 2; r.position.y = -0.85;
    },
  };
  const make = (name) => {
    const g = new THREE.Group();
    (B_[name] || B_.ai)(g);
    g.traverse((o) => { if (o.material) o.userData.baseOpacity = o.material.opacity ?? 1; });
    return g;
  };
  return { make, metal, steel, red, line, S, B, C, T };
}

const ICON_LIGHTS = (THREE, scene) => {
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(0xff2a1a, 26, 12); rim.position.set(2.2, -1.6, 2); scene.add(rim);
  const back = new THREE.PointLight(0xff3b2a, 14, 10); back.position.set(-1.5, 1, -2.5); scene.add(back);
};

async function envFor(THREE, renderer) {
  const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pm.dispose();
  return tex;
}

/* =====================================================================
   WebGL: world + icons
   ===================================================================== */
async function world(THREE) {
  const worldCanvas = document.getElementById("w3dWorld");
  const iconCanvas = document.getElementById("w3dIcons");
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return;

  const LIB = library(THREE);
  const DPR = Math.min(devicePixelRatio || 1, tier === 2 ? 1.75 : tier === 1 ? 1.35 : 1.25);

  /* ---------------- world renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas: worldCanvas, antialias: tier > 0, powerPreference: "high-performance" });
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x050505, tier === 0 ? 0.03 : 0.022);
  scene.environment = await envFor(THREE, renderer);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 260);

  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const keyL = new THREE.DirectionalLight(0xffffff, 1.2); keyL.position.set(-6, 10, 8); scene.add(keyL);
  const camRed = new THREE.PointLight(0xff2010, 60, 46, 1.6); scene.add(camRed);
  const camWhite = new THREE.PointLight(0xffffff, 20, 30, 1.8); scene.add(camWhite);

  const GAP = 40, Z0 = 14;
  const sections = [...STORY.querySelectorAll(":scope > section.w3s")];
  const N = sections.length;
  const stationZ = (i) => Z0 - (i + 0.5) * GAP - 13;
  const zEnd = Z0 - N * GAP - 40;

  /* particles */
  const PCOUNT = [700, 1500, 2600][tier];
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(PCOUNT * 3), rnd = new Float32Array(PCOUNT);
  for (let i = 0; i < PCOUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 36;
    pos[i * 3 + 2] = Z0 + 30 - Math.random() * (Z0 + 30 - zEnd);
    rnd[i] = Math.random();
  }
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("aR", new THREE.BufferAttribute(rnd, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: DPR }, uSize: { value: tier === 0 ? 3.4 : 3 } },
    vertexShader: `attribute float aR; uniform float uTime, uPR, uSize; varying float vA, vRed;
      void main(){ vec3 p = position; p.y += sin(uTime*.3 + aR*20.)*.45; p.x += cos(uTime*.22 + aR*12.)*.35;
        vec4 mv = modelViewMatrix*vec4(p,1.); float d = -mv.z;
        gl_PointSize = uSize*uPR*(.55 + aR)*(16./max(d,.1));
        gl_Position = projectionMatrix*mv;
        vA = exp(-d*.026)*smoothstep(.5, 4., d); vRed = step(.74, aR); }`,
    fragmentShader: `varying float vA, vRed;
      void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5, 0., d);
        vec3 c = mix(vec3(.82,.82,.86), vec3(1.,.14,.07), vRed);
        gl_FragColor = vec4(c, a*vA*mix(.42, .95, vRed)); }`,
  });
  scene.add(new THREE.Points(pg, pMat));

  /* light trails: thin tubes with pulses of light running along them */
  const trailMat = (speed, density, alpha = 1) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSpeed: { value: speed }, uDensity: { value: density }, uAlpha: { value: alpha } },
    vertexShader: `varying vec2 vUv; varying float vD;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime, uSpeed, uDensity, uAlpha; varying vec2 vUv; varying float vD;
      void main(){ float p = fract(vUv.x*uDensity - uTime*uSpeed);
        float pulse = pow(p, 14.)*2.6 + pow(p, 3.)*.25; float base = .1;
        float fog = exp(-vD*.02)*smoothstep(.5, 5., vD);
        gl_FragColor = vec4(vec3(1.,.13,.06)*(base+pulse), (base+pulse)*fog*uAlpha); }`,
  });
  const trailMats = [];
  const TRAILS = [3, 4, 5][tier];
  for (let k = 0; k < TRAILS; k++) {
    const pts = [];
    for (let z = Z0 + 30; z >= zEnd; z -= 12) {
      const s = k * 1.7;
      pts.push(new THREE.Vector3(Math.sin(z * 0.018 + s) * (11 + k * 2.2), Math.cos(z * 0.014 + s * 1.3) * (4 + k) - 1, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = trailMat(0.05 + k * 0.012, 7 + k * 2);
    trailMats.push(m);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(900, pts.length * 10), 0.035, 6, false), m));
  }

  /* floor grid */
  const grid = new THREE.GridHelper(900, 225, 0x5a0400, 0x1a0402);
  grid.material.transparent = true; grid.material.opacity = 0.32;
  grid.position.set(0, -10, (Z0 + zEnd) / 2);
  scene.add(grid);

  /* ---------- one object group per chapter ---------- */
  const stations = [];
  const station = (i, build) => {
    const g = new THREE.Group(); g.position.z = stationZ(i); build(g); scene.add(g);
    g.traverse((o) => { if (o.material) o.material.envMapIntensity = 0.9; });
    stations.push(g); return g;
  };
  const spinIt = (o, sx, sy) => ((o.userData.spin = [sx, sy]), o);
  const ids = sections.map((s) => s.id);
  const at = (id) => Math.max(0, ids.indexOf(id));
  const big = (name, s, x, y, z) => { const o = LIB.make(name); o.scale.setScalar(s); o.position.set(x, y, z); return o; };

  // 03 disciplines: their seven objects float around the path
  station(at("coverage"), (g) => {
    const P = [["ai", -13, 4, 0], ["cyber", -14.5, -3, -8], ["cloud", -10, -7, -16], ["iot", 13, 4.2, -2], ["chain", 14.5, -3, -10], ["nano", 10.5, -7, -18], ["consult", 0, 9.5, -14]];
    P.forEach(([n, x, y, z], i) => g.add(spinIt(big(n, 1.9, x, y, z), 0.12 + i * 0.02, 0.25 + i * 0.03)));
  });
  // 04 sectors: a skyline of dark monoliths with red light strips
  station(at("sectors"), (g) => {
    for (let i = 0; i < 13; i++) {
      const side = i % 2 ? 1 : -1, h = 5 + ((i * 53) % 9);
      const m = new THREE.Mesh(LIB.B(1.6, h, 1.6), LIB.metal()); m.position.set(side * (13 + (i % 3) * 3), -10 + h / 2, 6 - i * 3.2); g.add(m);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), LIB.line(0.25)));
      const strip = new THREE.Mesh(LIB.B(0.08, h * 0.8, 0.08), LIB.red()); strip.position.set(-side * 0.82, 0, 0.82); m.add(strip);
    }
  });
  // 05 facts: a gyroscope "data core"
  station(at("facts"), (g) => {
    const core = new THREE.Group(); core.position.set(13, 1, -8); g.add(core);
    [3.4, 2.7, 2.0].forEach((r, i) => { const t = new THREE.Mesh(LIB.T(r, 0.07), i === 1 ? LIB.red() : LIB.steel()); t.rotation.set(i * 1.1, i * 0.7, 0); spinIt(t, 0.2 + i * 0.15, 0.3 - i * 0.08); core.add(t); });
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), LIB.metal()); ico.material.flatShading = true; spinIt(ico, 0.3, 0.4); core.add(ico);
    ico.add(new THREE.LineSegments(new THREE.EdgesGeometry(ico.geometry), LIB.line(0.7)));
    const left = big("sector", 2.4, -14, -4, -14); spinIt(left, 0.05, 0.2); g.add(left);
  });
  // 06 principles: four pillars the camera passes between
  station(at("principles"), (g) => {
    [[-10.5, 4], [10.5, 4], [-10.5, -10], [10.5, -10]].forEach(([x, z]) => {
      const p = new THREE.Mesh(LIB.B(1.5, 18, 1.5), LIB.metal()); p.position.set(x, -1, z); g.add(p);
      p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), LIB.line(0.3)));
      const cap = new THREE.Mesh(LIB.B(1.7, 0.18, 1.7), LIB.red()); cap.position.y = 9; p.add(cap);
      const band = new THREE.Mesh(LIB.B(1.56, 0.06, 1.56), LIB.red()); band.position.y = -2; p.add(band);
    });
  });
  // 07 six moves: a hexagon of nodes joined by light, flown through
  station(at("moves"), (g) => {
    const nodes = Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3 + Math.PI / 6; return new THREE.Vector3(Math.cos(a) * 13, Math.sin(a) * 7.5, -4 + (i % 2) * 3); });
    nodes.forEach((v, i) => {
      const n = new THREE.Mesh(LIB.S(0.75, 28, 18), LIB.metal()); n.position.copy(v); g.add(n);
      const c = new THREE.Mesh(LIB.S(0.32, 16, 12), LIB.red()); n.add(c);
      const halo = new THREE.Mesh(LIB.T(1.15, 0.03), LIB.red()); spinIt(halo, 0.4, 0.6 + i * 0.1); n.add(halo);
      const next = nodes[(i + 1) % 6];
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(v, next), 20, 0.05, 6), trailMat(0.35, 1.2, 1.4));
      trailMats.push(tube.material); g.add(tube);
    });
  });
  // 08 locations: two pins on a map grid joined by an arc of light
  station(at("locations"), (g) => {
    const a = new THREE.Vector3(-11, -7, -2), b = new THREE.Vector3(11, -7, -12);
    g.add(big("pin", 2.2, a.x, a.y + 1.8, a.z)); g.add(big("pin", 2.2, b.x, b.y + 1.8, b.z));
    const arc = new THREE.QuadraticBezierCurve3(a.clone().setY(-4.2), new THREE.Vector3(0, 4, -2), b.clone().setY(-4.2));
    const m = trailMat(0.25, 2, 1.6); trailMats.push(m);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 80, 0.07, 8), m));
    const plate = new THREE.GridHelper(36, 36, 0xe10600, 0x3a0a08); plate.position.set(0, -6.2, -2); plate.material.transparent = true; plate.material.opacity = 0.5; g.add(plate);
  });
  // 09 group: three stacked slabs, this firm's lit red
  station(at("group"), (g) => {
    const stack = new THREE.Group(); stack.position.set(-13, -2, -8); stack.rotation.set(0.35, -0.6, 0); g.add(stack);
    [0, 1, 2].forEach((i) => {
      const s = new THREE.Mesh(LIB.B(6, 0.32, 4), LIB.metal()); s.position.y = i * 1.5;
      if (i === 2) { s.material.color.set(0x3a0503); s.material.emissive.set(0xe10600); s.material.emissiveIntensity = 0.18; }
      s.add(new THREE.LineSegments(new THREE.EdgesGeometry(s.geometry), LIB.line(i === 2 ? 0.9 : 0.35)));
      s.userData.float = i; stack.add(s);
    });
  });
  // 10 transparency: a clear glass cube with a red core
  station(at("transparency"), (g) => {
    const box = new THREE.Group(); box.position.set(13, 1, -8); g.add(box);
    const glass = new THREE.Mesh(LIB.B(5, 5, 5), new THREE.MeshStandardMaterial({ color: 0x223, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false }));
    box.add(glass); glass.add(new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })));
    const core = new THREE.Mesh(LIB.B(1.5, 1.5, 1.5), LIB.red()); spinIt(core, 0.35, 0.5); box.add(core);
    spinIt(box, 0.04, 0.12);
  });
  // 11 finale: the red digital sphere
  const sphereZ = stationZ(N - 1) - 6;
  const finale = new THREE.Group(); finale.position.set(0, 0, sphereZ); scene.add(finale);
  {
    const R = 6.5, n = [1800, 3400, 5200][tier], GA = Math.PI * (3 - Math.sqrt(5));
    const sp = new Float32Array(n * 3), sr = new Float32Array(n);
    for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * GA; sp.set([Math.cos(t) * r * R, y * R, Math.sin(t) * r * R], i * 3); sr[i] = Math.random(); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); sg.setAttribute("aR", new THREE.BufferAttribute(sr, 1));
    const sMat = pMat.clone(); sMat.uniforms = { uTime: pMat.uniforms.uTime, uPR: { value: DPR }, uSize: { value: 2.4 } };
    sMat.vertexShader = sMat.vertexShader.replace("p.y += sin(uTime*.3 + aR*20.)*.45; p.x += cos(uTime*.22 + aR*12.)*.35;", "p *= 1. + sin(uTime*1.4 + aR*30.)*.012;").replace("vRed = step(.74, aR);", "vRed = step(.35, aR);");
    finale.add(new THREE.Points(sg, sMat));
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R * 0.97, 3)), new THREE.LineBasicMaterial({ color: 0xe10600, transparent: true, opacity: 0.16 }));
    finale.add(wire);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.55, 2), LIB.metal()); inner.material.flatShading = true; finale.add(inner);
    inner.add(new THREE.LineSegments(new THREE.EdgesGeometry(inner.geometry), LIB.line(0.4)));
    // soft glow sprite
    const gc = document.createElement("canvas"); gc.width = gc.height = 256;
    const gx = gc.getContext("2d"), grd = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,40,20,.85)"); grd.addColorStop(0.35, "rgba(225,6,0,.32)"); grd.addColorStop(1, "rgba(225,6,0,0)");
    gx.fillStyle = grd; gx.fillRect(0, 0, 256, 256);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
    glow.scale.setScalar(R * 3.6); finale.add(glow);
    [[R * 1.35, 1.2], [R * 1.6, -0.5]].forEach(([r, tilt]) => { const o = new THREE.Mesh(LIB.T(r, 0.025), LIB.red()); o.rotation.set(Math.PI / 2 + tilt * 0.3, tilt, 0); finale.add(o); });
    spinIt(finale, 0.0, 0.08);
    finale.userData.inner = inner; finale.userData.wire = wire;
  }

  /* ---------- post-processing glow (desktop only) ---------- */
  let composer = null;
  if (tier === 2) {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js")]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.55, 0.12));
      composer.addPass(new OutputPass());
    } catch (e) { composer = null; }
  }

  /* ---------------- icon layer ---------------- */
  const icons = [];
  let iconR = null, iconScene = null, iconCam = null;
  try {
    iconR = new THREE.WebGLRenderer({ canvas: iconCanvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    iconR.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    iconR.setClearColor(0x000000, 0);
    iconR.autoClear = false;
    iconR.toneMapping = THREE.ACESFilmicToneMapping;
    iconScene = new THREE.Scene();
    iconScene.environment = await envFor(THREE, iconR);
    ICON_LIGHTS(THREE, iconScene);
    iconCam = new THREE.PerspectiveCamera(32, 1, 0.1, 20); iconCam.position.set(0, 0, 4.4);
    STORY.querySelectorAll(".c3-icon[data-icon]").forEach((el) => {
      const obj = LIB.make(el.dataset.icon);
      obj.visible = false; iconScene.add(obj);
      icons.push({ el, card: el.closest(".c3"), obj, hover: 0, rx: 0, ry: 0, seed: Math.random() * 10 });
    });
  } catch (e) { iconR = null; }

  STORY.classList.add("gl-on");

  /* ---------------- sizing ---------------- */
  let W = 0, H = 0, tops = [], heights = [];
  const measure = () => {
    W = worldCanvas.clientWidth; H = worldCanvas.clientHeight;
    renderer.setSize(W, H, false);
    if (composer) composer.setSize(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    if (iconR) iconR.setSize(innerWidth, innerHeight, false);
    const base = STORY.getBoundingClientRect().top;
    tops = sections.map((s) => s.getBoundingClientRect().top - base);
    heights = sections.map((s) => s.offsetHeight);
  };
  measure();
  addEventListener("resize", measure);
  new ResizeObserver(() => measure()).observe(STORY);

  /* ---------------- input ---------------- */
  let pmx = 0, pmy = 0, mx = 0, my = 0;
  if (fine && !reduce) addEventListener("pointermove", (e) => { pmx = e.clientX / innerWidth - 0.5; pmy = e.clientY / innerHeight - 0.5; }, { passive: true });

  /* ---------------- loop ---------------- */
  let on = false, last = 0, t = 0;
  new IntersectionObserver((en) => {
    const was = on; on = en[0].isIntersecting;
    if (on && !was) { last = 0; requestAnimationFrame(frame); }
  }).observe(STORY);

  const camPos = new THREE.Vector3(0, 0, Z0), camLook = new THREE.Vector3(0, 0, Z0 - 20);
  const tgtPos = new THREE.Vector3(), tgtLook = new THREE.Vector3();
  let fov = 52;
  const smooth = (x) => x * x * (3 - 2 * x);

  function storyProgress() {
    const mid = innerHeight * 0.5 - STORY.getBoundingClientRect().top;
    if (mid <= tops[0]) return 0;
    for (let i = 0; i < N; i++) if (mid < tops[i] + heights[i]) return i + Math.min(1, Math.max(0, (mid - tops[i]) / heights[i]));
    return N;
  }

  function frame(now) {
    if (!on) return;
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (!reduce) t += dt;
    mx += (pmx - mx) * Math.min(1, dt * 3); my += (pmy - my) * Math.min(1, dt * 3);

    // camera: forward through the corridor; in the finale it closes in, then pulls back
    const g = storyProgress();
    let z = Z0 - g * GAP, x = mx * 2.4, y = 0.6 - my * 1.6, look = z - 20, wantFov = 52;
    if (g > N - 1) {
      const u = g - (N - 1);
      const near = sphereZ + 12, far = sphereZ + 30;
      z = u < 0.45 ? THREE.MathUtils.lerp(Z0 - (N - 1) * GAP, near, smooth(u / 0.45)) : THREE.MathUtils.lerp(near, far, smooth((u - 0.45) / 0.55));
      look = sphereZ;
      wantFov = u < 0.45 ? 52 : THREE.MathUtils.lerp(52, 62, smooth((u - 0.45) / 0.55));
    }
    tgtPos.set(x, y, z); tgtLook.set(x * 0.4, 0, look);
    const k = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
    camPos.lerp(tgtPos, k); camLook.lerp(tgtLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    if (Math.abs(fov - wantFov) > 0.01) { fov += (wantFov - fov) * k; camera.fov = fov; camera.updateProjectionMatrix(); }
    camRed.position.set(camPos.x + 4, camPos.y - 2, camPos.z - 14);
    camWhite.position.set(camPos.x - 5, camPos.y + 4, camPos.z - 6);

    pMat.uniforms.uTime.value = t;
    trailMats.forEach((m) => { m.uniforms.uTime.value = t; });
    stations.forEach((s) => {
      if (Math.abs(s.position.z - camPos.z) > 120) return;
      s.traverse((o) => {
        if (o.userData.spin) { o.rotation.x += o.userData.spin[0] * dt; o.rotation.y += o.userData.spin[1] * dt; }
        if (o.userData.float !== undefined) o.position.y = o.userData.float * 1.5 + Math.sin(t * 0.8 + o.userData.float) * 0.18;
        if (o.userData.ticks) o.userData.ticks.forEach((f) => f(t));
      });
    });
    if (Math.abs(finale.position.z - camPos.z) < 140) {
      finale.rotation.y += 0.08 * dt;
      finale.userData.inner.rotation.x -= 0.1 * dt;
      const pulse = 1 + Math.sin(t * 1.3) * 0.015; finale.scale.setScalar(pulse);
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
    drawIcons(dt);
  }

  /* ---------------- icons: one scissored viewport per visible slot ---------------- */
  function drawIcons(dt) {
    if (!iconR) return;
    iconR.setScissorTest(false);
    iconR.clear();
    const vw = innerWidth, vh = innerHeight;
    for (const ic of icons) {
      const r = ic.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || r.width < 4) { ic.obj.visible = false; continue; }
      const op = +getComputedStyle(ic.card).opacity;
      if (op < 0.03) continue;
      const hov = ic.card.classList.contains("is-hover") || ic.card.classList.contains("open") ? 1 : 0;
      ic.hover += (hov - ic.hover) * Math.min(1, dt * 5);
      // rotate gently; faster and toward the pointer while hovered
      ic.ry += dt * (reduce ? 0 : 0.45 + ic.hover * 1.4);
      const tx = ic.hover * (my * 0.9), ty = ic.hover * (mx * 1.2);
      ic.rx += (tx + Math.sin(t * 0.6 + ic.seed) * 0.12 - ic.rx) * Math.min(1, dt * 4);
      ic.obj.rotation.set(ic.rx + 0.2, ic.ry + ty, 0);
      ic.obj.scale.setScalar(1 + ic.hover * 0.12);
      if (ic.obj.userData.ticks) ic.obj.userData.ticks.forEach((f) => f(t + ic.seed));
      ic.obj.traverse((o) => { if (o.material) o.material.opacity = o.userData.baseOpacity * op; });
      // pad the viewport so spinning objects aren't clipped by the slot
      const pad = r.width * 0.25, size = r.width + pad * 2;
      const left = r.left - pad, bottom = vh - r.bottom - pad;
      iconR.setViewport(left, bottom, size, size);
      iconR.setScissor(left, bottom, size, size);
      iconR.setScissorTest(true);
      icons.forEach((o) => { o.obj.visible = o === ic; });
      iconCam.aspect = 1; iconCam.updateProjectionMatrix();
      iconR.render(iconScene, iconCam);
    }
  }
  requestAnimationFrame(frame);
}
