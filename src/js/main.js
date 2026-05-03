import { supabase } from "./auth.js";

/* ── Auth State ───────────────────────────────────────────── */
/**
 * Called whenever session changes (login, logout, page load).
 * Shows/hides guest vs user UI in both desktop and mobile nav.
 */
function applyAuthState(session) {
  const user = session?.user ?? null;

  const guestEls = document.querySelectorAll(".nav-guest");
  const userEls = document.querySelectorAll(".nav-user");

  if (user) {
    // Show user UI, hide guest UI
    guestEls.forEach((el) => (el.style.display = "none"));
    userEls.forEach((el) => (el.style.display = "flex"));

    // Build initials from email (e.g. "jo" → "J")
    const initials = (user.email?.[0] ?? "?").toUpperCase();
    const label = user.email ?? "Account";

    document
      .querySelectorAll(".user-avatar")
      .forEach((el) => (el.textContent = initials));
    // Only update the mobile drawer label (desktop nav shows avatar initial only)
    const mobileLabel = document.getElementById("user-label-mobile");
    if (mobileLabel) mobileLabel.textContent = label;
  } else {
    // Show guest UI, hide user UI
    // Use "flex" explicitly — clearing to "" would fall back to CSS `.nav-guest { display:none }`
    guestEls.forEach((el) => (el.style.display = "flex"));
    userEls.forEach((el) => (el.style.display = "none"));
  }
}

// Check session on page load
supabase.auth.getSession().then(({ data }) => {
  applyAuthState(data.session);
});

// React to login / logout in real time (even across tabs)
supabase.auth.onAuthStateChange((_event, session) => {
  applyAuthState(session);
  if (_event === "SIGNED_IN") closeAuthModal();
});

/* ── Auth Modal ───────────────────────────────────────────── */
const authModal = document.getElementById("auth-modal");

function openAuthModal() {
  authModal.classList.remove("hidden");
  document.getElementById("modal-email").focus();
}
function closeAuthModal() {
  authModal.classList.add("hidden");
  document.getElementById("modal-login-form").reset();
  clearModalErrors();
}

// Open triggers — desktop Login, mobile Login, bottom-nav Profile (guest)
document
  .getElementById("login-btn-desktop")
  .addEventListener("click", openAuthModal);
document
  .getElementById("login-btn-mobile")
  .addEventListener("click", openAuthModal);

document.getElementById("bottom-nav-profile").addEventListener("click", () => {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) {
      window.location.href = "profile.html"; // 🔁 update when you build the profile page
    } else {
      openAuthModal();
    }
  });
});

// Close on X button
document.getElementById("close-auth").addEventListener("click", closeAuthModal);

// Close on backdrop click
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !authModal.classList.contains("hidden"))
    closeAuthModal();
});

/* ── Modal: Password toggle ───────────────────────────────── */
document.querySelectorAll(".modal-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
  });
});

/* ── Modal: Form helpers ──────────────────────────────────── */
function showModalError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearModalErrors() {
  document
    .querySelectorAll(".modal-error")
    .forEach((el) => (el.textContent = ""));
}

/* ── Modal: Login form ────────────────────────────────────── */
const modalForm = document.getElementById("modal-login-form");
const modalSubmitBtn = document.getElementById("modal-submit-btn");

modalForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearModalErrors();

  const email = document.getElementById("modal-email").value.trim();
  const password = document.getElementById("modal-password").value;

  let hasError = false;
  if (!email) {
    showModalError("modal-email-err", "Email is required.");
    hasError = true;
  }
  if (!password) {
    showModalError("modal-password-err", "Password is required.");
    hasError = true;
  }
  if (hasError) return;

  modalSubmitBtn.disabled = true;
  modalSubmitBtn.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  modalSubmitBtn.disabled = false;
  modalSubmitBtn.textContent = "Sign in";

  if (error) {
    showModalError("modal-password-err", "Incorrect email or password.");
    return;
  }
  // ✅ onAuthStateChange above handles closing the modal and updating the nav
});

/* ── Modal: Forgot password ───────────────────────────────── */
document
  .getElementById("modal-forgot-btn")
  .addEventListener("click", async () => {
    const email = document.getElementById("modal-email").value.trim();
    if (!email) {
      showModalError("modal-email-err", "Enter your email above first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password.html",
    });

    if (error) {
      showModalError("modal-email-err", error.message);
    } else {
      showModalError("modal-email-err", "");
      alert("Password reset email sent! Check your inbox.");
    }
  });

/* ── Modal: Google OAuth ──────────────────────────────────── */
document
  .getElementById("modal-google-btn")
  .addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/index.html" },
    });
  });

/* ── Logout ───────────────────────────────────────────────── */
async function handleLogout() {
  await supabase.auth.signOut();
  // onAuthStateChange fires → applyAuthState(null) → nav resets to guest
}
document
  .getElementById("logout-btn-desktop")
  .addEventListener("click", handleLogout);
document
  .getElementById("logout-btn-mobile")
  .addEventListener("click", handleLogout);

/* ── User chip → profile page ─────────────────────────────── */
document.getElementById("user-chip-desktop").addEventListener("click", () => {
  window.location.href = "profile.html"; // 🔁 update when you build the profile page
});

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
  hamburgerLines[0].style.transform = "";
  hamburgerLines[1].style.opacity = "";
  hamburgerLines[1].style.transform = "";
  hamburgerLines[2].style.transform = "";
}

hamburgerBtn.addEventListener("click", () =>
  menuOpen ? closeMenu() : openMenu(),
);

mobileDrawer.querySelectorAll("a, button").forEach((el) => {
  el.addEventListener("click", closeMenu);
});

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
