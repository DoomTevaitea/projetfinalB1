const choiceButtons = document.querySelectorAll(".choice-button");
const authPanels = document.querySelectorAll(".auth-form");
const authMessage = document.querySelector("#auth-message");
const signupForm = document.querySelector("#signup");
const loginForm = document.querySelector("#login");
const forgotForm = document.querySelector("#forgot");
const guestForm = document.querySelector("#guest");
const forgotOpenButton = document.querySelector("#forgot-open");
const backToLoginButton = document.querySelector("#back-to-login");
const isMobileAuthPage = document.body.dataset.mobileAuth === "true";
const modeLabels = {
  decouverte: "Mode decouverte",
  professionnel: "Professionnel de sant\u00e9"
};

function getSelectedMode() {
  const requestedMode = new URLSearchParams(window.location.search).get("mode");

  if (modeLabels[requestedMode]) {
    localStorage.setItem("studiodonthoMobileMode", requestedMode);
    return requestedMode;
  }

  return localStorage.getItem("studiodonthoMobileMode") || "decouverte";
}

function saveMobileProfile(user) {
  const mode = getSelectedMode();

  localStorage.setItem("studiodonthoMobileProfile", JSON.stringify({
    userId: user.id,
    prenom: user.prenom,
    mode: modeLabels[mode],
    isGuest: Boolean(user.isGuest)
  }));
}

function setupPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      const icon = button.querySelector("i");
      const isHidden = input.type === "password";

      input.type = isHidden ? "text" : "password";
      button.setAttribute("aria-label", isHidden ? "Cacher le mot de passe" : "Afficher le mot de passe");
      icon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    });
  });
}

function showPanel(panelId, activeButtonPanel = panelId) {
  choiceButtons.forEach((item) => item.classList.remove("active"));
  authPanels.forEach((panel) => panel.classList.remove("active"));

  const button = document.querySelector(`[data-panel="${activeButtonPanel}"]`);
  const panel = document.getElementById(panelId);

  if (button) {
    button.classList.add("active");
  }

  if (panel) {
    panel.classList.add("active");
  }
}

function showMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`.trim();
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function sendAuthRequest(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify(data)
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("Le serveur ne repond pas en JSON. Relance npm start et ouvre http://localhost:3000.");
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Une erreur est survenue.");
  }

  return result;
}

async function handleAuthSubmit(event, url, loadingText) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector(".submit-button");
  const defaultText = button.textContent;

  button.disabled = true;
  button.textContent = loadingText;
  showMessage("");

  try {
    const result = await sendAuthRequest(url, formToObject(form));
    const message = result.user
      ? `${result.message} Bonjour ${result.user.prenom}.`
      : result.message;

    showMessage(message, "success");
    form.reset();

    if (isMobileAuthPage && result.user) {
      saveMobileProfile(result.user);
      if (window.navigateWithMobileTransition) {
        window.navigateWithMobileTransition("profilmobil.html", { fullPage: true });
      } else {
        window.location.href = "profilmobil.html";
      }
    }
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = defaultText;
  }
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.panel);
    showMessage("");
  });
});

signupForm.addEventListener("submit", (event) => {
  handleAuthSubmit(event, "/api/register", "Creation...");
});

loginForm.addEventListener("submit", (event) => {
  handleAuthSubmit(event, "/api/login", "Connexion...");
});

forgotForm.addEventListener("submit", (event) => {
  handleAuthSubmit(event, "/api/forgot-password", "Envoi...");
});

guestForm.addEventListener("submit", (event) => {
  handleAuthSubmit(event, "/api/guest", "Creation...");
});

forgotOpenButton.addEventListener("click", () => {
  showPanel("forgot", "login");
  showMessage("");
});

backToLoginButton.addEventListener("click", () => {
  showPanel("login");
  showMessage("");
});

const requestedPanel = new URLSearchParams(window.location.search).get("panel");

if (["signup", "login", "guest"].includes(requestedPanel)) {
  showPanel(requestedPanel);
}

setupPasswordToggles();
