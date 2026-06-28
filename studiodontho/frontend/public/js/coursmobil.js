const courseLists = {
  decouverte: document.querySelector("#discovery-course-list"),
  professionnel: document.querySelector("#pro-course-list")
};
const courseSections = {
  decouverte: courseLists.decouverte?.closest(".course-section"),
  professionnel: courseLists.professionnel?.closest(".course-section")
};
const coursesCount = document.querySelector("#courses-count");
const courseModeLabel = document.querySelector("#course-mode-label");
const courseModeLabels = {
  decouverte: "Mode decouverte",
  professionnel: "Mode professionnel de sante"
};

const courseCatalog = {
  decouverte: {
    1: {
      1: {
        title: "Les outils dentaires",
        href: "m1c1l2p1.html",
        details: "Monde 1 - Lvl 1"
      },
      2: {
        title: "Les types de dents",
        href: "m1c2l2p1.html",
        details: "Monde 1 - Lvl 2"
      },
      3: {
        title: "Structure d'une dent",
        href: "m1c3l2p1.html",
        details: "Monde 1 - Lvl 3"
      },
      4: {
        title: "Proteger ses dents",
        href: "m1c4l2p1.html",
        details: "Monde 1 - Lvl 4"
      }
    }
  },
  professionnel: {
    1: {
      1: {
        title: "Outils du cabinet",
        href: "1m1c1l2p1.html",
        details: "Monde 1 - Lvl 1"
      },
      2: {
        title: "Dents et comptage",
        href: "1m1c2l2p1.html",
        details: "Monde 1 - Lvl 2"
      },
      3: {
        title: "Classifications carieuses",
        href: "1m1c3l2p1.html",
        details: "Monde 1 - Lvl 3"
      },
      4: {
        title: "Techniques de pose de digue",
        href: "1m1c4l2p1.html",
        details: "Monde 1 - Lvl 4"
      }
    }
  }
};

function getStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem("studiodonthoMobileProfile") || "null") || {};
  } catch (error) {
    localStorage.removeItem("studiodonthoMobileProfile");
    return {};
  }
}

function getCurrentMode() {
  const mode = localStorage.getItem("studiodonthoMobileMode");

  return mode === "professionnel" ? "professionnel" : "decouverte";
}

function getProgressKey(mode, worldNumber) {
  const profile = getStoredProfile();

  return `studiodonthoPathProgress:${profile.userId || "current"}:${mode}:world${worldNumber}`;
}

function readLocalCompletedPaths(mode, worldNumber) {
  try {
    const completedPaths = JSON.parse(localStorage.getItem(getProgressKey(mode, worldNumber)) || "[]");

    return Array.isArray(completedPaths) ? completedPaths.map(Number) : [];
  } catch (error) {
    localStorage.removeItem(getProgressKey(mode, worldNumber));
    return [];
  }
}

function saveLocalCompletedPaths(mode, worldNumber, completedPaths) {
  localStorage.setItem(
    getProgressKey(mode, worldNumber),
    JSON.stringify([...new Set(completedPaths.map(Number))].sort((a, b) => a - b))
  );
}

async function loadCompletedPaths(mode, worldNumber) {
  try {
    const response = await fetch(`/api/path-progress?mode=${mode}&world=${worldNumber}`, {
      credentials: "same-origin"
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(result.completedPaths)) {
      return readLocalCompletedPaths(mode, worldNumber);
    }

    saveLocalCompletedPaths(mode, worldNumber, result.completedPaths);

    return result.completedPaths.map(Number);
  } catch (error) {
    return readLocalCompletedPaths(mode, worldNumber);
  }
}

function createCourseCard(course) {
  const card = document.createElement("a");
  const icon = document.createElement("span");
  const body = document.createElement("span");
  const title = document.createElement("h3");
  const details = document.createElement("p");
  const arrow = document.createElement("i");

  card.className = "course-card";
  card.href = `${course.href}${course.href.includes("?") ? "&" : "?"}from=cours`;
  icon.className = "course-card-icon";
  icon.innerHTML = '<i class="fa-solid fa-book-open"></i>';
  title.textContent = course.title;
  details.textContent = course.details;
  arrow.className = "fa-solid fa-chevron-right course-card-arrow";

  body.append(title, details);
  card.append(icon, body, arrow);

  return card;
}

function renderEmpty(list, mode) {
  const empty = document.createElement("p");

  empty.className = "course-empty";
  empty.textContent = mode === "decouverte"
    ? "Aucune fiche decouverte."
    : "Aucune fiche professionnelle.";
  list.replaceChildren(empty);
}

async function renderCourses() {
  const currentMode = getCurrentMode();
  const worlds = courseCatalog[currentMode] || {};
  const list = courseLists[currentMode];
  const cards = [];
  let totalCourses = 0;

  Object.entries(courseSections).forEach(([mode, section]) => {
    if (section) {
      section.hidden = mode !== currentMode;
    }
  });

  if (courseModeLabel) {
    courseModeLabel.textContent = courseModeLabels[currentMode];
  }

  if (!list) {
    return;
  }

  for (const [worldNumber, paths] of Object.entries(worlds)) {
    const completedPaths = await loadCompletedPaths(currentMode, Number(worldNumber));

    completedPaths.forEach((pathNumber) => {
      const course = paths[pathNumber];

      if (course) {
        cards.push(createCourseCard(course));
      }
    });
  }

  totalCourses = cards.length;

  if (cards.length > 0) {
    list.replaceChildren(...cards);
  } else {
    renderEmpty(list, currentMode);
  }

  coursesCount.textContent = String(totalCourses);
}

renderCourses();
