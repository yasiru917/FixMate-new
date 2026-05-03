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

/* ── Form Submit ──────────────────────────────────────────── */
const form = document.getElementById("signup-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFieldErrors();

  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim(); // ✅ now collected
  const nic = document.getElementById("nic").value.trim(); // ✅ now collected
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  /* ── Client-side validation ── */
  let hasError = false;

  if (!email) {
    showFieldError("email-err", "Email is required.");
    hasError = true;
  }

  if (!phone) {
    showFieldError("phone-err", "Phone number is required.");
    hasError = true;
  }

  if (!nic) {
    showFieldError("nic-err", "NIC number is required.");
    hasError = true;
  }

  if (password.length < 6) {
    showFieldError("password-err", "Password must be at least 6 characters.");
    hasError = true;
  }

  if (password !== confirmPassword) {
    showFieldError("confirm-password-err", "Passwords do not match.");
    hasError = true;
  }

  if (hasError) return;

  /* ── Submit to Supabase ── */
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { phone, nic }, // ✅ stored in raw_user_meta_data → triggers profiles insert
    },
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "Create account";

  if (error) {
    showToast(error.message, true);
    return;
  }

  // ✅ Success
  showToast("Account created! Check your email to confirm.");
  form.reset();

  setTimeout(() => {
    window.location.href = "./login.html";
  }, 3000);
});
