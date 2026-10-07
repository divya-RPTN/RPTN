/* RPTN shared behaviour: menu, cursor, scroll progress, 3D reveals, tilt cards */
(() => {
  const body = document.body;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const ownChrome = !body.classList.contains("page"); // homepage runs its own menu + cursor

  /* ---------- Menu ---------- */
  const menu = ownChrome ? null : document.getElementById("menu");
  const menuBtn = ownChrome ? null : document.getElementById("menuBtn");
  function setMenu(open) {
    body.classList.toggle("menu", open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (menu) menu.setAttribute("aria-hidden", String(!open));
  }
  if (menuBtn) menuBtn.addEventListener("click", () => setMenu(!body.classList.contains("menu")));
  if (menu) menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  if (!ownChrome) addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Scroll progress ---------- */
  const bar = document.querySelector(".progress");
  if (bar) {
    const upd = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
  }

  /* ---------- Split headings into words for 3D reveal ---------- */
  document.querySelectorAll("[data-words]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.classList.add("words");
  });

  /* ---------- Reveal on scroll ---------- */
  const targets = document.querySelectorAll(".reveal, .words");
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- Tilt cards ---------- */
  if (fine && !reduce) {
    document.querySelectorAll(".tilt").forEach((el) => {
      const max = parseFloat(el.dataset.tilt || "9");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add("hovering");
        el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
        el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("hovering");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Cursor ---------- */
  const dot = document.getElementById("dot");
  if (dot && fine && !ownChrome) {
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.classList.toggle("wide", !!e.target.closest("a, button, .tilt, .flip, [data-cursor]"));
    }, { passive: true });
    (function follow() {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(follow);
    })();
  }

  window.RPTN = { reduce, fine };
})();
