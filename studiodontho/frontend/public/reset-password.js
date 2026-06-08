const resetForm = document.querySelector("#reset-form");
const resetMessage = document.querySelector("#reset-message");
const token = new URLSearchParams(window.location.search).get("token");

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

function showResetMessage(message, type = "") {
  resetMessage.textContent = message;
  resetMessage.className = `auth-message ${type}`.trim();
}

async function sendResetRequest(data) {
  const response = await fetch("/api/reset-password", {
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

if (!token) {
  showResetMessage("Lien de reinitialisation manquant.", "error");
  resetForm.querySelector(".submit-button").disabled = true;
}

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = resetForm.querySelector(".submit-button");
  const defaultText = button.textContent;
  const password = resetForm.password.value;
  const confirmPassword = resetForm.confirmPassword.value;

  button.disabled = true;
  button.textContent = "Modification...";
  showResetMessage("");

  try {
    const result = await sendResetRequest({ token, password, confirmPassword });
    showResetMessage(result.message, "success");
    resetForm.reset();
  } catch (error) {
    showResetMessage(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = defaultText;
  }
});

setupPasswordToggles();
