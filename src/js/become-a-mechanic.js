// ✅ Supabase client via CDN global
const { createClient } = supabase;
const supabaseClient = createClient(
  "https://vgjltmohtjvtwxnrsxkv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnamx0bW9odGp2dHd4bnJzeGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjAzNzcsImV4cCI6MjA5MzI5NjM3N30.4mxPQMezSRjPkltSYZad00eqb-wqkXPoCUDLQNBQJ7I",
);

/* ── Toast ────────────────────────────────────────────────── */
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-icon").textContent = isError ? "✕" : "✓";
  document.getElementById("toast-msg").textContent = msg;
  toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  setTimeout(() => toast.classList.add("toast-hidden"), 4000);
}

/* ── Field error helpers ──────────────────────────────────── */
function setErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErrs() {
  document.querySelectorAll(".ferr").forEach((el) => (el.textContent = ""));
}

/* ── Form submit ──────────────────────────────────────────── */
const form = document.getElementById("mechanic-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrs();

  // Collect values
  const name = document.getElementById("m-name").value.trim();
  const phone = document.getElementById("m-phone").value.trim();
  const email = document.getElementById("m-email").value.trim();
  const city = document.getElementById("m-city").value.trim();
  const experience = document.getElementById("m-exp").value;
  const vehicleTypes = document.getElementById("m-vehicles").value;
  const ownTools =
    document.querySelector('input[name="own-tools"]:checked')?.value ?? "";
  const description = document.getElementById("m-desc").value.trim();

  // Validate required fields
  let hasError = false;
  if (!name) {
    setErr("err-name", "Full name is required.");
    hasError = true;
  }
  if (!phone) {
    setErr("err-phone", "Phone number is required.");
    hasError = true;
  }
  if (!email) {
    setErr("err-email", "Email address is required.");
    hasError = true;
  }
  if (!city) {
    setErr("err-city", "City / area is required.");
    hasError = true;
  }
  if (!experience) {
    setErr("err-exp", "Please select your experience.");
    hasError = true;
  }
  if (!vehicleTypes) {
    setErr("err-vehicles", "Please select vehicle types.");
    hasError = true;
  }
  if (!ownTools) {
    setErr("err-tools", "Please select an option.");
    hasError = true;
  }
  if (hasError) return;

  // Submit to Supabase
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px; animation:spin 1s linear infinite;">progress_activity</span> Submitting…`;

  const { error } = await supabaseClient
    .from("mechanic_applications") // 🔁 Make sure this table exists — see SQL below
    .insert([
      {
        full_name: name,
        phone,
        email,
        city,
        experience,
        vehicle_types: vehicleTypes,
        own_tools: ownTools === "yes",
        description: description || null,
        status: "pending", // pending | approved | rejected
      },
    ]);

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;">send</span> Submit Application`;

  if (error) {
    showToast("Submission failed: " + error.message, true);
    return;
  }

  // ✅ Success — replace the form with a confirmation message
  const formCard = document.querySelector(".form-card");
  formCard.innerHTML = `
    <div class="form-accent"></div>
    <div class="form-body" style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:3rem 2rem; gap:1.25rem;">

      <div style="
        width:72px; height:72px; border-radius:9999px;
        background:linear-gradient(135deg,#003d9b,#4f7cff);
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 8px 24px rgba(0,61,155,0.3);">
        <span class="material-symbols-outlined" style="font-size:36px; color:#fff;">check</span>
      </div>

      <h3 style="
        font-family:'Manrope',sans-serif; font-size:1.375rem;
        font-weight:800; color:#0d1b2a; margin:0;">
        Application Received!
      </h3>

      <p style="font-size:0.9375rem; color:#5a6a7a; line-height:1.65; max-width:380px; margin:0;">
        Thank you, <strong>${name}</strong>. Our agent will review your details
        and <strong>contact you soon</strong> at <strong>${phone}</strong> to
        complete your verification.
      </p>

      <div style="
        background:#f0f4ff; border:1px solid rgba(0,61,155,0.15);
        border-radius:0.75rem; padding:1rem 1.25rem;
        display:flex; align-items:flex-start; gap:0.75rem;
        max-width:380px; text-align:left;">
        <span class="material-symbols-outlined" style="font-size:20px; color:#003d9b; margin-top:2px; flex-shrink:0;">info</span>
        <p style="font-size:0.8125rem; color:#003d9b; margin:0; line-height:1.55;">
          You won't be able to access the mechanic dashboard until our team
          approves your application. This usually takes <strong>1–2 business days</strong>.
        </p>
      </div>

      <a href="index.html" style="
        margin-top:0.5rem; display:inline-flex; align-items:center; gap:0.375rem;
        background:#003d9b; color:#fff; text-decoration:none;
        font-size:0.9375rem; font-weight:700; font-family:'Manrope',sans-serif;
        padding:0.75rem 1.75rem; border-radius:9999px;
        transition:background 0.15s;"
        onmouseover="this.style.background='#002f78'"
        onmouseout="this.style.background='#003d9b'">
        <span class="material-symbols-outlined" style="font-size:18px;">home</span>
        Back to Home
      </a>

    </div>
  `;

  // Scroll confirmation into view smoothly
  formCard.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ── Spin animation for loading icon ─────────────────────── */
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
