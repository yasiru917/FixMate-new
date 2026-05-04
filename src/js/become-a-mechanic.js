// ✅ Supabase client via CDN global
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
  setTimeout(() => toast.classList.add("toast-hidden"), 4000);
}

/* ── Field error helpers ──────────────────────────────────── */
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrs() {
  document.querySelectorAll(".ferr").forEach(el => (el.textContent = ""));
}

/* ── Form submit ──────────────────────────────────────────── */
const form      = document.getElementById("mechanic-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrs();

  // Collect values
  const name        = document.getElementById("m-name").value.trim();
  const phone       = document.getElementById("m-phone").value.trim();
  const email       = document.getElementById("m-email").value.trim();
  const city        = document.getElementById("m-city").value.trim();
  const experience  = document.getElementById("m-exp").value;
  const vehicleTypes = document.getElementById("m-vehicles").value;
  const ownTools    = document.querySelector('input[name="own-tools"]:checked')?.value ?? "";
  const description = document.getElementById("m-desc").value.trim();

  // Validate required fields
  let hasError = false;
  if (!name)         { setErr("err-name",     "Full name is required.");          hasError = true; }
  if (!phone)        { setErr("err-phone",    "Phone number is required.");        hasError = true; }
  if (!email)        { setErr("err-email",    "Email address is required.");       hasError = true; }
  if (!city)         { setErr("err-city",     "City / area is required.");         hasError = true; }
  if (!experience)   { setErr("err-exp",      "Please select your experience.");   hasError = true; }
  if (!vehicleTypes) { setErr("err-vehicles", "Please select vehicle types.");     hasError = true; }
  if (!ownTools)     { setErr("err-tools",    "Please select an option.");         hasError = true; }
  if (hasError) return;

  // Submit to Supabase
  submitBtn.disabled    = true;
  submitBtn.innerHTML   = `<span class="material-symbols-outlined" style="font-size:20px; animation:spin 1s linear infinite;">progress_activity</span> Submitting…`;

  const { error } = await supabaseClient
    .from("mechanic_applications")   // 🔁 Make sure this table exists — see SQL below
    .insert([{
      full_name:     name,
      phone,
      email,
      city,
      experience,
      vehicle_types: vehicleTypes,
      own_tools:     ownTools === "yes",
      description:   description || null,
      status:        "pending",      // pending | approved | rejected
    }]);

  submitBtn.disabled  = false;
  submitBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;">send</span> Submit Application`;

  if (error) {
    showToast("Submission failed: " + error.message, true);
    return;
  }

  // ✅ Success — redirect to mechanic dashboard
  showToast("Application submitted! Redirecting…");
  setTimeout(() => {
    window.location.href = "mechanic-dashboard.html";
  }, 1800);
});

/* ── Spin animation for loading icon ─────────────────────── */
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
