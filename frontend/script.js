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
const logoutButtons = document.querySelectorAll(".logoutBtn");

logoutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("patient");
    window.location.href = "login.html";
  });
});

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

function getStatusBadgeHtml(status) {
  const s = (status || "Pending").toLowerCase();
  let badgeClass = "status-badge-pending";
  let icon = "⏳";
  if (s === "confirmed") {
    badgeClass = "status-badge-confirmed";
    icon = "✓";
  } else if (s === "cancelled") {
    badgeClass = "status-badge-cancelled";
    icon = "✕";
  }
  return `<span class="appointment-status-pill ${badgeClass}">${icon} ${status || "Pending"}</span>`;
}

if (appointmentsList) {
  fetch("/api/appointments")
    .then((response) => response.json())
    .then((appointments) => {
      appointments.forEach((appointment) => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h3 style="margin:0;">Appointment #${appointment.appointment_id}</h3>
            ${getStatusBadgeHtml(appointment.status)}
          </div>
          <p><strong>Patient:</strong> ${appointment.patient_name}</p>
          <p><strong>Doctor:</strong> ${appointment.doctor_name}</p>
          <div style="margin: 8px 0 12px;">
            <span class="appointment-meta-chip">📅 ${appointment.appointment_date}</span>
            <span class="appointment-meta-chip">⏰ ${appointment.appointment_time}</span>
          </div>
          <select class="statusSelect" data-id="${appointment.appointment_id}">
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button class="updateStatusBtn" data-id="${appointment.appointment_id}">Update Status</button>
        `;

        appointmentsList.appendChild(div);

        div.querySelector(".statusSelect").value = appointment.status;
      });
    })
    .catch((error) => {
      console.log("Error loading appointments:", error);
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

if (appointmentsList) {
  appointmentsList.addEventListener("click", async (event) => {
    if (!event.target.classList.contains("updateStatusBtn")) {
      return;
    }

    const appointmentId = event.target.dataset.id;
    const status =
      event.target.parentElement.querySelector(".statusSelect").value;

    const response = await fetch(`/api/appointments/${appointmentId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();
    alert(result.message);
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

    const role = loginRole.value;
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const response = await fetch(`/api/${role}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      loginMessage.textContent = result.message;
      return;
    }

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
  });
}

if (doctorAppointmentsList) {
  const doctor = JSON.parse(localStorage.getItem("doctor"));

  if (!doctor) {
    window.location.href = "login.html?role=doctor&next=doctor-dashboard.html";
  } else {
    document.getElementById("doctorWelcome").textContent =
      `${doctor.doctor_name} Appointments`;

    fetch(`/api/doctor/${doctor.doctor_id}/appointments`)
      .then((response) => response.json())
      .then((appointments) => {
        appointments.forEach((appointment) => {
          const div = document.createElement("div");
          div.className = "card";

          div.innerHTML = `
            <h3>${appointment.patient_name}</h3>
            <p>Age: ${appointment.age}</p>
            <p>Gender: ${appointment.gender}</p>
            <p>Phone: ${appointment.phone}</p>
            <p>Date: ${appointment.appointment_date}</p>
            <p>Time: ${appointment.appointment_time}</p>
            <p>Status: ${appointment.status}</p>
          `;

          doctorAppointmentsList.appendChild(div);
        });
      });
  }
}

if (patientAppointmentsList) {
  const patient = JSON.parse(localStorage.getItem("patient"));

  if (!patient) {
    window.location.href =
      "login.html?role=patient&next=patient-dashboard.html";
  } else {
    document.getElementById("patientWelcome").textContent =
      `Welcome, ${patient.patient_name}`;

    if (patientProfile) {
      patientProfile.innerHTML = `
        <div class="profile-card">
          <p><strong>Patient ID:</strong> ${patient.patient_id}</p>
          <p><strong>Name:</strong> ${patient.patient_name}</p>
          <p><strong>Age:</strong> ${patient.age}</p>
          <p><strong>Gender:</strong> ${patient.gender}</p>
          <p><strong>Phone:</strong> ${patient.phone}</p>
          <p><strong>Address:</strong> ${patient.address}</p>
        </div>
      `;
    }

    fetch(`/api/patient/${patient.patient_id}/appointments`)
      .then((response) => response.json())
      .then((appointments) => {
        appointments.forEach((appointment) => {
          const div = document.createElement("div");
          div.className = "card";

          div.innerHTML = `
            <h3>${appointment.doctor_name}</h3>
            <p>Specialization: ${appointment.specialization}</p>
            <p>Date: ${appointment.appointment_date}</p>
            <p>Time: ${appointment.appointment_time}</p>
            <p>Status: ${appointment.status}</p>
          `;

          patientAppointmentsList.appendChild(div);
        });
      });
  }
}
