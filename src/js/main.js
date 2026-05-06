import { supabase } from "./auth.js";

/* ══════════════════════════════════════════════════════════════
   AUTH STATE
══════════════════════════════════════════════════════════════ */
function applyAuthState(session) {
  const user = session?.user ?? null;

  document
    .querySelectorAll(".nav-guest")
    .forEach((el) => (el.style.display = user ? "none" : "flex"));
  document
    .querySelectorAll(".nav-user")
    .forEach((el) => (el.style.display = user ? "flex" : "none"));

  if (user) {
    const initial = (user.email?.[0] ?? "?").toUpperCase();
    document
      .querySelectorAll(".user-avatar")
      .forEach((el) => (el.textContent = initial));
    const ml = document.getElementById("user-label-mobile");
    if (ml) ml.textContent = user.email ?? "Account";

    // Start alerts for this user
    initAlerts(user.id);
  } else {
    // Clear alerts state on logout
    teardownAlerts();
    updateBadge(0);
  }
}

supabase.auth.getSession().then(({ data }) => applyAuthState(data.session));

supabase.auth.onAuthStateChange((_event, session) => {
  applyAuthState(session);
  if (_event === "SIGNED_IN") closeAuthModal();
});

/* ══════════════════════════════════════════════════════════════
   AUTH MODAL
══════════════════════════════════════════════════════════════ */
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

document
  .getElementById("login-btn-desktop")
  .addEventListener("click", openAuthModal);
document
  .getElementById("login-btn-mobile")
  .addEventListener("click", openAuthModal);

document.getElementById("bottom-nav-profile").addEventListener("click", () => {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = "profile.html";
    else openAuthModal();
  });
});

document.getElementById("close-auth").addEventListener("click", closeAuthModal);
authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !authModal.classList.contains("hidden"))
    closeAuthModal();
});

document.querySelectorAll(".modal-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === "password" ? "text" : "password";
  });
});

function showModalError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearModalErrors() {
  document
    .querySelectorAll(".modal-error")
    .forEach((el) => (el.textContent = ""));
}

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
  }
});

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
    if (error) showModalError("modal-email-err", error.message);
    else
      showModalError("modal-email-err", "Reset email sent! Check your inbox.");
  });

document
  .getElementById("modal-google-btn")
  .addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/index.html" },
    });
  });

async function handleLogout() {
  await supabase.auth.signOut();
}
document
  .getElementById("logout-btn-desktop")
  .addEventListener("click", handleLogout);
document
  .getElementById("logout-btn-mobile")
  .addEventListener("click", handleLogout);
document.getElementById("user-chip-desktop").addEventListener("click", () => {
  window.location.href = "profile.html";
});

/* ══════════════════════════════════════════════════════════════
   ALERTS — CONSTANTS & STATE
══════════════════════════════════════════════════════════════ */

// Maps notification type → { icon, colorClass, label }
const NOTIF_META = {
  mechanic_accepted: {
    icon: "check_circle",
    cls: "ni-green",
    label: "Mechanic Accepted",
  },
  mechanic_arriving: {
    icon: "directions_car",
    cls: "ni-blue",
    label: "Mechanic En Route",
  },
  mechanic_arrived: {
    icon: "location_on",
    cls: "ni-blue",
    label: "Mechanic Arrived",
  },
  job_complete: { icon: "task_alt", cls: "ni-green", label: "Job Complete" },
  job_cancelled: { icon: "cancel", cls: "ni-red", label: "Cancelled" },
  payment_confirmed: {
    icon: "payments",
    cls: "ni-green",
    label: "Payment Confirmed",
  },
  no_mechanic_found: {
    icon: "search_off",
    cls: "ni-yellow",
    label: "No Mechanic Found",
  },
  mechanic_rejected: {
    icon: "do_not_disturb",
    cls: "ni-red",
    label: "Request Rejected",
  },
  system: { icon: "info", cls: "ni-grey", label: "System" },
};

let realtimeChannel = null; // Supabase Realtime channel ref
let allNotifications = []; // Local cache

/* ══════════════════════════════════════════════════════════════
   ALERTS — BADGE
══════════════════════════════════════════════════════════════ */
function updateBadge(count) {
  ["badge-desktop", "badge-mobile"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 99 ? "99+" : count;
      el.classList.add("visible");
    } else {
      el.classList.remove("visible");
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — DRAWER OPEN / CLOSE
══════════════════════════════════════════════════════════════ */
function openAlertsDrawer() {
  document.getElementById("alerts-backdrop").classList.add("open");
  document.getElementById("alerts-drawer").classList.add("open");
  document.body.style.overflow = "hidden";
}

// Exposed globally so HTML onclick can call it
window.openAlertsDrawer = openAlertsDrawer;
window.closeAlertsDrawer = closeAlertsDrawer;
window.markAllRead = markAllRead;

function closeAlertsDrawer() {
  document.getElementById("alerts-backdrop").classList.remove("open");
  document.getElementById("alerts-drawer").classList.remove("open");
  document.body.style.overflow = "";
}

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    document.getElementById("alerts-drawer").classList.contains("open")
  ) {
    closeAlertsDrawer();
  }
});

// Wire open triggers
document.getElementById("alerts-nav-btn")?.addEventListener("click", () => {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) openAlertsDrawer();
    else openAuthModal();
  });
});
document
  .getElementById("bell-btn-desktop")
  ?.addEventListener("click", openAlertsDrawer);

/* ══════════════════════════════════════════════════════════════
   ALERTS — TIME AGO HELPER
══════════════════════════════════════════════════════════════ */
function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isToday(isoString) {
  const d = new Date(isoString);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — RENDER
══════════════════════════════════════════════════════════════ */
function renderNotifications(list) {
  const body = document.getElementById("alerts-body");

  // Hide skeleton
  const sk = document.getElementById("alerts-skeleton");
  if (sk) sk.remove();

  if (list.length === 0) {
    body.innerHTML = `
      <div class="notif-empty">
        <span class="material-symbols-outlined">notifications_off</span>
        <p class="notif-empty-title">No alerts yet</p>
        <p class="notif-empty-sub">We'll notify you when a mechanic accepts your request or your job status changes.</p>
      </div>`;
    return;
  }

  const today = list.filter((n) => isToday(n.created_at));
  const earlier = list.filter((n) => !isToday(n.created_at));

  let html = "";
  if (today.length) {
    html += `<div class="notif-section-label">Today</div>`;
    html += today.map(buildCard).join("");
  }
  if (earlier.length) {
    html += `<div class="notif-section-label">Earlier</div>`;
    html += earlier.map(buildCard).join("");
  }

  body.innerHTML = html;

  // Wire card click → mark read
  body.querySelectorAll(".notif-card[data-id]").forEach((card) => {
    card.addEventListener("click", () =>
      markRead(card.dataset.id, card.dataset.url),
    );
  });
}

function buildCard(n) {
  const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
  return `
    <div class="notif-card ${n.read ? "" : "unread"}" data-id="${n.id}" data-url="${n.action_url ?? ""}">
      <div class="notif-icon ${meta.cls}">
        <span class="material-symbols-outlined">${meta.icon}</span>
      </div>
      <div class="notif-text">
        <div class="notif-title">${n.title}</div>
        ${n.body ? `<div class="notif-body">${n.body}</div>` : ""}
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
      ${n.read ? "" : '<div class="notif-unread-dot"></div>'}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — PREPEND A SINGLE NEW CARD (realtime insert)
══════════════════════════════════════════════════════════════ */
function prependNotification(n) {
  const body = document.getElementById("alerts-body");

  // Remove empty state if present
  const empty = body.querySelector(".notif-empty");
  if (empty) empty.remove();

  // Add "Today" label if it isn't there yet
  if (!body.querySelector(".notif-section-label")) {
    body.insertAdjacentHTML(
      "afterbegin",
      `<div class="notif-section-label">Today</div>`,
    );
  }

  // Insert card after the label
  const label = body.querySelector(".notif-section-label");
  label.insertAdjacentHTML("afterend", buildCard(n));

  // Wire click on the new card
  const newCard = body.querySelector(`.notif-card[data-id="${n.id}"]`);
  if (newCard) {
    newCard.addEventListener("click", () => markRead(n.id, n.action_url ?? ""));
    // Brief flash animation
    newCard.style.transition = "background 0.6s";
    newCard.style.background = "#dde8ff";
    setTimeout(() => {
      newCard.style.background = "";
    }, 700);
  }
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — MARK READ
══════════════════════════════════════════════════════════════ */
async function markRead(id, actionUrl) {
  // Optimistically update UI
  const card = document.querySelector(`.notif-card[data-id="${id}"]`);
  if (card) {
    card.classList.remove("unread");
    card.querySelector(".notif-unread-dot")?.remove();
  }

  // Update local cache
  const notif = allNotifications.find((n) => n.id === id);
  if (notif) notif.read = true;

  // Update badge
  const unread = allNotifications.filter((n) => !n.read).length;
  updateBadge(unread);

  // Persist to Supabase
  await supabase.from("notifications").update({ read: true }).eq("id", id);

  // Navigate if there's an action URL
  if (actionUrl) window.location.href = actionUrl;
}

async function markAllRead() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  // Optimistic UI update
  document.querySelectorAll(".notif-card.unread").forEach((card) => {
    card.classList.remove("unread");
    card.querySelector(".notif-unread-dot")?.remove();
  });
  allNotifications.forEach((n) => (n.read = true));
  updateBadge(0);

  // Persist
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", session.user.id)
    .eq("read", false);
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — LOAD FROM SUPABASE
══════════════════════════════════════════════════════════════ */
async function loadNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load notifications:", error.message);
    document.getElementById("alerts-skeleton")?.remove();
    document.getElementById("alerts-body").innerHTML = `
      <div class="notif-empty">
        <span class="material-symbols-outlined">error</span>
        <p class="notif-empty-title">Could not load alerts</p>
        <p class="notif-empty-sub">Please check your connection and try again.</p>
      </div>`;
    return;
  }

  allNotifications = data ?? [];
  renderNotifications(allNotifications);
  updateBadge(allNotifications.filter((n) => !n.read).length);
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — REALTIME SUBSCRIPTION
══════════════════════════════════════════════════════════════ */
function subscribeToAlerts(userId) {
  // Only one channel at a time
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newNotif = payload.new;
        allNotifications.unshift(newNotif); // add to front of cache
        prependNotification(newNotif); // update drawer if open
        updateBadge(allNotifications.filter((n) => !n.read).length); // bump badge

        // Subtle pulse on the bell icons
        ["bell-btn-desktop", "alerts-nav-btn"].forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.style.transform = "scale(1.25)";
          setTimeout(() => (el.style.transform = ""), 300);
        });
      },
    )
    .subscribe();
}

/* ══════════════════════════════════════════════════════════════
   ALERTS — INIT & TEARDOWN
══════════════════════════════════════════════════════════════ */
function initAlerts(userId) {
  loadNotifications(userId);
  subscribeToAlerts(userId);
}

function teardownAlerts() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  allNotifications = [];
  // Reset drawer to skeleton state
  const body = document.getElementById("alerts-body");
  if (body) {
    body.innerHTML = `
      <div class="notif-guest">
        <span class="material-symbols-outlined">lock</span>
        <p>Sign in to see your alerts.</p>
      </div>`;
  }
}

/* ══════════════════════════════════════════════════════════════
   PAGE LOADER
══════════════════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  setTimeout(() => document.body.classList.add("loaded"), 1150);
});

/* ══════════════════════════════════════════════════════════════
   HAMBURGER MENU
══════════════════════════════════════════════════════════════ */
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
mobileDrawer
  .querySelectorAll("a, button")
  .forEach((el) => el.addEventListener("click", closeMenu));
document.addEventListener("click", (e) => {
  if (
    menuOpen &&
    !hamburgerBtn.contains(e.target) &&
    !mobileDrawer.contains(e.target)
  )
    closeMenu();
});

/* ══════════════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════════════ */
const revealObserver = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }),
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
);
document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

/* ══════════════════════════════════════════════════════════════
   NAV SHADOW ON SCROLL
══════════════════════════════════════════════════════════════ */
const topNav = document.getElementById("top-nav");
if (topNav) {
  const sentinel = document.createElement("div");
  sentinel.style.cssText =
    "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;";
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([entry]) => topNav.classList.toggle("nav-scrolled", !entry.isIntersecting),
    { rootMargin: "-1px 0px 0px 0px", threshold: 1 },
  ).observe(sentinel);
}

/* ══════════════════════════════════════════════════════════════
   BOTTOM NAV ACTIVE STATE
══════════════════════════════════════════════════════════════ */
document.querySelectorAll(".bottom-nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document
      .querySelectorAll(".bottom-nav-item")
      .forEach((i) => i.classList.remove("bottom-nav-item-active"));
    item.classList.add("bottom-nav-item-active");
  });
});
