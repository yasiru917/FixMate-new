/* ══════════════════════════════════════════════════════════
   FixMate — Search for a Mechanic
   Leaflet + OpenStreetMap | Nominatim | Supabase
══════════════════════════════════════════════════════════ */

/* ── Supabase Client (CDN global) ─────────────────────── */
const { createClient } = supabase;
const supabaseClient = createClient(
  "https://vgjltmohtjvtwxnrsxkv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnamx0bW9odGp2dHd4bnJzeGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjAzNzcsImV4cCI6MjA5MzI5NjM3N30.4mxPQMezSRjPkltSYZad00eqb-wqkXPoCUDLQNBQJ7I",
);

/* ── Authentication Check ─────────────────────────────── */
supabaseClient.auth.getSession().then(({ data }) => {
  if (!data.session) {
    // Redirect to login if not authenticated
    window.location.href = "login.html";
  }
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    // Redirect to login if session is lost
    window.location.href = "login.html";
  }
});

/* ══════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════ */
let userCoords = null; // { lat, lng }
let userMarker = null;
let map = null;
let currentStep = 1;
let problemDesc = "";
let quizIndex = 0;
let quizAnswers = [];
let mechanics = [];
let mechMarkers = []; // Leaflet markers for mechanics

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
function toast(msg, type = "info", duration = 3500) {
  const el = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  el.className = `toast toast-${type}`;
  setTimeout(() => el.classList.add("toast-hidden"), duration);
}

/* ══════════════════════════════════════════════════════════
   STEP NAVIGATION
══════════════════════════════════════════════════════════ */
function goToStep(n) {
  if (n === 2 && !userCoords) {
    toast("Please share your location first.", "error");
    return;
  }
  if (n === 3 && currentStep < 2) {
    toast("Please describe the problem first.", "error");
    return;
  }

  // Hide all panels
  document
    .querySelectorAll(".step-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(`step${n}`).classList.add("active");

  // Update step bar
  for (let i = 1; i <= 3; i++) {
    const item = document.getElementById(`step-item-${i}`);
    const circle = document.getElementById(`step-circle-${i}`);
    item.classList.remove("active", "done");
    if (i < n) {
      item.classList.add("done");
      circle.innerHTML = `<span class="material-symbols-outlined" style="font-size:15px;">check</span>`;
    }
    if (i === n) {
      item.classList.add("active");
      circle.textContent = i;
    }
    if (i > n) {
      circle.textContent = i;
    }
  }
  for (let i = 1; i <= 2; i++) {
    document.getElementById(`conn-${i}`).classList.toggle("done", i < n);
  }

  currentStep = n;
  if (n === 1 && map) setTimeout(() => map.invalidateSize(), 100);
  if (n === 3) loadMechanics();
}

/* ══════════════════════════════════════════════════════════
   STEP 1 — LEAFLET MAP + GEOLOCATION
══════════════════════════════════════════════════════════ */
function initMap(lat = 6.9271, lng = 79.8612) {
  if (map) return;
  map = L.map("map", { zoomControl: false }).setView([lat, lng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: "topright" }).addTo(map);
}

function placeUserMarker(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);

  // Custom pulsing icon
  const pulseIcon = L.divIcon({
    className: "user-pulse-marker",
    html: `<div class="pulse-dot"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  userMarker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
  map.flyTo([lat, lng], 15, { duration: 1.2 });
}

function requestLocation() {
  const btn = document.getElementById("locate-btn");
  const text = document.getElementById("location-text");

  if (!navigator.geolocation) {
    toast("Geolocation is not supported by your browser.", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;animation:spin 1s linear infinite;">progress_activity</span> Locating…`;
  text.textContent = "Detecting your location…";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      // Init map if not yet
      if (!map) initMap(userCoords.lat, userCoords.lng);
      placeUserMarker(userCoords.lat, userCoords.lng);

      // Reverse geocode with Nominatim (free, no token)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userCoords.lat}&lon=${userCoords.lng}&zoom=16&addressdetails=1`,
          { headers: { "Accept-Language": "en" } },
        );
        const data = await res.json();
        const place =
          data.display_name ??
          `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`;
        text.textContent = place;
      } catch {
        text.textContent = `${userCoords.lat.toFixed(4)}° N, ${userCoords.lng.toFixed(4)}° E`;
      }

      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;">my_location</span> Update Location`;

      const nextBtn = document.getElementById("next-to-step2");
      nextBtn.classList.add("ready");
      toast("Location found!", "success");
    },
    (err) => {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;">my_location</span> Use My Current Location`;
      text.textContent = "Location not detected yet";
      const msg =
        err.code === 1
          ? "Location permission denied. Please allow access in your browser settings."
          : "Unable to detect location. Please try again.";
      toast(msg, "error", 5000);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

// Init map with default view on load
window.addEventListener("load", () => {
  setTimeout(() => initMap(), 100);
});

/* ══════════════════════════════════════════════════════════
   STEP 2 — PROBLEM TABS
══════════════════════════════════════════════════════════ */
function switchProbTab(tab) {
  ["know", "quiz", "photo"].forEach((t) => {
    document.getElementById(`tab-${t}`).classList.toggle("active", t === tab);
    document.getElementById(`panel-${t}`).classList.toggle("active", t === tab);
  });
}

// Quick-tag chips for "know" tab
const QUICK_TAGS = [
  "Engine won't start",
  "Flat tyre",
  "Battery dead",
  "Overheating",
  "Brake issue",
  "Fuel empty",
  "Warning light",
  "Transmission",
  "AC not working",
  "Accident damage",
];
(function renderTags() {
  const wrap = document.getElementById("quick-tags");
  QUICK_TAGS.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "prob-tag";
    btn.textContent = tag;
    btn.onclick = () => {
      btn.classList.toggle("selected");
      updateProblemDesc();
    };
    wrap.appendChild(btn);
  });
})();

function updateProblemDesc() {
  const typed = document.getElementById("problem-text").value.trim();
  const tagged = [...document.querySelectorAll(".prob-tag.selected")].map(
    (b) => b.textContent,
  );
  problemDesc = [typed, ...tagged].filter(Boolean).join(", ");
}
document
  .getElementById("problem-text")
  ?.addEventListener("input", updateProblemDesc);

/* ── QUIZ ────────────────────────────────────────────────── */
const QUIZ = [
  {
    q: "Is your vehicle completely unable to move?",
    opts: [
      { icon: "✅", label: "Yes, it won't move at all" },
      { icon: "⚠️", label: "It moves but feels wrong" },
      { icon: "🔈", label: "It moves but makes noise" },
    ],
  },
  {
    q: "What happens when you try to start the engine?",
    opts: [
      { icon: "🔇", label: "Nothing happens (completely silent)" },
      { icon: "🔄", label: "It cranks but won't fire" },
      { icon: "💡", label: "Dashboard lights come on but no start" },
      { icon: "✅", label: "Engine starts fine" },
    ],
  },
  {
    q: "Have you noticed any warning lights on the dashboard?",
    opts: [
      { icon: "🔴", label: "Red warning light(s)" },
      { icon: "🟡", label: "Yellow / orange warning light(s)" },
      { icon: "🚗", label: "Check engine light" },
      { icon: "❌", label: "No warning lights" },
    ],
  },
  {
    q: "Any unusual sounds or smells?",
    opts: [
      { icon: "💨", label: "Burning smell" },
      { icon: "🔩", label: "Grinding or clicking noise" },
      { icon: "💧", label: "Hissing or liquid dripping" },
      { icon: "🚫", label: "No unusual sounds or smells" },
    ],
  },
  {
    q: "Are any tyres visibly flat or damaged?",
    opts: [
      { icon: "✅", label: "Yes, one or more flat tyres" },
      { icon: "❌", label: "No, tyres look fine" },
    ],
  },
];

const DIAGNOSES = {
  "0:0,1:0":
    "Likely a complete electrical failure or seized engine. A mechanic will need to assess on-site.",
  "0:0,1:1":
    "Possible fuel issue or spark plug failure. Mechanic can diagnose quickly.",
  "0:0,1:2":
    "Likely a dead battery. A jump-start or battery replacement may be needed.",
  "0:1": "Possible transmission or drive-shaft issue. Avoid driving further.",
  "0:2":
    "Possible wheel bearing, CV joint, or brake issue. Safe to have a mechanic check.",
  "4:0": "Flat tyre confirmed. A tyre change or inflation service is needed.",
  default:
    "Based on your answers, there may be a mechanical or electrical issue. A mechanic will be able to diagnose it quickly on-site.",
};

let quizAnswersMap = {};

function renderQuiz() {
  const q = QUIZ[quizIndex];
  const pct = Math.round((quizIndex / QUIZ.length) * 100);

  document.getElementById("quiz-bar").style.width = pct + "%";
  document.getElementById("quiz-question").textContent =
    `Q${quizIndex + 1} of ${QUIZ.length}: ${q.q}`;
  document.getElementById("quiz-result").style.display = "none";

  const opts = document.getElementById("quiz-options");
  opts.innerHTML = "";
  q.opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className =
      "quiz-opt" + (quizAnswersMap[quizIndex] === i ? " chosen" : "");
    btn.innerHTML = `<span class="opt-icon">${opt.icon}</span>${opt.label}`;
    btn.onclick = () => {
      document
        .querySelectorAll(".quiz-opt")
        .forEach((b) => b.classList.remove("chosen"));
      btn.classList.add("chosen");
      quizAnswersMap[quizIndex] = i;
    };
    opts.appendChild(btn);
  });

  // Show/hide nav buttons properly
  document.getElementById("quiz-back-btn").style.display =
    quizIndex > 0 ? "" : "none";
  const nextBtn = document.getElementById("quiz-next-btn");
  nextBtn.style.display = ""; // FIX: always show next/diagnose button
  nextBtn.textContent =
    quizIndex === QUIZ.length - 1 ? "See Diagnosis →" : "Next →";
}

function quizNext() {
  if (quizAnswersMap[quizIndex] === undefined) {
    toast("Please pick an answer to continue.", "error");
    return;
  }
  if (quizIndex < QUIZ.length - 1) {
    quizIndex++;
    renderQuiz();
  } else {
    // Show diagnosis
    const key1 = `${0}:${quizAnswersMap[0]},${1}:${quizAnswersMap[1]}`;
    const key2 = `${0}:${quizAnswersMap[0]}`;
    const key3 = `4:${quizAnswersMap[4]}`;
    const diagnosis =
      DIAGNOSES[key1] ||
      DIAGNOSES[key2] ||
      (quizAnswersMap[4] === 0 ? DIAGNOSES["4:0"] : DIAGNOSES.default);

    document.getElementById("quiz-bar").style.width = "100%";
    document.getElementById("quiz-options").innerHTML = "";
    document.getElementById("quiz-back-btn").style.display = "none";
    document.getElementById("quiz-next-btn").textContent = "↻ Restart Quiz";
    // FIX: keep next button visible, repurpose as restart
    document.getElementById("quiz-next-btn").onclick = restartQuiz;
    document.getElementById("quiz-question").textContent =
      "🔍 Diagnosis complete";

    const result = document.getElementById("quiz-result");
    result.style.display = "block";
    result.innerHTML = `<strong>Likely issue:</strong> ${diagnosis}`;
    problemDesc = diagnosis;
  }
}

// FIX: quiz restart properly resets all state and re-renders
function restartQuiz() {
  quizIndex = 0;
  quizAnswersMap = {};
  // Restore original onclick
  document.getElementById("quiz-next-btn").onclick = quizNext;
  renderQuiz();
}

function quizBack() {
  if (quizIndex > 0) {
    quizIndex--;
    renderQuiz();
  }
}

// Init quiz on load
renderQuiz();

/* ── PHOTO UPLOAD ─────────────────────────────────────────── */
function handleFiles(files) {
  const grid = document.getElementById("preview-grid");
  [...files].slice(0, 5).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "preview-img";
      grid.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
  if (files.length > 0)
    problemDesc = problemDesc || "Vehicle images uploaded for inspection";
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById("upload-zone").classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
}

/* ══════════════════════════════════════════════════════════
   STEP 3 — NEARBY MECHANICS (Supabase)
══════════════════════════════════════════════════════════ */

/**
 * Haversine distance in km between two lat/lng points
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Generate avatar color from name string
 */
function nameColor(name) {
  const colors = [
    "#003d9b",
    "#1b5e20",
    "#b71c1c",
    "#4a148c",
    "#e65100",
    "#00695c",
    "#1565c0",
    "#6a1b9a",
  ];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function loadMechanics() {
  document.getElementById("results-title").textContent = "Finding mechanics…";
  document.getElementById("results-sub").textContent = "";
  document.getElementById("mechanics-list").innerHTML = `
    <div class="loading-card">
      <div class="spinner"></div>
      <p style="color:var(--muted); font-size:0.875rem; margin:0;">Searching for mechanics nearby…</p>
    </div>`;

  try {
    // Query approved mechanic_applications from Supabase
    const { data, error } = await supabaseClient
      .from("mechanic_applications")
      .select("*")
      .eq("status", "approved");

    if (error) throw error;

    if (!data || data.length === 0) {
      mechanics = [];
      renderMechanics([]);
      return;
    }

    // Map Supabase rows to display format
    mechanics = data.map((row) => {
      // If mechanic has lat/lng stored, use it; otherwise assign random offset for demo
      const mLat =
        row.latitude ??
        (userCoords
          ? userCoords.lat + (Math.random() - 0.5) * 0.04
          : 6.927 + (Math.random() - 0.5) * 0.04);
      const mLng =
        row.longitude ??
        (userCoords
          ? userCoords.lng + (Math.random() - 0.5) * 0.04
          : 79.861 + (Math.random() - 0.5) * 0.04);
      const dist = userCoords
        ? haversine(userCoords.lat, userCoords.lng, mLat, mLng)
        : 0;

      return {
        id: row.id,
        name: row.full_name,
        specialty: row.vehicle_types ?? "All Vehicle Types",
        dist: Math.round(dist * 10) / 10,
        rating: row.rating ?? 4.5,
        reviews: row.review_count ?? 0,
        available: row.available !== false,
        phone: row.phone ?? "",
        wa: row.phone ?? "",
        color: nameColor(row.full_name),
        initials: getInitials(row.full_name),
        lat: mLat,
        lng: mLng,
      };
    });

    // Sort by distance
    mechanics.sort((a, b) => a.dist - b.dist);
    renderMechanics(mechanics);
  } catch (err) {
    console.error("Supabase error:", err);
    document.getElementById("mechanics-list").innerHTML = `
      <div class="no-results">
        <span class="material-symbols-outlined">error</span>
        Failed to load mechanics. Please try again later.
        <br><small style="color:#aaa;">${err.message || ""}</small>
      </div>`;
    document.getElementById("results-title").textContent = "Error";
  }
}

/**
 * Build WhatsApp URL dynamically on click — FIX for stale problemDesc bug
 */
function buildWhatsAppUrl(phone) {
  // Always read current problemDesc at click time
  updateProblemDesc();
  const desc = problemDesc || "vehicle issue";
  const locStr = userCoords
    ? `https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}`
    : "";
  const msg = `Hi, I found you on FixMate. I need help with: ${desc}.${locStr ? " My location: " + locStr : ""}`;
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

function renderMechanics(list) {
  const available = list.filter((m) => m.available).length;
  document.getElementById("results-title").textContent =
    `${list.length} mechanic${list.length !== 1 ? "s" : ""} found`;
  document.getElementById("results-sub").textContent =
    `${available} available now · ${userCoords ? "Near your location" : ""}`;

  const container = document.getElementById("mechanics-list");

  if (!list.length) {
    container.innerHTML = `
      <div class="no-results">
        <span class="material-symbols-outlined">search_off</span>
        No mechanics found in your area right now.
        <br>Try again in a few minutes.
      </div>`;
    return;
  }

  container.innerHTML = list
    .map(
      (m) => `
    <div class="mech-card">
      <div class="mech-top">
        <div class="mech-avatar" style="background:${m.color};">${m.initials}</div>
        <div class="mech-info">
          <div class="mech-name">${m.name}</div>
          <div class="mech-spec">${m.specialty}</div>
          <div class="mech-meta">
            <span class="mech-badge ${m.available ? "badge-avail" : "badge-busy"}">
              <span class="material-symbols-outlined" style="font-size:12px;">${m.available ? "circle" : "schedule"}</span>
              ${m.available ? "Available" : "Busy"}
            </span>
            <span class="mech-badge badge-dist">
              <span class="material-symbols-outlined" style="font-size:12px;">near_me</span>
              ${m.dist} km away
            </span>
            <span class="mech-badge badge-rating">
              ⭐ ${m.rating} (${m.reviews})
            </span>
          </div>
        </div>
      </div>
      <div class="mech-divider"></div>
      <div class="mech-actions">
        <a href="#" onclick="event.preventDefault(); window.open(buildWhatsAppUrl('${m.wa}'), '_blank');" class="btn-wa">
          <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          WhatsApp
        </a>
        <a href="tel:${m.phone}" class="btn-call">
          <span class="material-symbols-outlined" style="font-size:18px;">call</span>
          Call
        </a>
      </div>
    </div>
  `,
    )
    .join("");

  // Add mechanic pins on the map
  addMechanicPins(list);
}

/**
 * Add mechanic markers to the Leaflet map
 */
function addMechanicPins(list) {
  // Remove old mechanic markers
  mechMarkers.forEach((m) => map.removeLayer(m));
  mechMarkers = [];

  if (!map) return;

  list.forEach((m) => {
    const mechIcon = L.divIcon({
      className: "mech-map-pin",
      html: `<div class="mech-pin" style="background:${m.color};">${m.initials}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([m.lat, m.lng], { icon: mechIcon }).addTo(map)
      .bindPopup(`
        <strong>${m.name}</strong><br>
        ${m.specialty}<br>
        ${m.available ? "🟢 Available" : "🟡 Busy"} · ${m.dist} km away
      `);

    mechMarkers.push(marker);
  });

  // Fit map to show user + all mechanic markers
  if (userCoords && list.length > 0) {
    const allPoints = [
      [userCoords.lat, userCoords.lng],
      ...list.map((m) => [m.lat, m.lng]),
    ];
    map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 14 });
  }
}

function sortMechanics(by) {
  const sorted = [...mechanics].sort((a, b) => {
    if (by === "distance") return a.dist - b.dist;
    if (by === "rating") return b.rating - a.rating;
    if (by === "available")
      return (b.available ? 1 : 0) - (a.available ? 1 : 0);
    return 0;
  });
  renderMechanics(sorted);
}

function findMechanics() {
  updateProblemDesc();
  goToStep(3);
}
