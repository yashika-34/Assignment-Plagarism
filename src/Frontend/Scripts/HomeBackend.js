import API_BASE from "./config.js";

export async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  // Clear any previous error
  showFormError("loginError", "");

  if (email === "" || password === "") {
    showFormError("loginError", "Please enter your email and password.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showFormError("loginError", data.error || "Invalid email or password.");
      return;
    }

    if (data.token) {
      localStorage.setItem("authToken", data.token);
    }
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("userEmail", email);
    sessionStorage.clear();

    await updateNavbar();
    closeAuth();
  } catch (err) {
    showFormError("loginError", "Server error. Please try again.");
  }
}




export async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirm").value;

  // Clear any previous error
  showFormError("signupError", "");

  if (name === "" || email === "" || password === "" || confirmPassword === "") {
    showFormError("signupError", "Please fill all fields.");
    return;
  }

  // Basic email format check
  if (email.indexOf("@") === -1 || email.indexOf(".") === -1) {
    showFormError("signupError", "Please enter a valid email address.");
    return;
  }

  if (password.length < 6) {
    showFormError("signupError", "Password must contain at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showFormError("signupError", "Passwords do not match.");
    return;
  }

  const response = await fetch(`${API_BASE}/users?email=` + encodeURIComponent(email)); // searching with given email
  const users = await response.json();

  if (users.length > 0) {
    showFormError("signupError", "An account with this email already exists.");
    return;
  }

  const newUser = {
    name: name,
    email: email,
    password: password
  };

  await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newUser)
  });

  localStorage.removeItem("authToken");
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userEmail");
  sessionStorage.clear();

  document.getElementById("signupForm").reset();
  document.getElementById("signupPanel").classList.remove("active");
  document.getElementById("loginPanel").classList.add("active");

  showFormError("loginInfo", "Account created! Please log in.");
}















export async function handleSendResetCode(event) {
  if (event && event.preventDefault) event.preventDefault();
  const emailInput = document.getElementById("resetEmail");
  const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
  const infoEl = document.getElementById("resetTokenInfo");

  showFormError("resetError", "");
  if (!email || email.indexOf("@") === -1) {
    showFormError("resetError", "Please enter your registered email address first.");
    return;
  }

  const btn = document.getElementById("sendResetCodeBtn");
  if (btn) btn.textContent = "Sending...";

  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      if (data.resetToken) {
        const tokenInput = document.getElementById("resetToken");
        if (tokenInput) tokenInput.value = data.resetToken;
      }
      if (infoEl) {
        infoEl.textContent = `Verification code: ${data.resetToken || "Sent to email"} (valid for 15 minutes).`;
        infoEl.style.color = "#10b981";
      }
    } else {
      showFormError("resetError", data.error || "Failed to generate reset code.");
    }
  } catch (err) {
    showFormError("resetError", "Server error while requesting reset code.");
  } finally {
    if (btn) btn.textContent = "Get Code";
  }
}

export async function resetPassword(event) {
  event.preventDefault();
  const email = document.getElementById("resetEmail").value.trim().toLowerCase();
  const tokenInput = document.getElementById("resetToken");
  const resetToken = tokenInput ? tokenInput.value.trim() : "";
  const newPassword = document.getElementById("resetPassword").value;
  const confirmPassword = document.getElementById("resetConfirm").value;

  // Clear any previous error
  showFormError("resetError", "");

  if (email === "" || newPassword === "" || confirmPassword === "") {
    showFormError("resetError", "Please fill all fields.");
    return;
  }

  if (!resetToken) {
    showFormError("resetError", "Please enter the verification code or click 'Get Code'.");
    return;
  }

  if (newPassword.length < 6) {
    showFormError("resetError", "Password must contain at least 6 characters.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showFormError("resetError", "Passwords do not match.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, resetToken, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      showFormError("resetError", data.error || "Failed to reset password.");
      return;
    }

    document.getElementById("resetForm").reset();
    document.getElementById("resetPanel").classList.remove("active");
    document.getElementById("loginPanel").classList.add("active");

    showFormError("loginInfo", "Password updated successfully! Please log in.");
  } catch (err) {
    showFormError("resetError", "Server error. Please try again.");
  }
}


export function togglePassword(inputId, button) {
  const passwordInput = document.getElementById(inputId);
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    button.setAttribute("aria-label", "Hide password");
  } else {
    passwordInput.type = "password";
    button.setAttribute("aria-label", "Show password");
  }
}


export function logoutUser() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userEmail");
  sessionStorage.clear();

  updateNavbar();
}


export async function updateNavbar() {
  const token = localStorage.getItem("authToken");
  const loggedIn = localStorage.getItem("loggedIn") === "true";
  const userEmail = localStorage.getItem("userEmail");
  const loginButton = document.getElementById("loginNavButton");
  const signupButton = document.getElementById("signupNavButton");
  const profileWrap = document.getElementById("profileWrap");
  const profileButton = document.getElementById("profileButton");
  const mobileLoginButton = document.getElementById("mobileLoginButton");
  const mobileSignupButton = document.getElementById("mobileSignupButton");
  const mobileProfileWrap = document.getElementById("mobileProfileWrap");
  const mobileProfileButton = document.getElementById("mobileProfileButton");

  if (loggedIn && (token || userEmail !== null)) {
    // If JWT token exists, verify with backend
    if (token) {
      try {
        const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const firstLetter = (verifyData.user.name || "U").charAt(0).toUpperCase();
          if (loginButton !== null) loginButton.style.display = "none";
          if (signupButton !== null) signupButton.style.display = "none";
          if (profileWrap !== null) profileWrap.classList.add("show");
          if (profileButton !== null) profileButton.textContent = firstLetter;
          if (mobileLoginButton !== null) mobileLoginButton.style.display = "none";
          if (mobileSignupButton !== null) mobileSignupButton.style.display = "none";
          if (mobileProfileWrap !== null) mobileProfileWrap.classList.add("show");
          if (mobileProfileButton !== null) mobileProfileButton.textContent = firstLetter;
          return;
        } else {
          // Token is invalid/expired
          localStorage.removeItem("authToken");
          localStorage.removeItem("loggedIn");
          localStorage.removeItem("userEmail");
          updateNavbar();
          return;
        }
      } catch (err) {
        // Network fallback to email check if offline
      }
    }

    const response = await fetch(`${API_BASE}/users?email=` + encodeURIComponent(userEmail));
    const users = await response.json();
    if (users.length === 0) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("userEmail");
      return;
    }
    const user = users[0];
    const firstLetter = user.name.charAt(0).toUpperCase();
    if (loginButton !== null) loginButton.style.display = "none";
    if (signupButton !== null) signupButton.style.display = "none";
    if (profileWrap !== null) profileWrap.classList.add("show");
    if (profileButton !== null) profileButton.textContent = firstLetter;
    if (mobileLoginButton !== null) mobileLoginButton.style.display = "none";
    if (mobileSignupButton !== null) mobileSignupButton.style.display = "none";
    if (mobileProfileWrap !== null) mobileProfileWrap.classList.add("show");
    if (mobileProfileButton !== null) mobileProfileButton.textContent = firstLetter;
  } else {
    if (loginButton !== null) loginButton.style.display = "";
    if (signupButton !== null) signupButton.style.display = "";
    if (profileWrap !== null) profileWrap.classList.remove("show");
    if (mobileLoginButton !== null) mobileLoginButton.style.display = "";
    if (mobileSignupButton !== null) mobileSignupButton.style.display = "";
    if (mobileProfileWrap !== null) mobileProfileWrap.classList.remove("show");
  }
}




export function closeAuth() {
  const authModal = document.getElementById("authModal");
  if (authModal !== null) {
    authModal.classList.remove("open");
    authModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }
}




// =========================================
// SHOW / HIDE INLINE FORM ERRORS
// =========================================

export function showFormError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el !== null) {
    el.textContent = message;
  }
}