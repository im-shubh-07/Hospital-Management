const departmentsList = document.getElementById("departmentsList");
const doctorsList = document.getElementById("doctorsList");
const doctorSelect = document.getElementById("doctorSelect");
const modalDoctorSelect = document.getElementById("modalDoctorSelect");
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
const doctorProfile = document.getElementById("doctorProfile");
const loginMessage = document.getElementById("loginMessage");
const doctorAppointmentsList = document.getElementById("doctorAppointmentsList");
const doctorProfileSummary = document.getElementById("doctorProfileSummary");
const patientProfile = document.getElementById("patientProfile");
const patientAppointmentsList = document.getElementById("patientAppointmentsList");
const logoutButtons = document.querySelectorAll(".logoutBtn");
const bookingModal = document.getElementById("bookingModal");
const openBookingModalButtons = document.querySelectorAll("[data-open-booking-modal]");
const homeBookingForm = document.getElementById("homeBookingForm");
let pendingModalDoctorId = null;
const requestedDoctorId = new URLSearchParams(window.location.search).get("doctor");

function isValidId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function getInitials(name) {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function logout() {
  localStorage.removeItem("admin");
  localStorage.removeItem("doctor");
  localStorage.removeItem("patient");
  window.location.href = "index.html";
}

function getActiveSession() {
  const roles = [
    { key: "admin", label: "Admin Panel", page: "admin.html" },
    { key: "doctor", label: "Doctor Dashboard", page: "doctor-dashboard.html" },
    { key: "patient", label: "My Dashboard", page: "patient-dashboard.html" },
  ];

  for (const role of roles) {
    try {
      if (JSON.parse(localStorage.getItem(role.key))) {
        return role;
      }
    } catch {
      localStorage.removeItem(role.key);
    }
  }

  return null;
}

function updateNavigation() {
  const session = getActiveSession();
  if (!session) return;

  document
    .querySelectorAll('a[href="login.html"], a[href="register.html"]')
    .forEach((link) => link.remove());

  if (session.key === "doctor" || session.key === "admin") {
    document.querySelectorAll('header nav a[href="index.html"]').forEach((link) => link.remove());
  }

  document.querySelectorAll("header nav").forEach((nav) => {
    if (session.key === "doctor" || session.key === "admin") {
      nav.replaceChildren();
    }

    const dashboardLink = document.createElement("a");
    dashboardLink.href = session.page;
    dashboardLink.textContent = session.label;

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "logoutBtn";
    logoutButton.textContent = "Logout";
    logoutButton.addEventListener("click", logout);

    nav.append(dashboardLink, logoutButton);
  });
}

logoutButtons.forEach((button) => button.addEventListener("click", logout));
updateNavigation();

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

if (doctorsList || doctorSelect || modalDoctorSelect) {
  fetch("/api/doctors")
    .then((response) => response.json())
    .then((doctors) => {
      doctors.forEach((doctor) => {
        if (doctorsList) {
          const div = document.createElement("div");
          div.className = "card";

          div.innerHTML = `
            <div class="doctor-card-header">
              <div class="doctor-avatar" aria-hidden="true">${getInitials(doctor.doctor_name)}</div>
              <div>
                <h3>${doctor.doctor_name}</h3>
                <p class="doctor-specialization">${doctor.specialization}</p>
              </div>
            </div>
            <p>Phone: ${doctor.phone}</p>
            <p>Department: ${doctor.department_name}</p>
            <a class="profile-link" href="doctor-profile.html?id=${doctor.doctor_id}">View Profile</a>
            <button class="profile-link appointment-link doctor-book-button" type="button" data-open-booking-modal data-doctor-id="${doctor.doctor_id}">Book Appointment</button>
          `;

          doctorsList.appendChild(div);
        }

        if (doctorSelect) {
          const option = document.createElement("option");
          option.value = doctor.doctor_id;
          option.textContent = doctor.doctor_name;
          doctorSelect.appendChild(option);

          if (String(doctor.doctor_id) === requestedDoctorId) {
            doctorSelect.value = requestedDoctorId;
          }
        }

        if (modalDoctorSelect) {
          const option = document.createElement("option");
          option.value = doctor.doctor_id;
          option.textContent = `${doctor.doctor_name} - ${doctor.specialization}`;
          modalDoctorSelect.appendChild(option);

          if (String(doctor.doctor_id) === String(pendingModalDoctorId)) {
            modalDoctorSelect.value = pendingModalDoctorId;
          }
        }
      });
    })
    .catch((error) => {
      console.log("Error loading doctors:", error);
    });
}

function openBookingModal(selectedDoctorId = null) {
  if (!bookingModal) return;

  pendingModalDoctorId = selectedDoctorId;

  const patient = JSON.parse(localStorage.getItem("patient"));
  const modalPatientInfo = document.getElementById("modalPatientInfo");
  const modalLoginPrompt = document.getElementById("modalLoginPrompt");

  bookingModal.classList.add("is-open");
  bookingModal.setAttribute("aria-hidden", "false");

  if (selectedDoctorId && modalDoctorSelect) {
    modalDoctorSelect.value = selectedDoctorId;
  }

  if (patient) {
    modalPatientInfo.textContent = `Booking for: ${patient.patient_name}`;
    homeBookingForm.hidden = false;
    modalLoginPrompt.hidden = true;
    document.getElementById("modalAppointmentDate").min = new Date().toISOString().split("T")[0];
  } else {
    modalPatientInfo.textContent = "";
    homeBookingForm.hidden = true;
    modalLoginPrompt.hidden = false;
    const loginLink = modalLoginPrompt.querySelector('a[href*="login.html"]');
    if (loginLink && selectedDoctorId) {
      loginLink.href = `login.html?role=patient&next=${encodeURIComponent(`doctors.html?bookDoctor=${selectedDoctorId}`)}`;
    }
  }
}

function closeBookingModal() {
  if (!bookingModal) return;
  bookingModal.classList.remove("is-open");
  bookingModal.setAttribute("aria-hidden", "true");
}

if (bookingModal) {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-booking-modal]");
    if (button) openBookingModal(button.dataset.doctorId || null);
  });
  bookingModal.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeBookingModal);
  });

  if (new URLSearchParams(window.location.search).get("book") === "true") {
    openBookingModal();
  }

  const doctorToBook = new URLSearchParams(window.location.search).get("bookDoctor");
  if (doctorToBook) openBookingModal(doctorToBook);
}

if (homeBookingForm) {
  homeBookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const patient = JSON.parse(localStorage.getItem("patient"));
    const modalBookingMessage = document.getElementById("modalBookingMessage");

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patient.patient_id,
        doctor_id: modalDoctorSelect.value,
        appointment_date: document.getElementById("modalAppointmentDate").value,
        appointment_time: document.getElementById("modalAppointmentTime").value,
        status: "Pending",
      }),
    });
    const result = await response.json();
    modalBookingMessage.textContent = result.message;

    if (response.ok) homeBookingForm.reset();
  });
}

if (doctorProfile) {
  const doctorId = new URLSearchParams(window.location.search).get("id");

  if (!isValidId(doctorId)) {
    doctorProfile.textContent = "Please select a valid doctor profile.";
  } else {
    fetch(`/api/doctors/${doctorId}`)
      .then((response) => {
        if (!response.ok) throw new Error("Doctor not found");
        return response.json();
      })
      .then((doctor) => {
        doctorProfile.innerHTML = `
          <div class="doctor-profile-layout">
            <div class="doctor-profile-avatar" aria-hidden="true">${getInitials(doctor.doctor_name)}</div>
            <div>
              <p class="eyebrow">Doctor Profile</p>
              <h2>${doctor.doctor_name}</h2>
              <p class="doctor-profile-specialization">${doctor.specialization || "Specialist"}</p>
              <div class="detail-grid">
                <div><span>Department</span><strong>${doctor.department_name}</strong></div>
                <div><span>Department Location</span><strong>${doctor.location || "City Hospital"}</strong></div>
                <div><span>Contact Number</span><strong>${doctor.phone || "Not available"}</strong></div>
                <div><span>Hospital</span><strong>City Hospital</strong></div>
              </div>
              <a class="profile-link appointment-link" href="booking.html?doctor=${doctor.doctor_id}">Book an Appointment</a>
            </div>
          </div>
        `;
      })
      .catch(() => {
        doctorProfile.textContent = "Doctor profile could not be loaded.";
      });
  }
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

if (appointmentsList) {
  fetch("/api/appointments")
    .then((response) => response.json())
    .then((appointments) => {
      appointments.forEach((appointment) => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
          <h3>Appointment #${appointment.appointment_id}</h3>
          <p>Patient: ${appointment.patient_name}</p>
          <p>Doctor: ${appointment.doctor_name}</p>
          <p>Date: ${appointment.appointment_date}</p>
          <p>Time: ${appointment.appointment_time}</p>
          <p>Status: ${appointment.status}</p>
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

if (bookingForm) {
  const patient = JSON.parse(localStorage.getItem("patient"));

  if (!patient) {
    bookingForm.style.display = "none";
    bookingMessage.innerHTML = `
      Please login as patient first.
      <br>
      <a href="login.html?role=patient&next=${encodeURIComponent(`booking.html${window.location.search}`)}">Go to Patient Login</a>
    `;
    window.location.href = `login.html?role=patient&next=${encodeURIComponent(`booking.html${window.location.search}`)}`;
  } else if (loggedPatientInfo) {
    loggedPatientInfo.textContent = `Booking appointment for: ${patient.patient_name}`;
    document.getElementById("appointmentDate").min = new Date().toISOString().split("T")[0];
  }

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const appointmentData = {
      patient_id: patient.patient_id,
      doctor_id: document.getElementById("doctorSelect").value,
      appointment_date: document.getElementById("appointmentDate").value,
      appointment_time: document.getElementById("appointmentTime").value,
      status: "Pending",
    };

    try {
      const appointmentResponse = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentData),
      });

      const appointmentResult = await appointmentResponse.json();
      bookingMessage.textContent = appointmentResult.message;

      if (appointmentResponse.ok) {
        bookingForm.reset();
        if (requestedDoctorId) doctorSelect.value = requestedDoctorId;
      }
    } catch {
      bookingMessage.textContent = "Unable to book appointment. Please try again.";
    }
  });
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
      blood_group: document.getElementById("patientBloodGroup").value,
      allergies: document.getElementById("patientAllergies").value,
      medical_history: document.getElementById("patientMedicalHistory").value,
      emergency_contact: document.getElementById("patientEmergencyContact").value,
      emergency_phone: document.getElementById("patientEmergencyPhone").value,
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
    const status = event.target.parentElement.querySelector(".statusSelect").value;

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
  const activeSession = getActiveSession();
  if (activeSession) {
    window.location.replace(activeSession.page);
  }

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
      loginMessage.textContent = "Login first to book your appointment.";
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
      localStorage.removeItem("doctor");
      localStorage.removeItem("patient");
      localStorage.setItem("admin", JSON.stringify(result.admin));
      window.location.href = nextPage || "admin.html";
    } else if (role === "doctor") {
      localStorage.removeItem("admin");
      localStorage.removeItem("patient");
      localStorage.setItem("doctor", JSON.stringify(result.doctor));
      window.location.href = nextPage || "doctor-dashboard.html";
    } else {
      localStorage.removeItem("admin");
      localStorage.removeItem("doctor");
      localStorage.setItem("patient", JSON.stringify(result.patient));
      window.location.href = nextPage || "patient-dashboard.html";
    }
  });
}

if (doctorAppointmentsList || doctorProfileSummary) {
  const doctor = JSON.parse(localStorage.getItem("doctor"));

  if (!doctor) {
    const currentPage = window.location.pathname.split("/").pop() || "doctor-dashboard.html";
    window.location.href = `login.html?role=doctor&next=${currentPage}`;
  } else {
    const doctorWelcome = document.getElementById("doctorWelcome");
    if (doctorWelcome) {
      doctorWelcome.textContent = `${doctor.doctor_name} Appointments`;
    }

    if (doctorProfileSummary) {
      Promise.all([
        fetch(`/api/doctors/${doctor.doctor_id}`).then((response) => response.json()),
        fetch(`/api/doctor/${doctor.doctor_id}/summary`).then((response) => response.json()),
      ])
        .then(([profile, summary]) => {
          doctorProfileSummary.innerHTML = `
            <div class="doctor-dashboard-profile">
              <button id="editDoctorAvatar" class="doctor-avatar doctor-dashboard-avatar profile-edit-avatar" type="button" title="Edit profile">
                ${getInitials(profile.doctor_name)}<span aria-hidden="true">✎</span>
              </button>
              <div>
                <h3>${profile.doctor_name}</h3>
                <p class="doctor-specialization">${profile.specialization || "Specialist"}</p>
                <p>${profile.department_name} - ${profile.location || "City Hospital"}</p>
                <p>Contact: ${profile.phone || "Not available"}</p>
              </div>
            </div>
            <div class="doctor-stat-grid">
              <div class="doctor-stat-card"><span>Total Appointments</span><strong>${summary.total_appointments || 0}</strong></div>
              <div class="doctor-stat-card pending"><span>Pending Patients</span><strong>${summary.pending_appointments || 0}</strong></div>
              <div class="doctor-stat-card confirmed"><span>Patients Treated</span><strong>${summary.confirmed_appointments || 0}</strong><small>Confirmed appointments</small></div>
            </div>
            <form id="doctorProfileForm" class="health-profile-form" hidden>
              <h3>Update Professional Details</h3>
              <input id="editDoctorName" type="text" placeholder="Doctor name" required>
              <select id="editDoctorSpecialization" required>
                <option value="">Select Specialization</option>
                <option value="Heart Specialist">Heart Specialist</option>
                <option value="Brain Specialist">Brain Specialist</option>
                <option value="Bone Specialist">Bone Specialist</option>
                <option value="General Physician">General Physician</option>
              </select>
              <input id="editDoctorPhone" type="text" placeholder="Contact number" required>
              <button type="submit">Save Profile</button>
              <p id="doctorProfileMessage"></p>
            </form>
          `;

          document.getElementById("editDoctorName").value = profile.doctor_name || "";
          const specializationSelect = document.getElementById("editDoctorSpecialization");
          const currentSpecialization = profile.specialization || "";
          if (
            currentSpecialization &&
            ![...specializationSelect.options].some(
              (option) => option.value === currentSpecialization,
            )
          ) {
            specializationSelect.add(new Option(`${currentSpecialization} (Current)`, currentSpecialization, true, true));
          }
          specializationSelect.value = currentSpecialization;
          document.getElementById("editDoctorPhone").value = profile.phone || "";

          document.getElementById("editDoctorAvatar").addEventListener("click", () => {
            document.getElementById("doctorProfileForm").hidden = false;
            document.getElementById("doctorProfileForm").scrollIntoView({ behavior: "smooth", block: "start" });
          });

          document.getElementById("doctorProfileForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            const updatedProfile = {
              doctor_name: document.getElementById("editDoctorName").value,
              specialization: document.getElementById("editDoctorSpecialization").value,
              phone: document.getElementById("editDoctorPhone").value,
            };
            const response = await fetch(`/api/doctors/${doctor.doctor_id}/profile`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedProfile),
            });
            const result = await response.json();
            document.getElementById("doctorProfileMessage").textContent = result.message;

            if (response.ok) {
              Object.assign(doctor, updatedProfile);
              localStorage.setItem("doctor", JSON.stringify(doctor));
              setTimeout(() => window.location.reload(), 700);
            }
          });
        })
        .catch(() => {
          doctorProfileSummary.textContent = "Doctor profile could not be loaded.";
        });
    }

    if (doctorAppointmentsList) {
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

        if (appointments.length === 0) {
          doctorAppointmentsList.innerHTML =
            '<p class="empty-state">No appointments have been scheduled for you yet.</p>';
        }
      });
    }
  }
}

if (patientProfile || patientAppointmentsList) {
  const patient = JSON.parse(localStorage.getItem("patient"));

  if (!patient) {
    const currentPage = window.location.pathname.split("/").pop() || "patient-dashboard.html";
    window.location.href = `login.html?role=patient&next=${currentPage}`;
  } else {
    document.getElementById("patientWelcome").textContent = `Welcome, ${patient.patient_name}`;

    if (patientProfile) {
      patientProfile.innerHTML = `
        <div class="profile-card">
          <p><strong>Name:</strong> ${patient.patient_name}</p>
          <p><strong>Age:</strong> ${patient.age}</p>
          <p><strong>Gender:</strong> ${patient.gender}</p>
          <p><strong>Phone:</strong> ${patient.phone}</p>
          <p><strong>Address:</strong> ${patient.address}</p>
          <hr>
          <p><strong>Blood Group:</strong> ${patient.blood_group || "Not added"}</p>
          <p><strong>Allergies:</strong> ${patient.allergies || "None added"}</p>
          <p><strong>Medical History:</strong> ${patient.medical_history || "Not added"}</p>
          <p><strong>Emergency Contact:</strong> ${patient.emergency_contact || "Not added"}</p>
          <p><strong>Emergency Phone:</strong> ${patient.emergency_phone || "Not added"}</p>
          <button id="editHealthDetailsBtn" class="edit-health-button" type="button">Edit Health Details</button>
          <form id="healthProfileForm" class="health-profile-form" hidden>
            <h3>Update Health Details</h3>
            <select id="profileBloodGroup">
              <option value="">Blood Group</option>
              <option value="A+">A+</option><option value="A-">A-</option>
              <option value="B+">B+</option><option value="B-">B-</option>
              <option value="AB+">AB+</option><option value="AB-">AB-</option>
              <option value="O+">O+</option><option value="O-">O-</option>
            </select>
            <input id="profileAllergies" type="text" placeholder="Allergies">
            <textarea id="profileMedicalHistory" placeholder="Medical history"></textarea>
            <input id="profileEmergencyContact" type="text" placeholder="Emergency contact name">
            <input id="profileEmergencyPhone" type="text" placeholder="Emergency contact number">
            <button type="submit">Save Health Details</button>
            <p id="healthProfileMessage"></p>
          </form>
        </div>
      `;

      document.getElementById("profileBloodGroup").value = patient.blood_group || "";
      document.getElementById("profileAllergies").value = patient.allergies || "";
      document.getElementById("profileMedicalHistory").value = patient.medical_history || "";
      document.getElementById("profileEmergencyContact").value = patient.emergency_contact || "";
      document.getElementById("profileEmergencyPhone").value = patient.emergency_phone || "";

      document.getElementById("editHealthDetailsBtn").addEventListener("click", () => {
        document.getElementById("healthProfileForm").hidden = false;
        document.getElementById("editHealthDetailsBtn").hidden = true;
      });

      document.getElementById("healthProfileForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const healthData = {
          blood_group: document.getElementById("profileBloodGroup").value,
          allergies: document.getElementById("profileAllergies").value,
          medical_history: document.getElementById("profileMedicalHistory").value,
          emergency_contact: document.getElementById("profileEmergencyContact").value,
          emergency_phone: document.getElementById("profileEmergencyPhone").value,
        };

        const response = await fetch(`/api/patient/${patient.patient_id}/health-profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(healthData),
        });
        const result = await response.json();
        document.getElementById("healthProfileMessage").textContent = result.message;

        if (response.ok) {
          Object.assign(patient, healthData);
          localStorage.setItem("patient", JSON.stringify(patient));
          setTimeout(() => window.location.reload(), 700);
        }
      });
    }

    if (patientAppointmentsList) {
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

        if (appointments.length === 0) {
          patientAppointmentsList.innerHTML =
            '<p class="empty-state">You have no appointments yet. Use “Book Appointment” to schedule one.</p>';
        }
      });
    }
  }
}
