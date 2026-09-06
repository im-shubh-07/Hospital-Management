const departmentsList = document.getElementById("departmentsList");
const doctorsList = document.getElementById("doctorsList");
const doctorSelect = document.getElementById("doctorSelect");
const patientsList = document.getElementById("patientsList");
const appointmentsList = document.getElementById("appointmentsList");
const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");
const loggedPatientInfo = document.getElementById("loggedPatientInfo");
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const departmentSelect = document.getElementById("departmentSelect");
const addDoctorForm = document.getElementById("addDoctorForm");
const doctorMessage = document.getElementById("doctorMessage");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const doctorAppointmentsList = document.getElementById(
  "doctorAppointmentsList",
);
const patientProfile = document.getElementById("patientProfile");
const patientAppointmentsList = document.getElementById(
  "patientAppointmentsList",
);
// Universal Auth State Helper
function getLoggedInUser() {
  try {
    const admin = JSON.parse(localStorage.getItem("admin"));
    if (admin) return { role: "admin", data: admin, name: "Admin", dashboardUrl: "admin.html" };
  } catch (e) {}

  try {
    const doctor = JSON.parse(localStorage.getItem("doctor"));
    if (doctor) {
      const docName = typeof formatDoctorName === "function" ? formatDoctorName(doctor.doctor_name) : (doctor.doctor_name || "Doctor");
      return { role: "doctor", data: doctor, name: docName, dashboardUrl: "doctor-dashboard.html" };
    }
  } catch (e) {}

  try {
    const patient = JSON.parse(localStorage.getItem("patient"));
    if (patient) {
      return { role: "patient", data: patient, name: patient.patient_name || "Patient", dashboardUrl: "patient-dashboard.html" };
    }
  } catch (e) {}

  return null;
}

// Global click handler for all logout buttons (including dynamically created ones)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".logoutBtn");
  if (!btn) return;
  e.preventDefault();
  localStorage.removeItem("admin");
  localStorage.removeItem("doctor");
  localStorage.removeItem("patient");
  window.location.href = "login.html";
});

// Dynamic Navbar & Hero Auth State Sync across public pages (index, doctors, booking, login)
function initAuthNavigation() {
  const user = getLoggedInUser();
  const headerNav = document.querySelector("header nav");

  if (headerNav && user) {
    if (user.role === "admin") {
      headerNav.innerHTML = `
        <a href="admin.html" class="nav-auth-badge nav-admin-badge">⚙️ Admin Panel</a>
        <a href="doctors.html">Doctors</a>
        <button type="button" class="logoutBtn nav-logout-btn">Logout (Admin)</button>
      `;
    } else if (user.role === "doctor") {
      headerNav.innerHTML = `
        <a href="doctor-dashboard.html" class="nav-auth-badge nav-doctor-badge">🩺 Doctor Dashboard</a>
        <a href="doctors.html">Doctors</a>
        <button type="button" class="logoutBtn nav-logout-btn">Logout (${escapeHtml(user.name)})</button>
      `;
    } else if (user.role === "patient") {
      headerNav.innerHTML = `
        <a href="index.html">Home</a>
        <a href="patient-appointments.html" class="nav-auth-badge nav-patient-badge">📋 My Appointments</a>
        <a href="patient-dashboard.html">My Profile</a>
        <a href="doctors.html">Doctors</a>
        <button type="button" data-open-booking-modal>Book Appointment</button>
        <button type="button" class="logoutBtn nav-logout-btn">Logout (${escapeHtml(user.name)})</button>
      `;
    }
  }

  // Update Hero section on index.html if user is signed in
  const heroSec = document.querySelector(".hero");
  if (heroSec && user) {
    const heroActions = heroSec.querySelectorAll("a.button-link, button.button-link");
    heroActions.forEach((b) => b.remove());

    const actionContainer = document.createElement("div");
    actionContainer.className = "hero-auth-actions-group";

    if (user.role === "admin") {
      actionContainer.innerHTML = `
        <a class="button-link" href="admin.html">⚙️ Open Admin Panel</a>
      `;
    } else if (user.role === "doctor") {
      actionContainer.innerHTML = `
        <a class="button-link" href="doctor-dashboard.html">🩺 Open Doctor Dashboard</a>
      `;
    } else if (user.role === "patient") {
      actionContainer.innerHTML = `
        <a class="button-link" href="patient-appointments.html">📋 View My Appointments</a>
        <button class="button-link secondary" data-open-booking-modal type="button">Book Appointment</button>
      `;
    }
    heroSec.appendChild(actionContainer);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthNavigation);
} else {
  initAuthNavigation();
}

if (departmentsList || departmentSelect) {
  fetch("/api/departments")
    .then((response) => response.json())
    .then((departments) => {
      departments.forEach((department) => {
        if (departmentsList) {
          const div = document.createElement("div");
          div.className = "card";

          div.innerHTML = `
            <h3>${department.department_name}</h3>
            <p>Location: ${department.location}</p>
          `;

          departmentsList.appendChild(div);
        }

        if (departmentSelect) {
          const option = document.createElement("option");
          option.value = department.department_id;
          option.textContent = department.department_name;
          departmentSelect.appendChild(option);
        }
      });
    })
    .catch((error) => {
      console.log("Error loading departments:", error);
    });
}

// ==============================================================================
// DOCTOR SYMPTOM INTELLIGENCE & FILTER LOGIC
// ==============================================================================
const DOCTOR_SYMPTOMS_MAP = {
  Cardiology: {
    category: "heart",
    symptoms: ["Chest Pain", "High BP", "Palpitations", "Breathlessness", "Heart Racing"],
    keywords: ["heart", "chest", "bp", "blood pressure", "cardio", "attack", "pulse", "breathless", "palpitation"]
  },
  Neurology: {
    category: "brain",
    symptoms: ["Headache", "Migraine", "Dizziness", "Nerve Pain", "Brain Fog", "Seizures"],
    keywords: ["brain", "headache", "migraine", "nerve", "dizzy", "neuro", "spine", "stroke", "paralysis"]
  },
  Orthopedics: {
    category: "bone",
    symptoms: ["Bone Fracture", "Joint Pain", "Knee Ache", "Arthritis", "Back Pain"],
    keywords: ["bone", "fracture", "joint", "knee", "back", "ortho", "sprain", "muscle", "pain", "leg", "arm"]
  },
  "General Medicine": {
    category: "fever",
    symptoms: ["Fever", "Cold & Cough", "Viral Flu", "Infection", "Weakness", "Stomach Ache"],
    keywords: ["fever", "cold", "cough", "flu", "viral", "infection", "weak", "general", "stomach", "vomit", "body ache"]
  }
};

let allHospitalDoctors = [];
let activeSymptomCategory = "all";

if (doctorsList || doctorSelect) {
  fetch("/api/doctors")
    .then((response) => response.json())
    .then((doctors) => {
      allHospitalDoctors = doctors;

      const searchInput = document.getElementById("doctorSearchInput");
      const symptomChipsContainer = document.getElementById("symptomChips");
      const searchCountNotice = document.getElementById("searchCountNotice");

      function getDoctorInitials(name) {
        if (!name) return "DR";
        const clean = name.replace(/^Dr\.?\s*/i, "").trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.substring(0, 2).toUpperCase() || "DR";
      }

      function getDoctorCardMetadata(doctor) {
        const DOCTOR_PROFILES = {
          1: { exp: "14+ Years", rating: "4.9", reviews: 184, fee: "₹600", badge: "Senior Interventionalist", available: "Today" },
          2: { exp: "11+ Years", rating: "4.9", reviews: 142, fee: "₹650", badge: "Consultant Neurologist", available: "Today" },
          3: { exp: "15+ Years", rating: "4.8", reviews: 210, fee: "₹550", badge: "Joint Replacement Specialist", available: "Today" },
          4: { exp: "9+ Years", rating: "4.9", reviews: 165, fee: "₹450", badge: "Senior Consultant Physician", available: "Today" },
          6: { exp: "8+ Years", rating: "4.7", reviews: 98, fee: "₹500", badge: "Neuro Specialist", available: "Tomorrow" },
          7: { exp: "10+ Years", rating: "4.8", reviews: 115, fee: "₹500", badge: "Associate Cardiologist", available: "Today" },
        };

        const id = Number(doctor.doctor_id);
        if (DOCTOR_PROFILES[id]) return DOCTOR_PROFILES[id];

        const expYears = ((id * 3) % 8) + 6;
        const ratingVal = (4.7 + ((id % 3) * 0.1)).toFixed(1);
        const reviewsCount = 80 + (id * 15);
        return {
          exp: `${expYears}+ Years`,
          rating: ratingVal,
          reviews: reviewsCount,
          fee: "₹500",
          badge: "Certified Specialist",
          available: id % 2 === 0 ? "Tomorrow" : "Today",
        };
      }

      function renderDoctorsList(list) {
        if (!doctorsList) return;
        doctorsList.innerHTML = "";

        if (list.length === 0) {
          doctorsList.innerHTML = `
            <div class="empty-search-box">
              <h3>No Specialists Found</h3>
              <p>No doctor matches your search query or symptom. Try a different term or clear filters.</p>
              <button type="button" class="reset-filter-btn" id="resetDoctorFilters">Show All Doctors</button>
            </div>
          `;
          const resetBtn = document.getElementById("resetDoctorFilters");
          if (resetBtn) {
            resetBtn.addEventListener("click", () => {
              if (searchInput) searchInput.value = "";
              activeSymptomCategory = "all";
              if (symptomChipsContainer) {
                symptomChipsContainer.querySelectorAll(".symptom-chip").forEach((chip) => {
                  chip.classList.toggle("active", chip.dataset.symptom === "all");
                });
              }
              renderDoctorsList(allHospitalDoctors);
              if (searchCountNotice) {
                searchCountNotice.textContent = `Showing all ${allHospitalDoctors.length} specialists`;
              }
            });
          }
          return;
        }

        list.forEach((doctor) => {
          const symptomData = DOCTOR_SYMPTOMS_MAP[doctor.department_name] || {
            symptoms: ["General Consultation", "Routine Checkup"],
          };
          const meta = getDoctorCardMetadata(doctor);
          const initials = getDoctorInitials(doctor.doctor_name);

          const div = document.createElement("div");
          div.className = "card doctor-pro-card";

          div.innerHTML = `
            <div class="doctor-card-top-row">
              <span class="availability-pill ${meta.available === "Today" ? "pill-today" : "pill-tomorrow"}">
                <span class="pulse-dot-status"></span> Available ${meta.available}
              </span>
              <span class="doctor-verified-pill" title="Verified Medical Board Practitioner">
                <span class="verified-icon">✓</span> Verified
              </span>
            </div>

            <div class="doctor-header-row">
              <div class="doctor-avatar-circle" aria-hidden="true">${initials}</div>
              <div class="doctor-title-block">
                <h3 class="doctor-name-heading">${doctor.doctor_name}</h3>
                <div class="doctor-designation-badge">${meta.badge}</div>
                <p class="doctor-dept-line">🩺 ${doctor.department_name} • ${doctor.specialization}</p>
              </div>
            </div>

            <div class="doctor-stats-row">
              <div class="doctor-stat-badge">
                <span class="stat-main">⭐ ${meta.rating}</span>
                <span class="stat-sub">${meta.reviews}+ reviews</span>
              </div>
              <div class="doctor-stat-divider"></div>
              <div class="doctor-stat-badge">
                <span class="stat-main">💼 ${meta.exp}</span>
                <span class="stat-sub">Experience</span>
              </div>
              <div class="doctor-stat-divider"></div>
              <div class="doctor-stat-badge">
                <span class="stat-main">${meta.fee}</span>
                <span class="stat-sub">OPD Fee</span>
              </div>
            </div>

            <div class="doctor-symptoms-box">
              <div class="symptoms-title">Common Symptoms Treated:</div>
              <div class="symptoms-tags">
                ${symptomData.symptoms.map((sym) => `<span class="symptom-tag-pill">${sym}</span>`).join("")}
              </div>
            </div>

            <div class="doctor-action-row">
              <a class="doctor-phone-btn" href="tel:${doctor.phone}" title="Call Specialist">
                📞 <span class="phone-text">${doctor.phone}</span>
              </a>
              <button type="button" class="doctor-booking-btn" data-open-booking-modal data-doctor-id="${doctor.doctor_id}">
                📅 Book Slot
              </button>
            </div>
          `;

          doctorsList.appendChild(div);
        });
      }

      function filterDoctors() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

        const filtered = allHospitalDoctors.filter((doctor) => {
          const symptomData = DOCTOR_SYMPTOMS_MAP[doctor.department_name] || {
            category: "general",
            symptoms: [],
            keywords: [],
          };

          // 1. Check Category Chip
          if (activeSymptomCategory !== "all" && symptomData.category !== activeSymptomCategory) {
            return false;
          }

          // 2. Check Text Search Query
          if (!query) return true;

          const matchName = doctor.doctor_name.toLowerCase().includes(query);
          const matchSpec = doctor.specialization.toLowerCase().includes(query);
          const matchDept = doctor.department_name.toLowerCase().includes(query);
          const matchSymptoms = symptomData.symptoms.some((sym) => sym.toLowerCase().includes(query));
          const matchKeywords = (symptomData.keywords || []).some((kw) => kw.includes(query) || query.includes(kw));

          return matchName || matchSpec || matchDept || matchSymptoms || matchKeywords;
        });

        renderDoctorsList(filtered);

        if (searchCountNotice) {
          searchCountNotice.textContent = `Showing ${filtered.length} of ${allHospitalDoctors.length} specialists`;
        }
      }

      // Initial render
      renderDoctorsList(allHospitalDoctors);
      if (searchCountNotice) {
        searchCountNotice.textContent = `Showing all ${allHospitalDoctors.length} specialists`;
      }

      // Wire search input listener
      if (searchInput) {
        searchInput.addEventListener("input", filterDoctors);
      }

      // Wire symptom chips listener
      if (symptomChipsContainer) {
        symptomChipsContainer.addEventListener("click", (event) => {
          const chip = event.target.closest(".symptom-chip");
          if (!chip) return;

          symptomChipsContainer.querySelectorAll(".symptom-chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          activeSymptomCategory = chip.dataset.symptom || "all";
          filterDoctors();
        });
      }

      // Populate doctor select dropdown for booking form
      if (doctorSelect) {
        doctors.forEach((doctor) => {
          const option = document.createElement("option");
          option.value = doctor.doctor_id;
          option.textContent = `${doctor.doctor_name} (${doctor.specialization})`;
          doctorSelect.appendChild(option);
        });

        const requestedDoctorId = new URLSearchParams(window.location.search).get("doctor");
        if (requestedDoctorId) {
          doctorSelect.value = requestedDoctorId;
          const dateInput = document.getElementById("appointmentDate");
          if (dateInput && dateInput.value) {
            dateInput.dispatchEvent(new Event("change"));
          }
        }
      }
    })
    .catch((error) => {
      console.log("Error loading doctors:", error);
    });
}

if (patientsList) {
  fetch("/api/patients")
    .then((response) => response.json())
    .then((patients) => {
      patients.forEach((patient) => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <h3>${patient.patient_name}</h3>
          <p>Age: ${patient.age}</p>
          <p>Gender: ${patient.gender}</p>
          <p>Phone: ${patient.phone}</p>
          <p>Address: ${patient.address}</p>
        `;
        patientsList.appendChild(div);
      });
    })
    .catch((error) => {
      console.log("Error loading patients:", error);
    });
}

function formatDoctorName(name) {
  if (!name) return "Doctor";
  const trimmed = name.trim();
  const match = trimmed.match(/^Dr\.?\s*(.*)$/i);
  if (match) {
    return `Dr. ${match[1].trim()}`;
  }
  return `Dr. ${trimmed}`;
}

function getStatusBadgeHtml(status) {
  const s = (status || "Pending").toLowerCase();
  let badgeClass = "status-badge-pending";
  let icon = "⏳";
  let label = status || "Pending";
  if (s === "confirmed") {
    badgeClass = "status-badge-confirmed";
    icon = "✓";
    label = "Confirmed";
  } else if (s === "completed") {
    badgeClass = "status-badge-completed";
    icon = "🏁";
    label = "Checkup Done";
  } else if (s === "cancelled") {
    badgeClass = "status-badge-cancelled";
    icon = "✕";
    label = "Cancelled";
  }
  return `<span class="appointment-status-pill ${badgeClass}">${icon} ${label}</span>`;
}

if (appointmentsList) {
  let adminAppointmentsCache = [];
  let currentAdminTab = "pending";
  let adminToastTimer = null;

  const showAdminToast = (msg, isError = false) => {
    const toast = document.getElementById("adminStatusToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `doctor-toast ${isError ? "doctor-toast-error" : "doctor-toast-success"}`;
    toast.hidden = false;
    if (adminToastTimer) clearTimeout(adminToastTimer);
    adminToastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  };

  const updateAdminStats = () => {
    const total = adminAppointmentsCache.length;
    const pending = adminAppointmentsCache.filter((a) => a.status === "Pending").length;
    const confirmed = adminAppointmentsCache.filter((a) => a.status === "Confirmed").length;
    const completed = adminAppointmentsCache.filter((a) => a.status === "Completed").length;
    const cancelled = adminAppointmentsCache.filter((a) => a.status === "Cancelled").length;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt("adminCountPending", pending);
    setTxt("adminCountConfirmed", confirmed);
    setTxt("adminCountCompleted", completed);
    setTxt("adminCountCancelled", cancelled);
    setTxt("adminCountTotal", total);
  };

  const renderAdminAppointments = () => {
    appointmentsList.innerHTML = "";

    const filtered = adminAppointmentsCache.filter((apt) => {
      if (currentAdminTab === "all") return true;
      if (currentAdminTab === "pending") return apt.status === "Pending";
      if (currentAdminTab === "confirmed") return apt.status === "Confirmed";
      if (currentAdminTab === "completed") return apt.status === "Completed";
      if (currentAdminTab === "cancelled") return apt.status === "Cancelled";
      return true;
    });

    if (filtered.length === 0) {
      const messages = {
        pending: "No pending appointments waiting for review. All caught up!",
        confirmed: "No patients currently waiting in doctor consultation queue.",
        completed: "No completed checkups yet.",
        cancelled: "No cancelled appointments.",
        all: "No appointments booked yet.",
      };
      appointmentsList.innerHTML = `
        <div class="empty-search-box">
          <h3>${currentAdminTab === "pending" ? "All Caught Up! 🎉" : "No Appointments Found"}</h3>
          <p>${messages[currentAdminTab] || "No appointments to show."}</p>
        </div>
      `;
      return;
    }

    filtered.forEach((apt) => {
      const div = document.createElement("div");
      const status = apt.status || "Pending";
      div.className = `card appointment-card-modern admin-apt-card apt-card-status-${status.toLowerCase()}`;

      const hasRx = Boolean(apt.prescription_id || apt.diagnosis);

      div.innerHTML = `
        <div class="apt-header">
          <div>
            <h3 style="margin:0 0 4px 0;">Appointment #${apt.appointment_id} - ${escapeHtml(apt.patient_name)}</h3>
            <span class="apt-subtext">📞 ${apt.patient_phone || "N/A"} | Attending Doctor: <strong>${escapeHtml(apt.doctor_name)}</strong> (${escapeHtml(apt.specialization || "Specialist")})</span>
          </div>
          <div>
            ${getStatusBadgeHtml(apt.status)}
          </div>
        </div>

        <div class="apt-meta-row">
          <span class="appointment-meta-chip">📅 Date: ${apt.appointment_date}</span>
          <span class="appointment-meta-chip">⏰ Time: ${apt.appointment_time}</span>
          ${apt.bill_id ? `<span class="appointment-meta-chip">🧾 Bill: ₹${Number(apt.bill_amount).toFixed(2)} (${apt.payment_status})</span>` : ""}
        </div>

        ${status === "Completed" ? `
          <div class="rx-summary-card" style="background:#ecfdf5; border-color:#a7f3d0;">
            <div class="rx-summary-badge" style="background:#d1fae5; color:#065f46;">🏁 Checkup Completed by Doctor</div>
            ${apt.diagnosis ? `<p class="rx-diag-snippet"><strong>Clinical Diagnosis:</strong> ${escapeHtml(apt.diagnosis)}</p>` : "<p class=\"rx-diag-snippet\">Checkup completed by attending doctor.</p>"}
            <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
              ${hasRx ? `<a href="/api/appointments/${apt.appointment_id}/prescription/pdf" target="_blank" class="pdf-btn rx-btn" style="padding:4px 10px; font-size:0.75rem;">📄 View Rx (PDF)</a>` : ""}
              ${apt.bill_id ? `<a href="/api/bills/${apt.bill_id}/pdf" target="_blank" class="pdf-btn bill-btn" style="padding:4px 10px; font-size:0.75rem;">🧾 View Bill (PDF)</a>` : ""}
            </div>
          </div>
        ` : status === "Confirmed" ? `
          <div class="rx-pending-banner" style="background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">
            <span>🩺 <strong>Sent to Doctor:</strong> Patient is in ${escapeHtml(apt.doctor_name)}'s consultation queue.</span>
          </div>
        ` : status === "Pending" ? `
          <div class="rx-pending-banner" style="background:#fffbeb; border-color:#fde68a; color:#92400e;">
            <span>⏳ <strong>Awaiting Admin Action:</strong> Please verify details and confirm to assign to doctor.</span>
          </div>
        ` : ""}

        <div class="apt-action-toolbar">
          ${status === "Pending" ? `
            <button type="button" class="btn-action admin-btn-confirm" data-id="${apt.appointment_id}">
              ✅ Confirm & Send to Doctor
            </button>
            <button type="button" class="btn-action admin-btn-cancel" data-id="${apt.appointment_id}">
              ❌ Reject / Cancel
            </button>
          ` : status === "Confirmed" ? `
            <div style="font-size:0.82rem; color:#059669; font-weight:600; display:flex; align-items:center; gap:6px;">
              <span>✅ Confirmed & In Doctor Queue</span>
            </div>
            <button type="button" class="btn-action admin-btn-cancel" data-id="${apt.appointment_id}" style="margin-left:auto;">
              ❌ Cancel Appointment
            </button>
          ` : status === "Completed" ? `
            <div style="font-size:0.82rem; color:#065f46; font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>🏁 Checkup Finished & Recorded</span>
            </div>
          ` : `
            <button type="button" class="btn-action admin-btn-confirm" data-id="${apt.appointment_id}">
              🔄 Re-Open & Confirm
            </button>
          `}

          <!-- Admin Quick Status Dropdown -->
          <div style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
            <label style="font-size: 0.72rem; font-weight:700; color:var(--muted); text-transform:uppercase;">Manual Status:</label>
            <select class="admin-status-select" data-id="${apt.appointment_id}" style="padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:600;">
              <option value="Pending" ${status === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Confirmed" ${status === "Confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="Completed" ${status === "Completed" ? "selected" : ""}>Completed</option>
              <option value="Cancelled" ${status === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </div>
        </div>
      `;

      appointmentsList.appendChild(div);
    });
  };

  const adminUpdateStatus = async (appointmentId, newStatus) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAdminToast(data.message || "Failed to update status", true);
        return;
      }
      const item = adminAppointmentsCache.find((a) => Number(a.appointment_id) === Number(appointmentId));
      if (item) {
        item.status = newStatus;
      }
      const successMsg =
        newStatus === "Confirmed"
          ? `Appointment #${appointmentId} confirmed & sent to Doctor!`
          : newStatus === "Completed"
          ? `Appointment #${appointmentId} marked as Checkup Completed!`
          : `Appointment #${appointmentId} marked as ${newStatus}!`;
      showAdminToast(successMsg);
      updateAdminStats();
      renderAdminAppointments();
    } catch (err) {
      console.error("Admin status update error:", err);
      showAdminToast("Network error updating status", true);
    }
  };

  const loadAdminAppointments = () => {
    fetch("/api/appointments")
      .then((res) => res.json())
      .then((appointments) => {
        adminAppointmentsCache = appointments;
        updateAdminStats();
        renderAdminAppointments();
      })
      .catch((err) => {
        console.error("Error loading appointments:", err);
        appointmentsList.innerHTML = "<p>Error loading appointments.</p>";
      });
  };

  loadAdminAppointments();

  // Stat Card click listeners as primary navigation
  const adminStatCards = document.querySelectorAll(".admin-stats-grid .admin-stat-card");

  const switchAdminTab = (tab) => {
    currentAdminTab = tab;
    adminStatCards.forEach((c) => c.classList.toggle("active", c.dataset.tab === tab));
    renderAdminAppointments();
  };

  adminStatCards.forEach((c) => c.addEventListener("click", () => switchAdminTab(c.dataset.tab)));

  // Event Delegation for Admin Cards
  appointmentsList.addEventListener("click", (e) => {
    const confirmBtn = e.target.closest(".admin-btn-confirm");
    if (confirmBtn) {
      adminUpdateStatus(confirmBtn.dataset.id, "Confirmed");
      return;
    }
    const cancelBtn = e.target.closest(".admin-btn-cancel");
    if (cancelBtn) {
      if (confirm("Are you sure you want to cancel this appointment?")) {
        adminUpdateStatus(cancelBtn.dataset.id, "Cancelled");
      }
      return;
    }
  });

  appointmentsList.addEventListener("change", (e) => {
    if (e.target.classList.contains("admin-status-select")) {
      adminUpdateStatus(e.target.dataset.id, e.target.value);
    }
  });
}

// ==============================================================================
// 30-MINUTE SMART TIME SLOT PICKER LOGIC
// ==============================================================================
const CLINIC_SLOTS = {
  morning: ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"],
  evening: ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"]
};

function formatTime12h(time24) {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`;
}

async function renderSlotPicker({ doctorId, date, sectionEl, containerEl, hiddenInput, noticeEl }) {
  if (!sectionEl || !containerEl || !hiddenInput) return;

  if (!doctorId || !date) {
    sectionEl.hidden = true;
    hiddenInput.value = "";
    if (noticeEl) noticeEl.textContent = "";
    return;
  }

  sectionEl.hidden = false;
  containerEl.innerHTML = '<p class="slots-loading-text">Checking real-time doctor availability...</p>';
  hiddenInput.value = "";
  if (noticeEl) noticeEl.textContent = "";

  try {
    const res = await fetch(`/api/doctors/${doctorId}/booked-slots?date=${date}`);
    const data = await res.json();
    const booked = new Set(data.bookedSlots || []);

    containerEl.innerHTML = "";

    const createGroup = (title, slots) => {
      const groupWrapper = document.createElement("div");
      groupWrapper.className = "slots-group";

      const heading = document.createElement("div");
      heading.className = "slot-shift-title";
      heading.textContent = title;
      groupWrapper.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "slots-grid";

      slots.forEach((time) => {
        const isBooked = booked.has(time);
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = `slot-pill ${isBooked ? "slot-booked" : ""}`;
        pill.dataset.time = time;

        const label = formatTime12h(time);
        pill.innerHTML = `<span>${label}</span>${isBooked ? '<span class="slot-status-tag">Booked</span>' : ""}`;

        if (isBooked) {
          pill.disabled = true;
        } else {
          pill.addEventListener("click", () => {
            const allPills = containerEl.querySelectorAll(".slot-pill");
            allPills.forEach((btn) => btn.classList.remove("slot-selected"));
            pill.classList.add("slot-selected");
            hiddenInput.value = time;
            if (noticeEl) {
              noticeEl.textContent = `✓ Selected Slot: ${label}`;
            }
          });
        }

        grid.appendChild(pill);
      });

      groupWrapper.appendChild(grid);
      return groupWrapper;
    };

    containerEl.appendChild(createGroup("🌅 Morning Shift (09:30 AM - 12:30 PM)", CLINIC_SLOTS.morning));
    containerEl.appendChild(createGroup("🌆 Evening Shift (04:00 PM - 07:00 PM)", CLINIC_SLOTS.evening));
  } catch (err) {
    containerEl.innerHTML = '<p class="slots-loading-text">Unable to load slots. Please check connection.</p>';
  }
}

if (bookingForm) {
  const patient = JSON.parse(localStorage.getItem("patient"));

  if (!patient) {
    bookingForm.style.display = "none";
    bookingMessage.innerHTML = `
      Please login as patient first.
      <br>
      <a href="login.html?role=patient&next=booking.html">Go to Patient Login</a>
    `;
    window.location.href = "login.html?role=patient&next=booking.html";
  } else if (loggedPatientInfo) {
    loggedPatientInfo.textContent = `Booking appointment for: ${patient.patient_name}`;
  }

  const doctorSelectEl = document.getElementById("doctorSelect");
  const appointmentDateEl = document.getElementById("appointmentDate");
  const appointmentTimeEl = document.getElementById("appointmentTime");
  const timeSlotsSectionEl = document.getElementById("timeSlotsSection");
  const timeSlotsContainerEl = document.getElementById("timeSlotsContainer");
  const selectedSlotNoticeEl = document.getElementById("selectedSlotNotice");

  if (appointmentDateEl) {
    appointmentDateEl.min = new Date().toISOString().split("T")[0];
  }

  const triggerSlotRefresh = () => {
    renderSlotPicker({
      doctorId: doctorSelectEl?.value,
      date: appointmentDateEl?.value,
      sectionEl: timeSlotsSectionEl,
      containerEl: timeSlotsContainerEl,
      hiddenInput: appointmentTimeEl,
      noticeEl: selectedSlotNoticeEl,
    });
  };

  if (doctorSelectEl) doctorSelectEl.addEventListener("change", triggerSlotRefresh);
  if (appointmentDateEl) appointmentDateEl.addEventListener("change", triggerSlotRefresh);

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!appointmentTimeEl.value) {
      bookingMessage.textContent = "Please select an available 30-minute time slot above.";
      bookingMessage.style.color = "#ef4444";
      return;
    }

    const appointmentData = {
      patient_id: patient.patient_id,
      doctor_id: doctorSelectEl.value,
      appointment_date: appointmentDateEl.value,
      appointment_time: appointmentTimeEl.value,
      status: "Pending",
    };

    const appointmentResponse = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    });

    const appointmentResult = await appointmentResponse.json();

    bookingMessage.textContent = appointmentResult.message;
    bookingMessage.style.color = appointmentResponse.ok ? "#059669" : "#ef4444";

    if (appointmentResponse.ok) {
      bookingForm.reset();
      if (timeSlotsSectionEl) timeSlotsSectionEl.hidden = true;
      if (selectedSlotNoticeEl) selectedSlotNoticeEl.textContent = "";
    }
  });
}

// Booking Modal for Home / Doctors pages
const bookingModal = document.getElementById("bookingModal");
const homeBookingForm = document.getElementById("homeBookingForm");

if (bookingModal) {
  const modalDoctorSelect = document.getElementById("modalDoctorSelect");
  const modalAppointmentDate = document.getElementById("modalAppointmentDate");
  const modalAppointmentTime = document.getElementById("modalAppointmentTime");
  const modalBookingMessage = document.getElementById("modalBookingMessage");
  const modalPatientInfo = document.getElementById("modalPatientInfo");
  const modalLoginPrompt = document.getElementById("modalLoginPrompt");
  const modalTimeSlotsSection = document.getElementById("modalTimeSlotsSection");
  const modalTimeSlotsContainer = document.getElementById("modalTimeSlotsContainer");
  const modalSelectedSlotNotice = document.getElementById("modalSelectedSlotNotice");

  if (modalAppointmentDate) {
    modalAppointmentDate.min = new Date().toISOString().split("T")[0];
  }

  const triggerModalSlotRefresh = () => {
    renderSlotPicker({
      doctorId: modalDoctorSelect?.value,
      date: modalAppointmentDate?.value,
      sectionEl: modalTimeSlotsSection,
      containerEl: modalTimeSlotsContainer,
      hiddenInput: modalAppointmentTime,
      noticeEl: modalSelectedSlotNotice,
    });
  };

  if (modalDoctorSelect) modalDoctorSelect.addEventListener("change", triggerModalSlotRefresh);
  if (modalAppointmentDate) modalAppointmentDate.addEventListener("change", triggerModalSlotRefresh);

  if (modalDoctorSelect && modalDoctorSelect.options.length <= 1) {
    fetch("/api/doctors")
      .then((res) => res.json())
      .then((docs) => {
        docs.forEach((doc) => {
          const opt = document.createElement("option");
          opt.value = doc.doctor_id;
          opt.textContent = `${doc.doctor_name} - ${doc.specialization}`;
          modalDoctorSelect.appendChild(opt);
        });
      })
      .catch(() => {});
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-booking-modal]");
    if (!btn) return;

    const patient = JSON.parse(localStorage.getItem("patient"));
    bookingModal.classList.add("is-open");
    bookingModal.setAttribute("aria-hidden", "false");

    if (patient) {
      if (modalPatientInfo) modalPatientInfo.textContent = `Booking for: ${patient.patient_name}`;
      if (homeBookingForm) homeBookingForm.hidden = false;
      if (modalLoginPrompt) modalLoginPrompt.hidden = true;
    } else {
      if (modalPatientInfo) modalPatientInfo.textContent = "";
      if (homeBookingForm) homeBookingForm.hidden = true;
      if (modalLoginPrompt) modalLoginPrompt.hidden = false;
    }

    const doctorId = btn.dataset.doctorId;
    if (doctorId && modalDoctorSelect) {
      modalDoctorSelect.value = doctorId;
      triggerModalSlotRefresh();
    }
  });

  bookingModal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      bookingModal.classList.remove("is-open");
      bookingModal.setAttribute("aria-hidden", "true");
    });
  });

  if (homeBookingForm) {
    homeBookingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const patient = JSON.parse(localStorage.getItem("patient"));

      if (!modalAppointmentTime.value) {
        modalBookingMessage.textContent = "Please select an available 30-minute time slot above.";
        modalBookingMessage.style.color = "#ef4444";
        return;
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient.patient_id,
          doctor_id: modalDoctorSelect.value,
          appointment_date: modalAppointmentDate.value,
          appointment_time: modalAppointmentTime.value,
          status: "Pending",
        }),
      });

      const result = await response.json();
      modalBookingMessage.textContent = result.message;
      modalBookingMessage.style.color = response.ok ? "#059669" : "#ef4444";

      if (response.ok) {
        homeBookingForm.reset();
        if (modalTimeSlotsSection) modalTimeSlotsSection.hidden = true;
        if (modalSelectedSlotNotice) modalSelectedSlotNotice.textContent = "";
      }
    });
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const patientData = {
      patient_name: document.getElementById("patientName").value,
      age: document.getElementById("patientAge").value,
      gender: document.getElementById("patientGender").value,
      phone: document.getElementById("patientPhone").value,
      address: document.getElementById("patientAddress").value,
      username: document.getElementById("patientUsername").value,
      password: document.getElementById("patientPassword").value,
    };

    const response = await fetch("/api/patients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    });

    const result = await response.json();

    if (!response.ok) {
      registerMessage.textContent = result.message;
      return;
    }

    registerMessage.innerHTML = `
      Patient registered successfully.
      <br>
      <a href="login.html?role=patient&next=booking.html">Login now</a>
    `;
    registerForm.reset();
  });
}



if (addDoctorForm) {
  const admin = JSON.parse(localStorage.getItem("admin"));

  if (!admin) {
    window.location.href = "login.html?role=admin&next=admin.html";
  }

  addDoctorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const doctorData = {
      doctor_name: document.getElementById("doctorName").value,
      specialization: document.getElementById("doctorSpecialization").value,
      phone: document.getElementById("doctorPhone").value,
      department_id: document.getElementById("departmentSelect").value,
      username: document.getElementById("doctorUsername").value,
      password: document.getElementById("doctorPassword").value,
    };

    const response = await fetch("/api/doctors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(doctorData),
    });

    const result = await response.json();
    doctorMessage.textContent = result.message;
    addDoctorForm.reset();
  });
}

if (loginForm) {
  const params = new URLSearchParams(window.location.search);
  const fixedRole = params.get("role");
  const nextPage = params.get("next");
  const loginRole = document.getElementById("loginRole");
  const roleBox = document.getElementById("roleBox");

  const loggedUser = getLoggedInUser();
  if (loggedUser) {
    const banner = document.createElement("div");
    banner.className = "auth-already-logged-in-banner";
    banner.innerHTML = `
      <p style="margin:0 0 8px 0; font-size:0.92rem;">
        You are currently signed in as <strong>${escapeHtml(loggedUser.name)}</strong> (${escapeHtml(loggedUser.role.toUpperCase())}).
      </p>
      <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:10px;">
        <a href="${loggedUser.dashboardUrl}" class="button-link" style="padding:6px 14px; font-size:0.85rem; width:auto; text-decoration:none;">Go to Your Dashboard</a>
        <button type="button" class="logoutBtn button-link secondary" style="padding:6px 14px; font-size:0.85rem; width:auto;">Logout &amp; Switch Account</button>
      </div>
    `;
    loginForm.parentNode.insertBefore(banner, loginForm);
  }

  if (fixedRole) {
    loginRole.value = fixedRole;
    roleBox.style.display = "none";

    if (fixedRole === "patient") {
      document.querySelector("h2").textContent = "Patient Login";
      loginMessage.innerHTML = `
        Login first to book your appointment.
        <br>
        New patient? <a href="register.html">Create patient account</a>
      `;
    } else if (fixedRole === "doctor") {
      document.querySelector("h2").textContent = "Doctor Login";
      loginMessage.textContent = "Login first to open doctor dashboard.";
    } else if (fixedRole === "admin") {
      document.querySelector("h2").textContent = "Admin Login";
      loginMessage.textContent = "Login first to open admin panel.";
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const role = loginRole ? loginRole.value.trim() : "";
    const username = (document.getElementById("loginUsername")?.value || "").trim();
    const password = (document.getElementById("loginPassword")?.value || "").trim();

    if (!role) {
      loginMessage.textContent = "Please select your role (Admin, Doctor, or Patient).";
      loginMessage.style.color = "#dc2626";
      return;
    }

    const submitBtn = document.getElementById("loginSubmitBtn") || loginForm.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";
    }
    loginMessage.textContent = "";

    try {
      const response = await fetch(`/api/${role}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { message: "Server returned unexpected response." };
      }

      if (!response.ok) {
        loginMessage.textContent = result.message || "Invalid credentials.";
        loginMessage.style.color = "#dc2626";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Login";
        }
        return;
      }

      loginMessage.textContent = "✓ Login successful! Redirecting...";
      loginMessage.style.color = "#16a34a";

      if (role === "admin") {
        localStorage.setItem("admin", JSON.stringify(result.admin));
        window.location.href = nextPage || "admin.html";
      } else if (role === "doctor") {
        localStorage.setItem("doctor", JSON.stringify(result.doctor));
        window.location.href = nextPage || "doctor-dashboard.html";
      } else {
        localStorage.setItem("patient", JSON.stringify(result.patient));
        window.location.href = nextPage || "patient-dashboard.html";
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      loginMessage.textContent = "Cannot connect to server. Please ensure you are on the same Wi-Fi network.";
      loginMessage.style.color = "#dc2626";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
      }
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

if (doctorAppointmentsList) {
  const doctor = JSON.parse(localStorage.getItem("doctor"));

  if (!doctor) {
    window.location.href = "login.html?role=doctor&next=doctor-dashboard.html";
  } else {
    const welcomeEl = document.getElementById("doctorWelcome");
    if (welcomeEl) {
      welcomeEl.textContent = `${doctor.doctor_name} - Appointments & Prescriptions`;
    }

    const prescriptionModal = document.getElementById("prescriptionModal");
    const prescriptionForm = document.getElementById("prescriptionForm");
    const rxAppointmentId = document.getElementById("rxAppointmentId");
    const rxDiagnosis = document.getElementById("rxDiagnosis");
    const rxMedicines = document.getElementById("rxMedicines");
    const rxInstructions = document.getElementById("rxInstructions");
    const rxModalTitle = document.getElementById("rxModalTitle");
    const rxModalPatientSub = document.getElementById("rxModalPatientSub");
    const rxFormMessage = document.getElementById("rxFormMessage");
    const closeRxModalBtn = document.getElementById("closeRxModalBtn");
    const cancelRxModalBtn = document.getElementById("cancelRxModalBtn");

    const billModal = document.getElementById("billModal");
    const billForm = document.getElementById("billForm");
    const billAppointmentId = document.getElementById("billAppointmentId");
    const billModalPatientSub = document.getElementById("billModalPatientSub");
    const billAmount = document.getElementById("billAmount");
    const billPaymentStatus = document.getElementById("billPaymentStatus");
    const billFormMessage = document.getElementById("billFormMessage");
    const closeBillModalBtn = document.getElementById("closeBillModalBtn");
    const cancelBillModalBtn = document.getElementById("cancelBillModalBtn");

    let appointmentsCache = [];
    let currentStatusFilter = "Confirmed";
    let toastTimer = null;

    const showDoctorToast = (message, isError = false) => {
      const toast = document.getElementById("doctorStatusToast");
      if (!toast) return;
      toast.textContent = message;
      toast.className = `doctor-toast ${isError ? "doctor-toast-error" : "doctor-toast-success"}`;
      toast.hidden = false;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, 3200);
    };

    const updateAppointmentStatus = async (appointmentId, newStatus) => {
      try {
        const response = await fetch(`/api/appointments/${appointmentId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        const data = await response.json();
        if (!response.ok) {
          showDoctorToast(data.message || "Failed to update appointment status.", true);
          return false;
        }

        const item = appointmentsCache.find((a) => Number(a.appointment_id) === Number(appointmentId));
        if (item) {
          item.status = newStatus;
        }

        const successMsg =
          newStatus === "Completed"
            ? `Checkup marked as DONE for Appointment #${appointmentId}! Admin panel notified.`
            : newStatus === "Confirmed"
            ? `Appointment #${appointmentId} confirmed & added to active queue!`
            : `Appointment #${appointmentId} marked as "${newStatus}"!`;
        showDoctorToast(successMsg);
        updateStats();
        renderDoctorAppointments();
        return true;
      } catch (err) {
        console.error("Error updating appointment status:", err);
        showDoctorToast("Network error updating status. Please try again.", true);
        return false;
      }
    };

    const updateStats = () => {
      const total = appointmentsCache.length;
      const confirmed = appointmentsCache.filter((a) => a.status === "Confirmed").length;
      const completed = appointmentsCache.filter((a) => a.status === "Completed").length;
      const pending = appointmentsCache.filter((a) => a.status === "Pending").length;
      const cancelled = appointmentsCache.filter((a) => a.status === "Cancelled").length;

      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setTxt("statConfirmedCount", confirmed);
      setTxt("statCompletedCount", completed);
      setTxt("statTotalCount", total);
      setTxt("statPendingCount", pending);
      setTxt("statCancelledCount", cancelled);
    };

    const renderDoctorAppointments = () => {
      doctorAppointmentsList.innerHTML = "";

      const filtered = appointmentsCache.filter((apt) => {
        if (currentStatusFilter === "all") return true;
        return apt.status === currentStatusFilter;
      });

      if (filtered.length === 0) {
        const messages = {
          Confirmed: "No active patients in your consultation queue right now.",
          Completed: "No completed checkups recorded yet.",
          Pending: "No appointments waiting for Admin approval.",
          all: "You have no appointments scheduled.",
        };
        doctorAppointmentsList.innerHTML = `
          <div class="empty-search-box">
            <h3>${currentStatusFilter === "Confirmed" ? "Consultation Queue Clear ✨" : "No Appointments Found"}</h3>
            <p>${messages[currentStatusFilter] || `There are currently no appointments marked as "${currentStatusFilter}".`}</p>
          </div>
        `;
        return;
      }

      filtered.forEach((appointment) => {
        const div = document.createElement("div");
        const status = appointment.status || "Pending";
        div.className = `card appointment-card-modern apt-card-status-${status.toLowerCase()}`;

        const hasRx = Boolean(appointment.prescription_id || appointment.diagnosis);

        div.innerHTML = `
          <div class="apt-header">
            <div>
              <h3 style="margin:0 0 4px 0;">${escapeHtml(appointment.patient_name)}</h3>
              <span class="apt-subtext">Age: ${appointment.age || "N/A"} yrs | ${appointment.gender || "N/A"} | 📞 ${appointment.phone || "N/A"}</span>
            </div>
            
            <!-- Doctor Direct Status Selector -->
            <div class="doctor-status-control-box">
              <label class="doctor-status-label" for="status-select-${appointment.appointment_id}">Status:</label>
              <select class="doctorStatusSelect status-select-${status.toLowerCase()}" id="status-select-${appointment.appointment_id}" data-id="${appointment.appointment_id}">
                <option value="Confirmed" ${status === "Confirmed" ? "selected" : ""}>🩺 Confirmed (Active)</option>
                <option value="Completed" ${status === "Completed" ? "selected" : ""}>🏁 Checkup Done</option>
                <option value="Pending" ${status === "Pending" ? "selected" : ""}>⏳ Pending Admin Approval</option>
                <option value="Cancelled" ${status === "Cancelled" ? "selected" : ""}>❌ Cancelled</option>
              </select>
            </div>
          </div>

          <div class="apt-meta-row">
            <span class="appointment-meta-chip">📅 Date: ${appointment.appointment_date}</span>
            <span class="appointment-meta-chip">⏰ Slot: ${appointment.appointment_time}</span>
            <span class="appointment-meta-chip"># Apt: ${appointment.appointment_id}</span>
          </div>

          ${status === "Completed" ? `
            <div class="rx-summary-card" style="background:#ecfdf5; border-color:#a7f3d0;">
              <div class="rx-summary-badge" style="background:#d1fae5; color:#065f46;">🏁 Official Checkup Finished</div>
              <p class="rx-diag-snippet"><strong>Diagnosis:</strong> ${escapeHtml(appointment.diagnosis || "Checkup completed by doctor.")}</p>
              ${appointment.medicines ? `<p class="rx-meds-snippet"><strong>Medicines:</strong> ${escapeHtml(appointment.medicines.split("\n")[0])}${appointment.medicines.includes("\n") ? "..." : ""}</p>` : ""}
            </div>
          ` : hasRx ? `
            <div class="rx-summary-card">
              <div class="rx-summary-badge">✓ Official Rx Saved</div>
              <p class="rx-diag-snippet"><strong>Diagnosis:</strong> ${escapeHtml(appointment.diagnosis || "")}</p>
              <p class="rx-meds-snippet"><strong>Medicines:</strong> ${escapeHtml((appointment.medicines || "").split("\n")[0])}${appointment.medicines && appointment.medicines.includes("\n") ? "..." : ""}</p>
            </div>
          ` : `
            <div class="rx-pending-banner">
              <span>ℹ️ Patient ready for consultation. Write prescription and mark checkup done once examined.</span>
            </div>
          `}

          <div class="apt-action-toolbar">
            <!-- Checkup & Status Actions -->
            <div class="doctor-quick-actions">
              ${status === "Confirmed" ? `
                <button type="button" class="btn-action btn-checkup-done" data-id="${appointment.appointment_id}" title="Mark patient checkup as completed">
                  🩺 Checkup Done
                </button>
                <button type="button" class="btn-action btn-quick-cancel" data-id="${appointment.appointment_id}" title="Cancel this appointment">
                  ❌ Cancel
                </button>
              ` : status === "Completed" ? `
                <span class="status-done-tag">✅ Checkup Done</span>
                <button type="button" class="btn-action btn-reopen-consult" data-id="${appointment.appointment_id}" title="Reopen this consultation">
                  🔄 Reopen
                </button>
              ` : `
                <button type="button" class="btn-action btn-quick-confirm" data-id="${appointment.appointment_id}" title="Accept & Confirm">
                  ✅ Confirm Patient
                </button>
              `}
            </div>

            <!-- Clinical Tools (Rx & Bill) -->
            <div class="doctor-clinical-actions">
              ${hasRx ? `
                <a href="/api/appointments/${appointment.appointment_id}/prescription/pdf" target="_blank" class="pdf-btn rx-btn">
                  📄 View Rx (PDF)
                </a>
                <button type="button" class="btn-action btn-edit-rx" data-id="${appointment.appointment_id}">
                  ✏️ Edit Rx
                </button>
              ` : `
                <button type="button" class="btn-action btn-write-rx" data-id="${appointment.appointment_id}">
                  ✍️ Write Prescription
                </button>
              `}
              <button type="button" class="btn-action btn-make-bill" data-id="${appointment.appointment_id}">
                🧾 Issue / View Bill
              </button>
            </div>
          </div>
        `;

        doctorAppointmentsList.appendChild(div);
      });
    };

    const loadDoctorAppointments = () => {
      fetch(`/api/doctor/${doctor.doctor_id}/appointments`)
        .then((response) => response.json())
        .then((appointments) => {
          appointmentsCache = appointments;
          updateStats();
          renderDoctorAppointments();
        })
        .catch((err) => {
          console.error("Error loading doctor appointments:", err);
          doctorAppointmentsList.innerHTML = "<p>Error loading appointments.</p>";
        });
    };

    loadDoctorAppointments();

    // Stat cards click listeners for status filtering
    const setupFilterListeners = () => {
      const statCards = document.querySelectorAll("#doctorStatsGrid .doctor-stat-card");

      const applyFilter = (filter) => {
        currentStatusFilter = filter;
        statCards.forEach((card) => {
          card.classList.toggle("active", card.dataset.filter === filter);
        });
        renderDoctorAppointments();
      };

      statCards.forEach((card) => {
        card.addEventListener("click", () => applyFilter(card.dataset.filter));
      });
    };

    setupFilterListeners();

    // Modal helpers
    const openRxModal = (apt) => {
      if (!prescriptionModal) return;
      rxAppointmentId.value = apt.appointment_id;
      rxModalTitle.textContent = apt.diagnosis ? "✏️ Edit Digital Prescription" : "✍️ Write Digital Prescription";
      rxModalPatientSub.textContent = `Patient: ${apt.patient_name} | Age: ${apt.age || "N/A"} | Date: ${apt.appointment_date}`;
      rxDiagnosis.value = apt.diagnosis || "";
      rxMedicines.value = apt.medicines || "";
      rxInstructions.value = apt.instructions || "";
      rxFormMessage.textContent = "";
      prescriptionModal.hidden = false;
    };

    const closeRxModal = () => {
      if (prescriptionModal) prescriptionModal.hidden = true;
    };

    if (closeRxModalBtn) closeRxModalBtn.addEventListener("click", closeRxModal);
    if (cancelRxModalBtn) cancelRxModalBtn.addEventListener("click", closeRxModal);

    const openBillModal = (apt) => {
      if (!billModal) return;
      billAppointmentId.value = apt.appointment_id;
      billModalPatientSub.textContent = `Patient: ${apt.patient_name} | Date: ${apt.appointment_date} at ${apt.appointment_time}`;
      billAmount.value = 500;
      billPaymentStatus.value = "Paid";
      billFormMessage.textContent = "";
      billModal.hidden = false;
    };

    const closeBillModal = () => {
      if (billModal) billModal.hidden = true;
    };

    if (closeBillModalBtn) closeBillModalBtn.addEventListener("click", closeBillModal);
    if (cancelBillModalBtn) cancelBillModalBtn.addEventListener("click", closeBillModal);

    // Event delegation for cards: change dropdown & buttons
    doctorAppointmentsList.addEventListener("change", (e) => {
      if (e.target.classList.contains("doctorStatusSelect")) {
        const appointmentId = e.target.dataset.id;
        const newStatus = e.target.value;
        updateAppointmentStatus(appointmentId, newStatus);
      }
    });

    doctorAppointmentsList.addEventListener("click", (e) => {
      const checkupDoneBtn = e.target.closest(".btn-checkup-done");
      if (checkupDoneBtn) {
        updateAppointmentStatus(checkupDoneBtn.dataset.id, "Completed");
        return;
      }

      const reopenBtn = e.target.closest(".btn-reopen-consult");
      if (reopenBtn) {
        updateAppointmentStatus(reopenBtn.dataset.id, "Confirmed");
        return;
      }

      const confirmBtn = e.target.closest(".btn-quick-confirm");
      if (confirmBtn) {
        updateAppointmentStatus(confirmBtn.dataset.id, "Confirmed");
        return;
      }

      const cancelBtn = e.target.closest(".btn-quick-cancel");
      if (cancelBtn) {
        if (confirm("Are you sure you want to cancel this appointment?")) {
          updateAppointmentStatus(cancelBtn.dataset.id, "Cancelled");
        }
        return;
      }

      const writeBtn = e.target.closest(".btn-write-rx, .btn-edit-rx");
      if (writeBtn) {
        const id = Number(writeBtn.dataset.id);
        const apt = appointmentsCache.find((a) => Number(a.appointment_id) === id);
        if (apt) openRxModal(apt);
        return;
      }

      const billBtn = e.target.closest(".btn-make-bill");
      if (billBtn) {
        const id = Number(billBtn.dataset.id);
        const apt = appointmentsCache.find((a) => Number(a.appointment_id) === id);
        if (apt) openBillModal(apt);
      }
    });

    // Prescription form submission
    if (prescriptionForm) {
      prescriptionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const aptId = rxAppointmentId.value;
        const apt = appointmentsCache.find((a) => String(a.appointment_id) === String(aptId));
        const isUpdate = Boolean(apt && apt.diagnosis);

        const url = `/api/appointments/${aptId}/prescription`;
        const method = isUpdate ? "PUT" : "POST";

        try {
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              diagnosis: rxDiagnosis.value.trim(),
              medicines: rxMedicines.value.trim(),
              instructions: rxInstructions.value.trim(),
            }),
          });
          const data = await res.json();
          rxFormMessage.textContent = data.message || "Prescription saved successfully!";
          rxFormMessage.style.color = res.ok ? "#059669" : "#dc2626";

          if (res.ok) {
            setTimeout(() => {
              closeRxModal();
              loadDoctorAppointments();
            }, 800);
          }
        } catch (err) {
          rxFormMessage.textContent = "Error saving prescription. Please try again.";
          rxFormMessage.style.color = "#dc2626";
        }
      });
    }

    // Bill form submission
    if (billForm) {
      billForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const aptId = billAppointmentId.value;

        try {
          const res = await fetch(`/api/appointments/${aptId}/bill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(billAmount.value),
              payment_status: billPaymentStatus.value,
            }),
          });
          const data = await res.json();
          billFormMessage.textContent = data.message || "Bill generated successfully!";
          billFormMessage.style.color = res.ok ? "#059669" : "#dc2626";

          if (res.ok) {
            setTimeout(() => {
              closeBillModal();
              if (data.bill_id) {
                window.open(`/api/bills/${data.bill_id}/pdf`, "_blank");
              }
              loadDoctorAppointments();
            }, 800);
          }
        } catch (err) {
          billFormMessage.textContent = "Error generating bill.";
          billFormMessage.style.color = "#dc2626";
        }
      });
    }
  }
}

// Doctor Profile Summary & Address Editor (doctor-my-profile.html)
const doctorProfileSummary = document.getElementById("doctorProfileSummary");
if (doctorProfileSummary) {
  let doctor = JSON.parse(localStorage.getItem("doctor"));

  if (!doctor) {
    window.location.href = "login.html?role=doctor&next=doctor-my-profile.html";
  } else {
    // Fetch latest profile from API to ensure we have the most current address from DB
    fetch(`/api/doctors/${doctor.doctor_id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((freshDoc) => {
        if (freshDoc) {
          doctor = { ...doctor, ...freshDoc };
          localStorage.setItem("doctor", JSON.stringify(doctor));
        }
        renderDoctorProfileView();
      })
      .catch(() => {
        renderDoctorProfileView();
      });

    function renderDoctorProfileView() {
      const docName = typeof formatDoctorName === "function" ? formatDoctorName(doctor.doctor_name) : (doctor.doctor_name || "Doctor");
      const initials = docName.replace(/^Dr\.?\s*/i, "").substring(0, 2).toUpperCase() || "DR";
      const docAddress = doctor.address || "OPD Clinic, Room 102, City Hospital";

      doctorProfileSummary.innerHTML = `
        <div class="profile-card doctor-profile-modern-card" id="doctorViewCard">
          <div class="profile-header" style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="doctor-avatar" style="width: 56px; height: 56px; font-size: 1.15rem; flex-shrink: 0;">${initials}</div>
              <div>
                <h3 style="margin: 0 0 4px 0; font-size: 1.25rem;">${escapeHtml(docName)}</h3>
                <span class="appointment-status-pill status-badge-confirmed" style="font-size: 0.74rem;">🩺 ${escapeHtml(doctor.specialization || "Specialist Physician")}</span>
              </div>
            </div>
            <button type="button" id="toggleEditDoctorBtn" class="button-link" style="padding: 8px 16px; font-size: 0.88rem; width: auto;">
              ✏️ Edit Address &amp; Profile
            </button>
          </div>

          <div class="profile-details-grid">
            <p><strong>🆔 Doctor ID:</strong> #${doctor.doctor_id}</p>
            <p><strong>👤 Username:</strong> ${escapeHtml(doctor.username || "N/A")}</p>
            <p><strong>📞 Contact Phone:</strong> ${escapeHtml(doctor.phone || "N/A")}</p>
            <p><strong>🏥 Department:</strong> ${escapeHtml(doctor.department_name || "Specialist Wing")}</p>
            <p style="grid-column: 1 / -1;"><strong>📍 Clinic / OPD Address:</strong> <span id="displayDoctorAddress" style="color: #0369a1; font-weight: 600;">${escapeHtml(docAddress)}</span></p>
          </div>

          <div style="margin-top: 18px; display: flex; gap: 12px; flex-wrap: wrap;">
            <a href="doctor-dashboard.html" class="button-link" style="width: auto; text-decoration: none;">🩺 View Today's Schedule</a>
            <a href="index.html" class="button-link secondary" style="width: auto; text-decoration: none;">🏠 Hospital Home</a>
            <button type="button" class="logoutBtn button-link secondary" style="width: auto;">Logout</button>
          </div>
        </div>

        <!-- Inline Edit Form (Hidden by default) -->
        <div class="doctor-edit-profile-card" id="doctorEditCard" style="display: none; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.15rem; color: #0f172a;">✏️ Edit Profile &amp; Practice Address</h3>
            <button type="button" id="cancelEditDoctorBtnTop" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b;">✕</button>
          </div>

          <form id="doctorEditProfileForm">
            <div class="doctor-edit-form-grid">
              <div class="edit-form-field">
                <label for="editDoctorName">Doctor Full Name *</label>
                <input type="text" id="editDoctorName" value="${escapeHtml(doctor.doctor_name || "")}" required>
              </div>

              <div class="edit-form-field">
                <label for="editDoctorPhone">Contact Phone Number *</label>
                <input type="text" id="editDoctorPhone" value="${escapeHtml(doctor.phone || "")}" required>
              </div>

              <div class="edit-form-field full-col">
                <label for="editDoctorSpec">Specialization *</label>
                <select id="editDoctorSpec" required>
                  <option value="Heart Specialist" ${doctor.specialization === "Heart Specialist" ? "selected" : ""}>Heart Specialist</option>
                  <option value="Brain Specialist" ${doctor.specialization === "Brain Specialist" ? "selected" : ""}>Brain Specialist</option>
                  <option value="Bone Specialist" ${doctor.specialization === "Bone Specialist" ? "selected" : ""}>Bone Specialist</option>
                  <option value="General Physician" ${doctor.specialization === "General Physician" ? "selected" : ""}>General Physician</option>
                </select>
              </div>

              <div class="edit-form-field full-col">
                <label for="editDoctorAddress">📍 Clinic / OPD Chamber Address (Editable) *</label>
                <textarea id="editDoctorAddress" rows="3" placeholder="e.g. Room 102, Cardiology Wing, 1st Floor, City Hospital" required>${escapeHtml(doctor.address || "OPD Clinic, Room 102, City Hospital")}</textarea>
                <small style="color: #64748b; font-size: 0.78rem;">Patients and administrative records will reference this consultation address.</small>
              </div>
            </div>

            <p id="editDoctorStatusMsg" style="margin: 12px 0 0; font-size: 0.88rem; font-weight: 600; display: none;"></p>

            <div style="margin-top: 18px; display: flex; gap: 12px; align-items: center;">
              <button type="submit" id="saveDoctorProfileBtn" class="button-link" style="width: auto; padding: 10px 20px;">
                💾 Save Changes
              </button>
              <button type="button" id="cancelEditDoctorBtn" class="button-link secondary" style="width: auto; padding: 10px 16px;">
                Cancel
              </button>
            </div>
          </form>
        </div>
      `;

      const viewCard = document.getElementById("doctorViewCard");
      const editCard = document.getElementById("doctorEditCard");
      const toggleEditBtn = document.getElementById("toggleEditDoctorBtn");
      const cancelEditBtn = document.getElementById("cancelEditDoctorBtn");
      const cancelEditBtnTop = document.getElementById("cancelEditDoctorBtnTop");
      const editForm = document.getElementById("doctorEditProfileForm");
      const statusMsg = document.getElementById("editDoctorStatusMsg");

      const showEdit = () => {
        editCard.style.display = "block";
        viewCard.style.display = "none";
        statusMsg.style.display = "none";
      };

      const hideEdit = () => {
        editCard.style.display = "none";
        viewCard.style.display = "block";
      };

      if (toggleEditBtn) toggleEditBtn.addEventListener("click", showEdit);
      if (cancelEditBtn) cancelEditBtn.addEventListener("click", hideEdit);
      if (cancelEditBtnTop) cancelEditBtnTop.addEventListener("click", hideEdit);

      if (editForm) {
        editForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const saveBtn = document.getElementById("saveDoctorProfileBtn");
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";

          statusMsg.style.display = "none";

          const updatedData = {
            doctor_name: document.getElementById("editDoctorName").value.trim(),
            specialization: document.getElementById("editDoctorSpec").value.trim(),
            phone: document.getElementById("editDoctorPhone").value.trim(),
            address: document.getElementById("editDoctorAddress").value.trim(),
          };

          try {
            const resp = await fetch(`/api/doctors/${doctor.doctor_id}/profile`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedData),
            });

            const result = await resp.json();

            if (!resp.ok) {
              statusMsg.textContent = result.message || "Failed to update profile.";
              statusMsg.style.color = "#dc2626";
              statusMsg.style.display = "block";
              saveBtn.disabled = false;
              saveBtn.textContent = "💾 Save Changes";
              return;
            }

            // Successfully updated
            doctor = {
              ...doctor,
              ...updatedData,
              ...(result.doctor || {}),
            };
            localStorage.setItem("doctor", JSON.stringify(doctor));

            statusMsg.textContent = "✓ Address and profile details updated successfully!";
            statusMsg.style.color = "#16a34a";
            statusMsg.style.display = "block";

            setTimeout(() => {
              renderDoctorProfileView();
            }, 800);
          } catch (err) {
            statusMsg.textContent = "Network error. Please try again.";
            statusMsg.style.color = "#dc2626";
            statusMsg.style.display = "block";
            saveBtn.disabled = false;
            saveBtn.textContent = "💾 Save Changes";
          }
        });
      }
    }
  }
}

// Patient profile & appointments
if (patientProfile || patientAppointmentsList) {
  const patient = JSON.parse(localStorage.getItem("patient"));

  if (!patient) {
    window.location.href = "login.html?role=patient&next=patient-dashboard.html";
  } else {
    const welcomeEl = document.getElementById("patientWelcome");
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${patient.patient_name}`;
    }

    if (patientProfile) {
      patientProfile.innerHTML = `
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">${patient.patient_name ? patient.patient_name.substring(0, 2).toUpperCase() : "PT"}</div>
            <div>
              <h3>${escapeHtml(patient.patient_name)}</h3>
              <p>Registered Patient ID: #${patient.patient_id}</p>
            </div>
          </div>
          <div class="profile-details-grid">
            <p><strong>Age:</strong> ${patient.age || "N/A"} Yrs</p>
            <p><strong>Gender:</strong> ${patient.gender || "N/A"}</p>
            <p><strong>Phone:</strong> ${patient.phone || "N/A"}</p>
            <p><strong>Address:</strong> ${patient.address || "N/A"}</p>
          </div>
        </div>
      `;
    }

    if (patientAppointmentsList) {
      let patientAppointmentsCache = [];
      let patientToastTimer = null;

      const showPatientLiveToast = (msg) => {
        const toast = document.getElementById("patientLiveToast");
        if (!toast) return;
        toast.textContent = msg;
        toast.className = "doctor-toast doctor-toast-success";
        toast.hidden = false;
        if (patientToastTimer) clearTimeout(patientToastTimer);
        patientToastTimer = setTimeout(() => {
          toast.hidden = true;
        }, 4000);
      };

      const getLiveTrackerHtml = (status, doctorName, date, time) => {
        const s = (status || "Pending").toLowerCase();
        const docLabel = formatDoctorName(doctorName);

        if (s === "cancelled") {
          return `
            <div class="tracker-stepper-box tracker-cancelled-wrap">
              <div class="tracker-progress-track">
                <div class="tracker-step step-cancelled" style="margin: 0 auto; flex: none;">
                  <div class="step-circle">✕</div>
                  <div class="step-details">
                    <span class="step-title">Appointment Cancelled</span>
                    <span class="step-sub">Slot Released</span>
                  </div>
                </div>
              </div>
              <div class="tracker-narrative-box tracker-narrative-cancelled">
                <span class="narrative-icon">❌</span>
                <div class="narrative-text">
                  <strong class="narrative-title">Appointment Cancelled</strong>
                  <p class="narrative-desc">This consultation has been cancelled. You can easily book a new appointment whenever needed.</p>
                </div>
              </div>
            </div>
          `;
        }

        let step1Class = "step-done";
        let step1Icon = "✓";
        let step2Class = "step-waiting";
        let step2Icon = "2";
        let step3Class = "step-waiting";
        let step3Icon = "3";
        let progressWidth = "0%";

        let narrativeIcon = "⏳";
        let narrativeTitle = "Step 1: Awaiting Admin Approval";
        let narrativeDesc = "Your booking is in the hospital reception queue. Admin will verify details and assign your doctor slot shortly.";

        if (s === "pending") {
          step1Class = "step-active";
          step1Icon = "⏳";
          progressWidth = "0%";
        } else if (s === "confirmed") {
          step1Class = "step-done";
          step1Icon = "✓";
          step2Class = "step-active";
          step2Icon = "🩺";
          progressWidth = "50%";

          narrativeIcon = "🩺";
          narrativeTitle = "Step 2: Confirmed & In Doctor Queue";
          narrativeDesc = `Hospital Admin has confirmed your appointment! ${escapeHtml(docLabel)} is assigned for ${date} at ${time}. Please be available at the OPD.`;
        } else if (s === "completed") {
          step1Class = "step-done";
          step1Icon = "✓";
          step2Class = "step-done";
          step2Icon = "✓";
          step3Class = "step-done-all";
          step3Icon = "🏁";
          progressWidth = "100%";

          narrativeIcon = "✅";
          narrativeTitle = "Step 3: Consultation & Checkup Done!";
          narrativeDesc = `${escapeHtml(docLabel)} has completed your consultation. Your official digital prescription and invoice are generated below.`;
        }

        return `
          <div class="tracker-stepper-box">
            <div class="tracker-progress-track">
              <div class="tracker-progress-bar-bg">
                <div class="tracker-progress-bar-fill" style="width: ${progressWidth};"></div>
              </div>

              <div class="tracker-step ${step1Class}">
                <div class="step-circle">${step1Icon}</div>
                <div class="step-details">
                  <span class="step-title">1. Booked</span>
                  <span class="step-sub">Admin Review</span>
                </div>
              </div>

              <div class="tracker-step ${step2Class}">
                <div class="step-circle">${step2Icon}</div>
                <div class="step-details">
                  <span class="step-title">2. Confirmed</span>
                  <span class="step-sub">Doctor Queue</span>
                </div>
              </div>

              <div class="tracker-step ${step3Class}">
                <div class="step-circle">${step3Icon}</div>
                <div class="step-details">
                  <span class="step-title">3. Checkup Done</span>
                  <span class="step-sub">Rx & Bill Ready</span>
                </div>
              </div>
            </div>

            <div class="tracker-narrative-box tracker-narrative-${s}">
              <span class="narrative-icon">${narrativeIcon}</span>
              <div class="narrative-text">
                <strong class="narrative-title">${narrativeTitle}</strong>
                <p class="narrative-desc">${narrativeDesc}</p>
              </div>
            </div>
          </div>
        `;
      };

      const renderPatientAppointments = (appointments) => {
        patientAppointmentsList.innerHTML = "";

        if (!Array.isArray(appointments) || appointments.length === 0) {
          patientAppointmentsList.innerHTML = `
            <div class="empty-search-box">
              <h3>No Appointments Yet</h3>
              <p>You haven't booked any medical consultations yet.</p>
              <a href="booking.html" class="doctor-booking-btn" style="display:inline-flex; width:auto; text-decoration:none; margin-top:12px;">📅 Book an Appointment</a>
            </div>
          `;
          return;
        }

        appointments.forEach((appointment) => {
          const div = document.createElement("div");
          const status = appointment.status || "Pending";
          div.className = `card appointment-card-modern apt-card-status-${status.toLowerCase()}`;

          const hasRx = Boolean(appointment.diagnosis || appointment.medicines);

          div.innerHTML = `
            <div class="apt-header">
              <div>
                <h3 style="margin:0 0 4px 0;">${escapeHtml(formatDoctorName(appointment.doctor_name))}</h3>
                <span class="apt-subtext">Specialization: ${escapeHtml(appointment.specialization || "Doctor")}</span>
              </div>
              ${getStatusBadgeHtml(appointment.status)}
            </div>

            <div class="apt-meta-row">
              <span class="appointment-meta-chip">📅 Date: ${appointment.appointment_date}</span>
              <span class="appointment-meta-chip">⏰ Slot: ${appointment.appointment_time}</span>
              <span class="appointment-meta-chip"># Apt: ${appointment.appointment_id}</span>
            </div>

            <!-- Visual Live Stepper Tracker -->
            ${getLiveTrackerHtml(appointment.status, appointment.doctor_name, appointment.appointment_date, appointment.appointment_time)}

            ${hasRx ? `
              <div class="rx-summary-card" style="background:#ecfdf5; border-color:#a7f3d0; margin-top:10px;">
                <div class="rx-summary-badge" style="background:#d1fae5; color:#065f46;">🩺 Official Medical Prescription</div>
                <p class="rx-diag-snippet"><strong>Diagnosis:</strong> ${escapeHtml(appointment.diagnosis || "")}</p>
                ${appointment.medicines ? `<p class="rx-meds-snippet"><strong>Medicines:</strong> ${escapeHtml(appointment.medicines.split("\n")[0])}${appointment.medicines.includes("\n") ? "..." : ""}</p>` : ""}
              </div>
            ` : ""}

            <div class="apt-action-toolbar">
              ${hasRx ? `
                <a href="/api/appointments/${appointment.appointment_id}/prescription/pdf" target="_blank" class="pdf-btn rx-btn">
                  📄 Download Prescription (PDF)
                </a>
              ` : ""}

              ${appointment.bill_id ? `
                <a href="/api/bills/${appointment.bill_id}/pdf" target="_blank" class="pdf-btn bill-btn">
                  🧾 Download Bill (₹${Number(appointment.bill_amount).toFixed(2)})
                </a>
              ` : ""}
            </div>
          `;

          patientAppointmentsList.appendChild(div);
        });
      };

      const loadPatientAppointments = async (isSilent = false) => {
        try {
          const response = await fetch(`/api/patient/${patient.patient_id}/appointments`);
          const appointments = await response.json();

          if (patientAppointmentsCache.length > 0) {
            appointments.forEach((newApt) => {
              const oldApt = patientAppointmentsCache.find((o) => o.appointment_id === newApt.appointment_id);
              if (oldApt && oldApt.status !== newApt.status) {
                const statusLabel = newApt.status === "Completed" ? "Checkup Done! 🏁" : newApt.status;
                showPatientLiveToast(`Live Status Update: Appointment #${newApt.appointment_id} is now ${statusLabel}`);
              }
            });
          }

          patientAppointmentsCache = appointments;
          renderPatientAppointments(appointments);
        } catch (err) {
          if (!isSilent) {
            console.error("Error loading patient appointments:", err);
            patientAppointmentsList.innerHTML = "<p>Error loading appointments.</p>";
          }
        }
      };

      loadPatientAppointments();

      // Live Tracking Polling every 7 seconds (only when tab is visible)
      const livePollingInterval = setInterval(() => {
        if (!document.hidden) {
          loadPatientAppointments(true);
        }
      }, 7000);

      // Manual Refresh Button
      const manualRefreshBtn = document.getElementById("patientManualRefreshBtn");
      if (manualRefreshBtn) {
        manualRefreshBtn.addEventListener("click", () => {
          manualRefreshBtn.disabled = true;
          manualRefreshBtn.textContent = "⏳ Syncing...";
          loadPatientAppointments(false).finally(() => {
            setTimeout(() => {
              manualRefreshBtn.disabled = false;
              manualRefreshBtn.textContent = "🔄 Refresh";
            }, 600);
          });
        });
      }
    }
  }
}
