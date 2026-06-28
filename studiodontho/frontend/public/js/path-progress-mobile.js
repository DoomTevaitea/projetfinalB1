const missingImages = document.querySelectorAll(".js-hide-missing-image");

missingImages.forEach((image) => {
  image.addEventListener("error", () => {
    image.hidden = true;
    image.parentElement?.classList.add("is-image-missing");
  });
});

const finishLessonLink = document.querySelector("[data-complete-lesson]");

if (finishLessonLink) {
  const lessonPage = document.querySelector("[data-lesson-page]");
  const lessonMode = lessonPage?.dataset.lessonMode || "professionnel";
  const lessonWorld = Number(lessonPage?.dataset.lessonWorld) || 1;
  const lessonPath = Number(lessonPage?.dataset.lessonPath) || 1;
  const lessonKey = lessonPage?.dataset.lessonKey || "";
  const isTestLesson = /^[0-9]?m[0-9]+c[0-9]+l3$/i.test(lessonKey);

  function getStoredProfile() {
    try {
      return JSON.parse(localStorage.getItem("studiodonthoMobileProfile") || "null") || {};
    } catch (error) {
      localStorage.removeItem("studiodonthoMobileProfile");
      return {};
    }
  }

  function getPathProgressKey() {
    const profile = getStoredProfile();

    return `studiodonthoPathProgress:${profile.userId || "current"}:${lessonMode}:world${lessonWorld}`;
  }

  function returnToPath() {
    const href = finishLessonLink.getAttribute("href") || "cheminmobil.html?world=1&id=1";

    if (window.navigateWithMobileTransition) {
      window.navigateWithMobileTransition(href);
    } else {
      window.location.href = href;
    }
  }

  function saveLocalPathComplete() {
    try {
      const completedPaths = JSON.parse(localStorage.getItem(getPathProgressKey()) || "[]");
      const nextCompletedPaths = Array.isArray(completedPaths) ? completedPaths.map(Number) : [];

      if (!nextCompletedPaths.includes(lessonPath)) {
        nextCompletedPaths.push(lessonPath);
      }

      localStorage.setItem(
        getPathProgressKey(),
        JSON.stringify([...new Set(nextCompletedPaths)].sort((a, b) => a - b))
      );
    } catch (error) {
      localStorage.setItem(getPathProgressKey(), JSON.stringify([lessonPath]));
    }
  }

  function updateLocalPoints(pointsEarned, totalPoints) {
    const profile = getStoredProfile();
    const modeStatsKey = `studiodonthoModeStats:${profile.userId || "current"}`;

    try {
      const savedStats = JSON.parse(localStorage.getItem(modeStatsKey) || "{}");
      const modeStats = {
        decouverte: {
          points: 0,
          level: 1,
          casesDone: 0,
          casesTotal: 30,
          ...savedStats.decouverte
        },
        professionnel: {
          points: 0,
          level: 1,
          casesDone: 0,
          casesTotal: 30,
          ...savedStats.professionnel
        }
      };
      const safeTotal = Number(totalPoints);

      modeStats[lessonMode].points = Number.isFinite(safeTotal)
        ? safeTotal
        : Math.max(0, Number(modeStats[lessonMode].points) || 0) + (Number(pointsEarned) || 0);

      localStorage.setItem(modeStatsKey, JSON.stringify(modeStats));
    } catch (error) {
      localStorage.removeItem(modeStatsKey);
    }
  }

  async function syncCompletedPath() {
    const response = await fetch("/api/path-progress/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        mode: lessonMode,
        world: lessonWorld,
        pathNumber: lessonPath,
        testPassed: true
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Impossible de valider ce lvl.");
    }

    updateLocalPoints(result.pointsEarned, result.points);

    return result;
  }

  function isTestPassed() {
    if (!isTestLesson) {
      return false;
    }

    if (lessonPage?.dataset.reviewMode === "strict") {
      return lessonPage?.dataset.testPassed === "true" ||
        finishLessonLink.dataset.testPassed === "true";
    }

    const testQuestions = Array.from(document.querySelectorAll("[data-test-question]"));
    const allQuestionsComplete = testQuestions.length > 0 &&
      testQuestions.every((question) => question.classList.contains("is-complete"));

    return allQuestionsComplete ||
      lessonPage?.dataset.testPassed === "true" ||
      finishLessonLink.dataset.testPassed === "true";
  }

  function showProgressMessage(message) {
    const existingMessage = document.querySelector("#path-progress-message") || document.querySelector("#dental-test-success");

    if (existingMessage) {
      existingMessage.textContent = message;
      existingMessage.hidden = false;
      return;
    }

    const messageElement = document.createElement("p");
    messageElement.id = "path-progress-message";
    messageElement.className = "tool-note";
    messageElement.textContent = message;
    document.querySelector(".course-sheet, .order-panel, .content")?.appendChild(messageElement);
  }

  finishLessonLink.addEventListener("click", async (event) => {
    event.preventDefault();

    if (!isTestLesson) {
      returnToPath();
      return;
    }

    if (!isTestPassed()) {
      showProgressMessage("Reussis le test avant de terminer cette lecon.");
      return;
    }

    finishLessonLink.classList.add("saving");

    try {
      await syncCompletedPath();
    } catch (error) {
      finishLessonLink.classList.remove("saving");
      showProgressMessage(error.message || "Impossible de terminer cette lecon.");
      return;
    }

    saveLocalPathComplete();
    returnToPath();
  });
}
