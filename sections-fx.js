/* RPTN section FX: deck swap, per-character fade, video spotlight, card deal, cursor image reveal,
   check marks + scan line, glitch-in, text scramble and magnetic buttons */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const once = (els, fn, opts = {}) => {
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(fn); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); }
    }), { rootMargin: opts.margin || "0px 0px -12% 0px", threshold: opts.threshold || 0.1 });
    els.forEach((el) => io.observe(el));
  };
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  /* ---------- Per-character staggered fade (StaggeredFade from the spec) ---------- */
  $$("[data-chars]").forEach((el) => {
    let ci = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const wd = document.createElement("span");
          wd.className = "wd";
          [...part].forEach((ch) => {
            const s = document.createElement("span");
            s.className = "ch";
            s.style.setProperty("--ci", ci++);
            s.textContent = ch;
            wd.appendChild(s);
          });
          frag.appendChild(wd);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  });
  once($$("[data-chars]"), (el) => el.classList.add("in"));

  /* ---------- Positioning: 3D coverflow turns to the card in view ---------- */
  const deck = document.getElementById("deck");
  if (deck) {
    const imgs = deck.dataset.imgs.split("|");
    const rows = deck.querySelector(".prism-rows");
    const caps = $$(".pc", deck), bars = $$(".prism-bar i", deck), items = $$("[data-deck]");
    const list = document.getElementById("posList");
    rows.innerHTML = imgs.map((src) => `<figure class="pv"><img src="${src}" alt="" decoding="async"></figure>`).join("");
    const views = $$(".pv", rows);

    const embers = deck.querySelector(".prism-embers");
    if (!reduce) embers.innerHTML = Array.from({ length: 16 }, () => {
      const r = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
      return `<i style="--x:${r(2, 96)}%;--s:${r(3, 8)}px;--d:${r(5, 10)}s;--t:${r(-10, 0)}s;--dx:${r(-40, 40)}px"></i>`;
    }).join("");

    let active = -1;
    const show = (i) => {
      if (i === active) return;
      active = i;
      // -1 = left behind, 0 = front, 1 = right behind
      views.forEach((v, k) => { v.dataset.pos = ((k - i + 4) % 3) - 1; });
      caps.forEach((c, k) => { c.classList.toggle("out", c.classList.contains("on") && k !== i); c.classList.toggle("on", k === i); });
      bars.forEach((b, k) => b.classList.toggle("on", k <= i));
      items.forEach((it, k) => it.classList.toggle("on", k === i));
      if (list) list.classList.add("has-on");
      deck.classList.remove("flash"); void deck.offsetWidth; deck.classList.add("flash");
    };
    show(0);
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) show(+en.target.dataset.deck);
    }), { rootMargin: "-45% 0px -45% 0px" });
    views.forEach((v, k) => v.addEventListener("click", () => show(k)));
    items.forEach((it) => {
      io.observe(it);
      if (fine) it.addEventListener("pointerenter", () => show(+it.dataset.deck));
    });

    // pointer parallax on the prism
    if (fine && !reduce) {
      deck.addEventListener("pointermove", (e) => {
        const r = deck.getBoundingClientRect();
        deck.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        deck.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      }, { passive: true });
      deck.addEventListener("pointerleave", () => { deck.style.setProperty("--px", 0); deck.style.setProperty("--py", 0); });
    }
  }

  /* ---------- Principles: cards dealt from a stack + image reveal from the cursor ---------- */
  const deals = $$(".deal");
  if (deals.length) {
    const grid = deals[0].parentElement;
    const rots = [-14, 10, -7, 13];
    // layout offsets ignore the deal translate, so re-aiming after a resize stays correct
    const aim = () => {
      const gx = grid.offsetLeft + grid.offsetWidth / 2, gy = grid.offsetTop + grid.offsetHeight / 2;
      deals.forEach((d, i) => {
        if (d.classList.contains("in")) return;
        d.style.setProperty("--dx", `${(gx - (d.offsetLeft + d.offsetWidth / 2)).toFixed(1)}px`);
        d.style.setProperty("--dy", `${(gy - (d.offsetTop + d.offsetHeight / 2) + 60).toFixed(1)}px`);
        d.style.setProperty("--rot", `${rots[i % rots.length]}deg`);
        d.style.setProperty("--delay", `${i * 0.12}s`);
      });
    };
    aim();
    addEventListener("resize", aim);
    once([grid], () => deals.forEach((d) => d.classList.add("in")), { margin: "0px 0px -20% 0px" });
    deals.forEach((d) => d.addEventListener("pointermove", (e) => {
      const r = d.getBoundingClientRect();
      d.style.setProperty("--cx", `${e.clientX - r.left}px`);
      d.style.setProperty("--cy", `${e.clientY - r.top}px`);
    }, { passive: true }));
  }

  /* ---------- Route + transparency scan + glitch-in ---------- */
  once($$(".route"), (el) => el.classList.add("in"));
  const transp = document.querySelector(".transp");
  if (transp) {
    transp.querySelectorAll("li").forEach((li) => {
      li.insertAdjacentHTML("beforeend", '<svg class="chk" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>');
    });
    once([transp], (el) => el.classList.add("scan"), { margin: "0px 0px -25% 0px" });
  }
  once($$(".glitchin"), (el) => el.classList.add("in"));

  /* ---------- Intro: corporate markers decode like a terminal ---------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+·";
  const scramble = (el) => {
    const final = el.textContent;
    if (reduce) return;
    let frame = 0;
    const total = 26 + Math.floor(Math.random() * 14);
    const tick = () => {
      const p = frame / total;
      el.textContent = [...final].map((ch, i) => (ch === " " || i < p * final.length) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join("");
      if (++frame <= total) requestAnimationFrame(tick); else el.textContent = final;
    };
    tick();
  };
  once($$("[data-scramble]"), (box) => box.querySelectorAll("li").forEach((li, i) => setTimeout(() => scramble(li), 350 + i * 140)));

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduce) {
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        b.style.translate = `${(x * 0.28).toFixed(1)}px ${(y * 0.4).toFixed(1)}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }
})();

/* Second section: entrance, video, scroll parallax (text drifts up + fades, globe dims),
   and scroll-driven word reveal */
(() => {
  const sec = document.querySelector(".intro2");
  if (!sec) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const text = document.getElementById("i2Text");
  const terrain = document.getElementById("i2Terrain");
  const globe = document.getElementById("globe");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // staggered entrance when the section arrives
  new IntersectionObserver((en, io) => {
    if (en[0].isIntersecting) { sec.classList.add("go"); io.disconnect(); }
  }, { threshold: 0.15 }).observe(sec);

  // signal terrain: a dotted 3D landscape flowing toward the viewer, with a radar sweep,
  // data pulses running along the rows and a ripple that follows the pointer
  if (terrain) {
    const ctx = terrain.getContext("2d");
    const COLS = 120, ROWS = 72, Z0 = 1.4, Z1 = 12, CAM = 1;
    const pulses = Array.from({ length: 7 }, () => ({ r: (Math.random() * ROWS * 0.7) | 0, x: Math.random() * 2 - 1, s: (0.12 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1) }));
    let W = 0, H = 0, F = 0, HY = 0, dpr = 1, t = 0, on = false, mx = 0, my = 0.5, tmx = 0, tmy = 0.5;
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = terrain.clientWidth; H = terrain.clientHeight;
      terrain.width = W * dpr; terrain.height = H * dpr;
      F = Math.max(W * 0.55, H * 1.1); HY = H * 0.2;
    };
    const height = (x, z) => {
      const wz = z + t * 0.9;
      let y = 0.3 * Math.sin(x * 0.9 + wz * 0.7) + 0.2 * Math.sin(x * 2.1 - wz * 1.3 + t * 0.5) + 0.12 * Math.sin((x + wz) * 2.9);
      // pointer ripple
      const dx = x - mx * 4, dz = z - (Z0 + 1 + (1 - my) * 4), d = Math.sqrt(dx * dx + dz * dz);
      return y + 0.35 * Math.exp(-d * d * 0.6) * Math.cos(d * 5 - t * 4);
    };
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      const sweep = Z1 - ((t * 1.6) % (Z1 - Z0 + 3));
      for (let r = ROWS - 1; r >= 0; r--) {
        const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1));
        const fog = Math.pow(1 - (z - Z0) / (Z1 - Z0), 0.9);
        const glow = Math.max(0, 1 - Math.abs(z - sweep) / 0.7);
        ctx.beginPath();
        let started = false;
        // every row spans the screen width, so near rows stay as dense as far ones
        const span = (z * (W / 2 + 40)) / F;
        for (let c = 0; c < COLS; c++) {
          const x = (c / (COLS - 1)) * 2 * span - span;
          const sx = W / 2 + (x / z) * F;
          const y = height(x, z);
          const sy = HY + ((CAM - y) / z) * F;
          started ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
          started = true;
          const k = Math.min(1, Math.max(0, (y + 0.45) / 0.9));
          const a = fog * (0.4 + 0.6 * k) + glow * 0.6;
          ctx.fillStyle = `rgba(${Math.round(90 + 165 * k)},${Math.round(90 - 60 * k + glow * 60)},${Math.round(95 - 75 * k)},${Math.min(1, a).toFixed(3)})`;
          const s = (1 + 1.8 * k + glow * 1.5) * (Z0 / z) * 1.5 + 0.7;
          ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
        }
        ctx.strokeStyle = `rgba(225,6,0,${(fog * 0.14 + glow * 0.35).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // data pulses with a short trail
      ctx.shadowColor = "#ff2a1a";
      pulses.forEach((p) => {
        p.x += p.s * 0.016;
        if (Math.abs(p.x) > 1) { p.x = -Math.sign(p.s); p.r = (Math.random() * ROWS * 0.7) | 0; }
        const z = Z0 + (Z1 - Z0) * (p.r / (ROWS - 1));
        const fog = Math.pow(1 - (z - Z0) / (Z1 - Z0), 0.7);
        for (let k = 0; k < 8; k++) {
          const x = (p.x - Math.sign(p.s) * k * 0.012) * z * (W / 2 / F);
          const y = height(x, z);
          const sx = W / 2 + (x / z) * F, sy = HY + ((CAM - y) / z) * F;
          ctx.shadowBlur = k ? 0 : 16;
          ctx.fillStyle = `rgba(255,${k ? 40 : 90},${k ? 26 : 60},${(fog * (1 - k / 8)).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(sx, sy, (k ? 2.2 : 3.4) * (Z0 / z) * 1.5 + 0.8, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.shadowBlur = 0;
    };
    let last = 0;
    const loop = (now) => {
      if (!on) return;
      // real time, so the speed is the same at any frame rate
      t += last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      draw();
      requestAnimationFrame(loop);
    };
    size();
    addEventListener("resize", () => { size(); if (!on) draw(); });
    terrain.parentElement.addEventListener("pointermove", (e) => {
      const b = terrain.getBoundingClientRect();
      tmx = (e.clientX - b.left) / b.width - 0.5; tmy = (e.clientY - b.top) / b.height;
    }, { passive: true });
    draw();
    // only animates while on screen
    new IntersectionObserver((en) => {
      const was = on;
      on = en[0].isIntersecting && !reduce;
      if (on && !was) { last = 0; requestAnimationFrame(loop); }
    }, { rootMargin: "100px 0px" }).observe(terrain);
  }

  // beside the quote: one constant glowing core, while its particle shell morphs
  // sphere -> cube -> torus -> double helix ("the discipline is constant; the shape it takes is not")
  const morph = document.getElementById("i2Morph");
  if (morph) {
    const ctx = morph.getContext("2d");
    const tag = document.getElementById("i2MorphTag");
    const N = 1400, GA = Math.PI * (3 - Math.sqrt(5));
    const sphere = (i) => {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * GA;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    const g = Math.ceil(Math.sqrt(N / 6));
    const cube = (i) => {
      const f = i % 6, k = (i / 6) | 0;
      const u = ((k % g) / (g - 1)) * 2 - 1, v = (((k / g) | 0) / (g - 1)) * 2 - 1, s = 0.72;
      const p = [[1, u, v], [-1, u, v], [u, 1, v], [u, -1, v], [u, v, 1], [u, v, -1]][f];
      return [p[0] * s, p[1] * s, p[2] * s];
    };
    const torus = (i) => {
      const u = ((i % 70) / 70) * Math.PI * 2, v = (((i / 70) | 0) / 20) * Math.PI * 2;
      return [(0.72 + 0.3 * Math.cos(v)) * Math.cos(u), 0.3 * Math.sin(v), (0.72 + 0.3 * Math.cos(v)) * Math.sin(u)];
    };
    const helix = (i) => {
      const t = i / N, a = t * Math.PI * 7, y = t * 2.2 - 1.1;
      if (i % 9 === 0) { // rungs between the two strands
        const m = ((i * 0.618) % 1) * 2 - 1;
        return [Math.cos(a) * 0.5 * m, y, Math.sin(a) * 0.5 * m];
      }
      const s = i % 2 ? Math.PI : 0;
      return [Math.cos(a + s) * 0.5, y, Math.sin(a + s) * 0.5];
    };
    const SHAPES = [sphere, cube, torus, helix].map((fn) => Array.from({ length: N }, (_, i) => fn(i)));
    const LABELS = ["Financial services", "Manufacturing", "Public sector", "Healthcare"];
    const HOLD = 2.8, MOVE = 1.6;
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    let W = 0, H = 0, R = 0, dpr = 1, t = 0, on = false, mx = 0, my = 0, tmx = 0, tmy = 0, shown = 0;
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = morph.clientWidth; H = morph.clientHeight;
      morph.width = W * dpr; morph.height = H * dpr;
      R = Math.min(W, H) * 0.34;
    };
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      const cyc = t % ((HOLD + MOVE) * SHAPES.length);
      const idx = Math.floor(cyc / (HOLD + MOVE)), local = cyc - idx * (HOLD + MOVE);
      const from = SHAPES[idx], to = SHAPES[(idx + 1) % SHAPES.length];
      const p = local < HOLD ? 0 : (local - HOLD) / MOVE;
      const label = p > 0.5 ? (idx + 1) % SHAPES.length : idx;
      if (tag && label !== shown) { shown = label; tag.textContent = LABELS[label]; }
      const ay = t * 0.35 + mx * 0.8, ax = -0.35 + my * 0.5;
      const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      const pulse = 1 + Math.sin(t * 2.2) * 0.08;

      // the constant: a glowing core that never changes shape
      const cg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R * 0.55 * pulse);
      cg.addColorStop(0, "rgba(255,70,50,0.95)"); cg.addColorStop(0.18, "rgba(225,6,0,0.55)"); cg.addColorStop(1, "rgba(225,6,0,0)");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(W / 2, H / 2, R * 0.55 * pulse, 0, Math.PI * 2); ctx.fill();

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < N; i++) {
        // each particle leaves a touch later than the last, so the shell flows rather than snaps
        const e = ease(Math.min(1, Math.max(0, (p - (i / N) * 0.35) / 0.65)));
        const a = from[i], b = to[i];
        const swirl = Math.sin(e * Math.PI) * 0.25;
        let x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e, z = a[2] + (b[2] - a[2]) * e;
        x *= 1 + swirl; z *= 1 + swirl;
        let X = x * cy + z * sy, Z = -x * sy + z * cy;
        const Y = y * cx - Z * sx; Z = y * sx + Z * cx;
        const f = 3 / (3 - Z), depth = (Z + 1.2) / 2.4;
        const s = (0.8 + depth * 1.6) * f;
        ctx.fillStyle = `rgba(${Math.round(200 + 55 * depth)},${Math.round(20 + 70 * depth * depth)},${Math.round(10 + 50 * depth * depth)},${(0.18 + depth * 0.7).toFixed(3)})`;
        ctx.fillRect(W / 2 + X * R * f - s / 2, H / 2 + Y * R * f - s / 2, s, s);
      }
      ctx.globalCompositeOperation = "source-over";

      // orbit ring around the whole object
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const a = (k / 120) * Math.PI * 2, x = Math.cos(a) * 1.45, z = Math.sin(a) * 1.45;
        const X = x * cy + z * sy, Z0 = -x * sy + z * cy, Y = -Z0 * Math.sin(ax + 0.5), Z = Z0 * Math.cos(ax + 0.5);
        const f = 3 / (3 - Z);
        k ? ctx.lineTo(W / 2 + X * R * f, H / 2 + Y * R * f) : ctx.moveTo(W / 2 + X * R * f, H / 2 + Y * R * f);
      }
      ctx.strokeStyle = "rgba(225,6,0,0.28)"; ctx.lineWidth = 1; ctx.stroke();
    };
    let last = 0;
    const loop = (now) => {
      if (!on) return;
      // real time, so the speed is the same at any frame rate
      t += last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      draw();
      requestAnimationFrame(loop);
    };
    size();
    addEventListener("resize", () => { size(); if (!on) draw(); });
    addEventListener("pointermove", (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
    draw();
    new IntersectionObserver((en) => {
      const was = on;
      on = en[0].isIntersecting && !reduce;
      if (on && !was) { last = 0; requestAnimationFrame(loop); }
    }, { rootMargin: "100px 0px" }).observe(morph);
  }

  // word reveal: split into words, light each one in sequence
  const box = sec.querySelector("[data-scrollwords]");
  const words = [];
  const walk = (node, accent) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/\s+/).filter(Boolean).forEach((w) => {
        const s = document.createElement("span");
        s.className = "sw";
        s.textContent = w;
        s.dataset.acc = accent ? "1" : "";
        frag.appendChild(s);
        words.push(s);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && !n.classList.contains("i2-close")) walk(n, accent || n.tagName === "EM");
  });
  walk(box, false);
  // move each <em>'s words out so every word is a direct flex item
  box.querySelectorAll("em").forEach((em) => em.replaceWith(...em.childNodes));

  let ticking = false;
  function update() {
    ticking = false;
    const vh = innerHeight;
    // 1) text: stays solid until it reaches the top, then drifts up and fades as it leaves
    const sr = sec.getBoundingClientRect();
    const textBottom = sr.top + text.offsetTop + text.offsetHeight;
    const keep = clamp(textBottom / (vh * 0.55));
    text.style.transform = `translate3d(0, ${(-(1 - keep) * 120).toFixed(1)}px, 0)`;
    text.style.opacity = keep.toFixed(3);
    // 2) globe dims with the text
    if (globe) globe.style.opacity = (0.3 + 0.7 * keep).toFixed(3);
    // word reveal: offset ["start end", "end center"]
    const r = box.getBoundingClientRect();
    const q = clamp((vh - r.top) / (r.height + vh / 2));
    const total = words.length;
    words.forEach((w, i) => {
      const t = reduce ? 1 : clamp(q * total - i);
      w.style.opacity = (0.2 + 0.8 * t).toFixed(3);
      // grey (89,89,89) -> white, or -> RPTN red (225,6,0) for accent words
      const to = w.dataset.acc ? [225, 6, 0] : [255, 255, 255];
      w.style.color = `rgb(${to.map((v) => Math.round(89 + (v - 89) * t)).join(", ")})`;
    });
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
})();
