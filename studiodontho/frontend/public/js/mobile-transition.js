(() => {
  const transitionDuration = 230;
  const transitionModeKey = "studiodonthoTransitionMode";
  const phoneWidth = 201;
  const phoneHeight = 395;
  const root = document.documentElement;

  function hasFooter() {
    return Boolean(document.querySelector(".footer-nav"));
  }

  function getDefaultMode() {
    return hasFooter() ? "content" : "page";
  }

  function setMode(mode) {
    root.classList.remove("mobile-transition-content", "mobile-transition-page");
    root.classList.add(`mobile-transition-${mode}`);
  }

  function updateMobileViewportScale() {
    const phone = document.querySelector(".phone");
    const viewport = window.visualViewport;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;
    const shouldScale = Boolean(phone) && viewportWidth < 520;

    root.classList.toggle("mobile-viewport-scaled", shouldScale);

    if (!shouldScale) {
      root.style.removeProperty("--studiodontho-phone-scale");
      return;
    }

    const scale = Math.min(viewportWidth / phoneWidth, viewportHeight / phoneHeight);

    root.style.setProperty("--studiodontho-phone-scale", String(scale));
  }

  function getApiBaseUrl() {
    if (window.location.protocol === "file:") {
      return "http://localhost:3000";
    }

    if (window.location.port === "3000") {
      return "";
    }

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }

    return `http://${window.location.hostname}:3000`;
  }

  async function redirectIfPageIsLocked() {
    if (document.body.dataset.requiresAuth !== "true") {
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/me`, {
        credentials: apiBaseUrl ? "include" : "same-origin"
      });

      if (response.ok) {
        return;
      }
    } catch (error) {
      // The server-side guard is the real protection. This only keeps direct static opens tidy.
    }

    navigateWithTransition("page1mobil.html", { fullPage: true });
  }

  function playEnterTransition() {
    root.classList.remove("mobile-leaving");

    requestAnimationFrame(() => {
      root.classList.add("mobile-ready");
      root.classList.remove("mobile-enter");
    });
  }

  function prepareInitialMode() {
    const storedMode = sessionStorage.getItem(transitionModeKey);
    sessionStorage.removeItem(transitionModeKey);

    if (storedMode === "content" || storedMode === "page") {
      setMode(storedMode);
    } else if (!root.classList.contains("mobile-transition-content") && !root.classList.contains("mobile-transition-page")) {
      setMode(getDefaultMode());
    }
  }

  function cameFromCourses() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("from") === "cours") {
      return true;
    }

    if (!document.referrer) {
      return false;
    }

    try {
      const referrerUrl = new URL(document.referrer);

      return referrerUrl.origin === window.location.origin &&
        referrerUrl.pathname.endsWith("/coursmobil.html");
    } catch (error) {
      return false;
    }
  }

  function updateContextualBackLink() {
    if (!cameFromCourses()) {
      return;
    }

    const backLink = document.querySelector(".top-link.back-link");

    if (backLink) {
      backLink.href = "coursmobil.html";
    }
  }

  function initFooterMoreMenu() {
    const footer = document.querySelector(".footer-nav");
    const phone = document.querySelector(".phone");
    const menuButton = footer?.querySelector('a[aria-label="Menu"]') || footer?.querySelector("a:last-child");

    if (!footer || !phone || !menuButton) {
      return;
    }

    const menu = document.createElement("div");
    menu.className = "footer-more-menu";
    menu.hidden = true;
    menu.innerHTML = `
      <a class="footer-more-action" href="profilmobil.html">
        <i class="fa-solid fa-user" aria-hidden="true"></i>
        <span>Profil</span>
      </a>
      <button class="footer-more-action is-danger" type="button" data-footer-logout>
        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
        <span>Deconnexion</span>
      </button>
    `;

    phone.appendChild(menu);
    menuButton.setAttribute("aria-expanded", "false");

    function closeMenu() {
      menu.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    }

    function openMenu() {
      menu.hidden = false;
      menuButton.setAttribute("aria-expanded", "true");
    }

    async function logout() {
      closeMenu();
      localStorage.removeItem("studiodonthoMobileProfile");
      localStorage.removeItem("studiodonthoMobileMode");

      try {
        const apiBaseUrl = getApiBaseUrl();
        await fetch(`${apiBaseUrl}/api/logout`, {
          method: "POST",
          credentials: apiBaseUrl ? "include" : "same-origin"
        });
      } catch (error) {
        // The local logout still moves the user back to the welcome screen.
      }

      navigateWithTransition("page1mobil.html", { fullPage: true });
    }

    menuButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (menu.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    });

    menu.querySelector("a")?.addEventListener("click", closeMenu);
    menu.querySelector("[data-footer-logout]")?.addEventListener("click", logout);

    document.addEventListener("click", (event) => {
      if (menu.hidden) {
        return;
      }

      if (event.target.closest(".footer-more-menu") || event.target.closest('.footer-nav a[aria-label="Menu"]')) {
        return;
      }

      closeMenu();
    });
  }

  function navigateWithTransition(targetUrl, options = {}) {
    const url = new URL(targetUrl, window.location.href);
    const mode = options.fullPage ? "page" : getDefaultMode();

    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash === window.location.hash) {
      return;
    }

    sessionStorage.setItem(transitionModeKey, mode);
    setMode(mode);
    root.classList.remove("mobile-enter", "mobile-ready");
    root.classList.add("mobile-leaving");

    window.setTimeout(() => {
      window.location.href = url.href;
    }, transitionDuration);
  }

  prepareInitialMode();
  updateContextualBackLink();
  initFooterMoreMenu();
  updateMobileViewportScale();
  playEnterTransition();

  window.navigateWithMobileTransition = navigateWithTransition;
  redirectIfPageIsLocked();

  window.addEventListener("resize", updateMobileViewportScale);
  window.addEventListener("orientationchange", updateMobileViewportScale);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateMobileViewportScale);
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const url = new URL(link.href, window.location.href);

    if (url.origin !== window.location.origin || link.target) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(url.href);
  });
})();
