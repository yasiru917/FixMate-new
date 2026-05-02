/* ── Page Loader ──────────────────────────────────────────── */
window.addEventListener("load", () => {
  setTimeout(() => {
    document.body.classList.add("loaded");
  }, 1150);
});

/* ── Hamburger Menu ───────────────────────────────────────── */
const hamburgerBtn = document.getElementById("hamburger-btn");
const mobileDrawer = document.getElementById("mobile-drawer");
const hamburgerLines = hamburgerBtn.querySelectorAll(".hamburger-line");
let menuOpen = false;

function openMenu() {
  menuOpen = true;
  mobileDrawer.style.maxHeight = mobileDrawer.scrollHeight + "px";
  mobileDrawer.style.opacity = "1";
  mobileDrawer.setAttribute("aria-hidden", "false");
  hamburgerBtn.setAttribute("aria-expanded", "true");
  // Animate to ✕
  hamburgerLines[0].style.transform = "translateY(7px) rotate(45deg)";
  hamburgerLines[1].style.opacity = "0";
  hamburgerLines[1].style.transform = "scaleX(0)";
  hamburgerLines[2].style.transform = "translateY(-7px) rotate(-45deg)";
}

function closeMenu() {
  menuOpen = false;
  mobileDrawer.style.maxHeight = "0";
  mobileDrawer.style.opacity = "0";
  mobileDrawer.setAttribute("aria-hidden", "true");
  hamburgerBtn.setAttribute("aria-expanded", "false");
  // Animate back to ☰
  hamburgerLines[0].style.transform = "";
  hamburgerLines[1].style.opacity = "";
  hamburgerLines[1].style.transform = "";
  hamburgerLines[2].style.transform = "";
}

hamburgerBtn.addEventListener("click", () =>
  menuOpen ? closeMenu() : openMenu(),
);

// Close on link click
mobileDrawer.querySelectorAll("a, button").forEach((el) => {
  el.addEventListener("click", closeMenu);
});

// Close on outside click
document.addEventListener("click", (e) => {
  if (
    menuOpen &&
    !hamburgerBtn.contains(e.target) &&
    !mobileDrawer.contains(e.target)
  ) {
    closeMenu();
  }
});

/* ── Scroll-triggered Reveal ──────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
);

document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

/* ── Nav Shadow on Scroll ─────────────────────────────────── */
const topNav = document.getElementById("top-nav");
if (topNav) {
  const navScrollObserver = new IntersectionObserver(
    ([entry]) => topNav.classList.toggle("nav-scrolled", !entry.isIntersecting),
    { rootMargin: "-1px 0px 0px 0px", threshold: 1 },
  );
  const sentinel = document.createElement("div");
  sentinel.style.cssText =
    "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;";
  document.body.prepend(sentinel);
  navScrollObserver.observe(sentinel);
}

/* ── Bottom Nav Active State ──────────────────────────────── */
document.querySelectorAll(".bottom-nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document
      .querySelectorAll(".bottom-nav-item")
      .forEach((i) => i.classList.remove("bottom-nav-item-active"));
    item.classList.add("bottom-nav-item-active");
  });
});
