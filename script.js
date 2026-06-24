/* Ozey homepage — interactions */
(() => {
  document.documentElement.classList.add("js");
  const nav = document.querySelector(".masthead") || document.getElementById("nav");
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (y > 8) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const reveals = document.querySelectorAll(".reveal");
  const vh = window.innerHeight;
  reveals.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < vh - 40) el.classList.add("in");
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => { if (!el.classList.contains("in")) io.observe(el); });
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }
  const tabs = document.querySelectorAll(".showcase-tab");
  const frames = document.querySelectorAll(".showcase-frame");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", "false"));
    t.setAttribute("aria-selected", "true");
    const target = t.dataset.target;
    frames.forEach((f) => f.classList.toggle("active", f.id === target));
  }));
})();
