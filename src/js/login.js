// ✅ Initialize Supabase using the CDN global (loaded via <script> in HTML)
const { createClient } = supabase;
const supabaseClient = createClient(
  "https://vgjltmohtjvtwxnrsxkv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnamx0bW9odGp2dHd4bnJzeGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjAzNzcsImV4cCI6MjA5MzI5NjM3N30.4mxPQMezSRjPkltSYZad00eqb-wqkXPoCUDLQNBQJ7I",
);

/* ── Helpers ──────────────────────────────────────────────── */
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-msg");
  const toastIcon = document.getElementById("toast-icon");

  toastIcon.textContent = isError ? "✕" : "✓";
  toastMsg.textContent = msg;
  toast.classList.remove("toast-hidden");
  toast.classList.toggle("toast-error", isError);
  toast.classList.toggle("toast-success", !isError);

  setTimeout(() => toast.classList.add("toast-hidden"), 4000);
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearFieldErrors() {
  document
    .querySelectorAll(".form-error")
    .forEach((el) => (el.textContent = ""));
}

/* ── Password toggle ──────────────────────────────────────── */
document.querySelectorAll(".btn-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
  });
});

/* ── Login Form Submit ────────────────────────────────────── */
const form = document.getElementById("login-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  /* ── Client-side validation ── */
  let hasError = false;

  if (!email) {
    showFieldError("email-err", "Email is required.");
    hasError = true;
  }

  if (!password) {
    showFieldError("password-err", "Password is required.");
    hasError = true;
  }

  if (hasError) return;

  /* ── Submit to Supabase ── */
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "Sign in";

  if (error) {
    // Supabase returns "Invalid login credentials" for wrong email/password
    showToast(error.message, true);
    showFieldError("password-err", "Incorrect email or password.");
    return;
  }

  // ✅ Success — redirect to your main app page
  showToast("Welcome back! Redirecting…");
  setTimeout(() => {
    window.location.href = "index.html"; // 🔁 Change to your dashboard/home page
  }, 1500);
});

/* ── Forgot Password ──────────────────────────────────────── */
document
  .getElementById("forgot-password-btn")
  .addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();

    if (!email) {
      showFieldError("email-err", "Enter your email above first.");
      return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password.html", // 🔁 Update this path
    });

    if (error) {
      showToast(error.message, true);
    } else {
      showToast("Password reset email sent! Check your inbox.");
    }
  });
