// ✅ Supabase client — CDN global
const { createClient } = supabase;
const supabaseClient = createClient(
  "https://vgjltmohtjvtwxnrsxkv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnamx0bW9odGp2dHd4bnJzeGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjAzNzcsImV4cCI6MjA5MzI5NjM3N30.4mxPQMezSRjPkltSYZad00eqb-wqkXPoCUDLQNBQJ7I"
);

/* ── Toast ────────────────────────────────────────────────── */
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-icon").textContent = isError ? "✕" : "✓";
  document.getElementById("toast-msg").textContent  = msg;
  toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  setTimeout(() => toast.classList.add("toast-hidden"), 3500);
}

/* ── Guard: redirect to login if not authenticated ────────── */
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

/* ── Populate UI with user + profile data ─────────────────── */
async function loadProfile(session) {
  const user = session.user;

  // Avatar initial
  const initial = (user.email?.[0] ?? "?").toUpperCase();
  document.getElementById("avatar-lg").textContent   = initial;
  document.getElementById("profile-email").textContent = user.email ?? "—";
  document.getElementById("field-email").value         = user.email ?? "";

  // Verified badge
  const isVerified = !!user.email_confirmed_at;
  const badge = document.getElementById("verify-badge");
  badge.className   = `badge ${isVerified ? "badge-verified" : "badge-unverified"}`;
  badge.innerHTML   = isVerified
    ? '<span class="material-symbols-outlined" style="font-size:13px;">verified</span> Email verified'
    : '<span class="material-symbols-outlined" style="font-size:13px;">warning</span> Not verified';

  // Member since
  const since = new Date(user.created_at);
  document.getElementById("member-since").textContent =
    since.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  // Load phone + NIC from profiles table
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("phone, nic")
    .eq("id", user.id)
    .single();

  if (!error && profile) {
    document.getElementById("field-phone").value = profile.phone ?? "";
    document.getElementById("field-nic").value   = profile.nic   ?? "";
  }
}

/* ── Save profile changes ─────────────────────────────────── */
const profileForm = document.getElementById("profile-form");
const saveBtn     = document.getElementById("save-btn");

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const phone = document.getElementById("field-phone").value.trim();
  const nic   = document.getElementById("field-nic").value.trim();

  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  const { error } = await supabaseClient
    .from("profiles")
    .update({ phone, nic })
    .eq("id", session.user.id);

  saveBtn.disabled = false;
  saveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">save</span> Save changes';

  if (error) {
    showToast("Failed to save: " + error.message, true);
  } else {
    showToast("Profile updated successfully!");
  }
});

/* ── Password reset ───────────────────────────────────────── */
document.getElementById("reset-password-btn").addEventListener("click", async () => {
  const email = document.getElementById("field-email").value.trim();
  if (!email) return;

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });

  if (error) {
    showToast(error.message, true);
  } else {
    showToast("Reset email sent! Check your inbox.");
  }
});

/* ── Logout ───────────────────────────────────────────────── */
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

/* ── Delete account ───────────────────────────────────────── */
document.getElementById("delete-account-btn").addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Are you sure you want to permanently delete your account? This cannot be undone."
  );
  if (!confirmed) return;

  // Note: deleting a user requires a server-side call (service role key).
  // For now, sign out and show a support message.
  // 🔁 Replace with a Supabase Edge Function call when ready.
  showToast("Please contact support to delete your account.", true);
});

/* ── Init ─────────────────────────────────────────────────── */
(async () => {
  const session = await requireAuth();
  if (session) await loadProfile(session);
})();
