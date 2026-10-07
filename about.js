/* RPTN About section: hero globe (sections 3+ are driven by world.js) */
(() => {
  const { reduce } = window.RPTN;
  const D2R = Math.PI / 180;

  /* ================= HERO: 3D particle globe ================= */
  const cv = document.getElementById("globe");
  const ctx = cv.getContext("2d");
  const N = 950, pts = [];
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * GA;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  // great-circle arcs with travelling pulses
  const arcs = Array.from({ length: 9 }, () => {
    const a = pts[(Math.random() * N) | 0], b = pts[(Math.random() * N) | 0];
    return { a, b, t: Math.random(), s: 0.0025 + Math.random() * 0.004 };
  });
  const slerp = (a, b, t) => {
    const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const w = Math.acos(d), sw = Math.sin(w) || 1;
    const k1 = Math.sin((1 - t) * w) / sw, k2 = Math.sin(t * w) / sw;
    const lift = 1 + Math.sin(Math.PI * t) * 0.22;
    return [(a[0] * k1 + b[0] * k2) * lift, (a[1] * k1 + b[1] * k2) * lift, (a[2] * k1 + b[2] * k2) * lift];
  };
  let W = 0, H = 0, R = 0, dpr = 1, rotY = 0, tiltX = -0.32, mx = 0, my = 0, tmx = 0, tmy = 0, visible = true;
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    R = Math.min(W, H) * 0.36;
  }
  size();
  addEventListener("resize", size);
  addEventListener("pointermove", (e) => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(cv);

  function proj(p, cy, sy, cx, sx) {
    let x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy;
    let y = p[1] * cx - z * sx; z = p[1] * sx + z * cx;
    const f = 3.2 / (3.2 - z);
    return [W / 2 + x * R * f, H / 2 + y * R * f, z, f];
  }
  function drawGlobe() {
    requestAnimationFrame(drawGlobe);
    if (!visible) return;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    if (!reduce) rotY += 0.0024;
    const ay = rotY + mx * 0.6, ax = tiltX + my * 0.35;
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // core glow
    const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.1, W / 2, H / 2, R * 1.35);
    g.addColorStop(0, "rgba(225,6,0,0.20)"); g.addColorStop(0.6, "rgba(225,6,0,0.05)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, H / 2, R * 1.35, 0, Math.PI * 2); ctx.fill();

    // orbit rings
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let s = 0; s <= 96; s++) {
        const a = (s / 96) * Math.PI * 2, rr = 1.28 + k * 0.16;
        const tilt = 0.5 + k * 0.45;
        const p = proj([Math.cos(a) * rr, Math.sin(a) * rr * Math.sin(tilt) * 0.35, Math.sin(a) * rr * Math.cos(tilt)], cy, sy, cx, sx);
        s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.strokeStyle = k === 1 ? "rgba(244,242,239,0.08)" : "rgba(225,6,0,0.22)";
      ctx.lineWidth = 1; ctx.stroke();
      // satellite
      const a = rotY * (2 + k) + k * 2;
      const rr = 1.28 + k * 0.16, tilt = 0.5 + k * 0.45;
      const p = proj([Math.cos(a) * rr, Math.sin(a) * rr * Math.sin(tilt) * 0.35, Math.sin(a) * rr * Math.cos(tilt)], cy, sy, cx, sx);
      ctx.fillStyle = "#ff2a1a"; ctx.shadowColor = "#ff2a1a"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.6 * p[3], 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }

    // points
    for (let i = 0; i < N; i++) {
      const p = proj(pts[i], cy, sy, cx, sx);
      const depth = (p[2] + 1) / 2;
      const r = (0.5 + depth * 1.5) * p[3];
      if (depth > 0.55) ctx.fillStyle = `rgba(255,${Math.round(40 + depth * 60)},${Math.round(20 + depth * 30)},${0.25 + depth * 0.75})`;
      else ctx.fillStyle = `rgba(244,242,239,${0.05 + depth * 0.16})`;
      ctx.fillRect(p[0] - r / 2, p[1] - r / 2, r, r);
    }

    // arcs + pulses
    arcs.forEach((arc) => {
      ctx.beginPath();
      for (let s = 0; s <= 40; s++) {
        const p = proj(slerp(arc.a, arc.b, s / 40), cy, sy, cx, sx);
        s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.strokeStyle = "rgba(225,6,0,0.28)"; ctx.lineWidth = 1; ctx.stroke();
      if (!reduce) arc.t = (arc.t + arc.s) % 1;
      const p = proj(slerp(arc.a, arc.b, arc.t), cy, sy, cx, sx);
      ctx.fillStyle = "#fff"; ctx.shadowColor = "#e10600"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.2 * p[3], 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
  }
  drawGlobe();

})();
