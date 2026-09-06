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

if (doctorsList || doctorSelect) {
  fetch("/api/doctors")
    .then((response) => response.json())
    .then((doctors) => {
      doctors.forEach((doctor) => {
        if (doctorsList) {
          const div = document.createElement("div");
          div.className = "card";

          div.innerHTML = `
            <h3>${doctor.doctor_name}</h3>
            <p>Specialization: ${doctor.specialization}</p>
            <p>Phone: ${doctor.phone}</p>
            <p>Department: ${doctor.department_name}</p>
          `;

          doctorsList.appendChild(div);
        }

        if (doctorSelect) {
          const option = document.createElement("option");
          option.value = doctor.doctor_id;
          option.textContent = doctor.doctor_name;
          doctorSelect.appendChild(option);
        }
      });
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
      <a href="login.html?role=patient&next=booking.html">Go to Patient Login</a>
    `;
    window.location.href = "login.html?role=patient&next=booking.html";
  } else if (loggedPatientInfo) {
    loggedPatientInfo.textContent = `Booking appointment for: ${patient.patient_name}`;
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

    const appointmentResponse = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appointmentData),
    });

    const appointmentResult = await appointmentResponse.json();

    bookingMessage.textContent = appointmentResult.message;
    bookingForm.reset();
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
