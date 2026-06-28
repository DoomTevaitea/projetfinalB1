function shuffleElements(elements, container) {
  const shuffled = [...elements];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  shuffled.forEach((element) => container.appendChild(element));
}

function showDamActionLink(link, targetElement, label) {
  if (!link) {
    return;
  }

  link.hidden = false;

  const linkLabel = link.dataset.completionLabel || label;

  if (linkLabel) {
    link.textContent = linkLabel;
  }

  if (!targetElement) {
    return;
  }

  link.classList.remove("top-link", "next-link", "recap-finish-link");
  link.classList.add("dam-completion-button");
  targetElement.appendChild(link);
}

const orderExercise = document.querySelector("[data-order-exercise]");

if (orderExercise) {
  const orderList = orderExercise.querySelector(".order-list");
  const steps = Array.from(orderExercise.querySelectorAll(".order-step"));
  const validateButton = orderExercise.querySelector("[data-check-order]");
  const resetButton = orderExercise.querySelector("[data-reset-order]");
  const feedback = orderExercise.querySelector("[data-order-feedback]");
  const nextLink = document.querySelector("#next-dam-page");
  const lessonPage = document.querySelector("[data-lesson-page]");
  const selectedSteps = [];

  shuffleElements(steps, orderList);

  if (lessonPage?.dataset.lessonKey?.match(/^[0-9]?m[0-9]+c[0-9]+l3$/i)) {
    lessonPage.dataset.testPassed = "false";
  }

  function getSelectedCount() {
    return selectedSteps.filter(Boolean).length;
  }

  function getNextAvailableIndex() {
    const emptyIndex = selectedSteps.findIndex((step) => !step);

    if (emptyIndex >= 0) {
      return emptyIndex;
    }

    return selectedSteps.length < steps.length ? selectedSteps.length : -1;
  }

  function getUndoCandidate() {
    const editableSelectedSteps = selectedSteps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step && !step.classList.contains("is-locked"));

    return editableSelectedSteps.at(-1)?.step || null;
  }

  function clearStep(step) {
    step.classList.remove("is-picked", "is-error", "is-last-picked", "is-locked");
    step.querySelector(".order-choice")?.remove();
    step.querySelector(".order-remove")?.remove();
  }

  function updateUndoButtons() {
    const undoCandidate = getUndoCandidate();

    selectedSteps.forEach((step) => {
      if (!step) {
        return;
      }

      const removeButton = step.querySelector(".order-remove");
      const isLast = step === undoCandidate;

      step.classList.toggle("is-last-picked", isLast);

      if (removeButton) {
        removeButton.classList.toggle("is-active", isLast);
        removeButton.setAttribute("aria-disabled", String(!isLast));
      }
    });
  }

  function hideCompletionLink() {
    if (nextLink) {
      nextLink.hidden = true;
      nextLink.dataset.testPassed = "false";
    }

    if (lessonPage?.dataset.lessonKey?.match(/^[0-9]?m[0-9]+c[0-9]+l3$/i)) {
      lessonPage.dataset.testPassed = "false";
    }
  }

  function showCompletionLink() {
    if (lessonPage?.dataset.lessonKey?.match(/^[0-9]?m[0-9]+c[0-9]+l3$/i)) {
      lessonPage.dataset.testPassed = "true";
    }

    if (nextLink) {
      nextLink.dataset.testPassed = "true";
      showDamActionLink(nextLink, feedback);
    }
  }

  function removeLastSelection() {
    const lastSelectedStep = getUndoCandidate();

    if (!lastSelectedStep) {
      return;
    }

    const selectedIndex = selectedSteps.findIndex((step) => step === lastSelectedStep);

    if (selectedIndex >= 0) {
      selectedSteps[selectedIndex] = undefined;
    }

    clearStep(lastSelectedStep);
    updateUndoButtons();
    hideCompletionLink();
    feedback.textContent = "Derniere selection annulee.";
    feedback.classList.remove("is-success", "is-error");
  }

  function createOrderChoice(step) {
    const choice = document.createElement("span");
    choice.className = "order-choice";
    choice.textContent = String(selectedSteps.findIndex((selectedStep) => selectedStep === step) + 1);
    step.appendChild(choice);
  }

  function createRemoveButton(step) {
    const removeButton = document.createElement("button");
    removeButton.className = "order-remove";
    removeButton.type = "button";
    removeButton.textContent = "x";
    removeButton.setAttribute("aria-label", "Annuler cette selection");

    removeButton.addEventListener("click", (event) => {
      event.stopPropagation();

      if (step !== getUndoCandidate()) {
        feedback.textContent = "Annule d'abord le plus grand numero modifiable.";
        feedback.classList.add("is-error");
        feedback.classList.remove("is-success");
        return;
      }

      removeLastSelection();
    });

    step.appendChild(removeButton);
  }

  function resetOrder() {
    selectedSteps.splice(0, selectedSteps.length);
    steps.forEach(clearStep);
    feedback.textContent = "Tape les etapes dans l'ordre logique.";
    feedback.classList.remove("is-success", "is-error");
    hideCompletionLink();
  }

  function selectStep(step) {
      if (selectedSteps.includes(step)) {
        return;
      }

      const nextIndex = getNextAvailableIndex();

      if (nextIndex < 0) {
        return;
      }

      step.classList.remove("is-error", "is-locked");
      selectedSteps[nextIndex] = step;
      step.classList.add("is-picked");
      createOrderChoice(step);
      createRemoveButton(step);
      updateUndoButtons();
      hideCompletionLink();
      feedback.textContent = "Continue a placer les etapes.";
      feedback.classList.remove("is-success", "is-error");
  }

  steps.forEach((step) => {
    step.addEventListener("click", () => {
      selectStep(step);
    });

    step.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectStep(step);
      }
    });
  });

  validateButton?.addEventListener("click", () => {
    if (getSelectedCount() !== steps.length) {
      feedback.textContent = "Il manque encore des etapes a placer.";
      feedback.classList.add("is-error");
      feedback.classList.remove("is-success");
      return;
    }

    steps.forEach((step) => step.classList.remove("is-error"));

    const isCorrect = selectedSteps.every((step, index) => step && Number(step.dataset.order) === index + 1);

    if (isCorrect) {
      selectedSteps.forEach((step) => {
        step.classList.add("is-locked");
        step.querySelector(".order-remove")?.remove();
      });
      updateUndoButtons();
      feedback.textContent = "C'est le bon ordre : le champ est propre, stable puis etanche.";
      feedback.classList.add("is-success");
      feedback.classList.remove("is-error");

      showCompletionLink();
      return;
    }

    selectedSteps.forEach((step, index) => {
      if (!step) {
        return;
      }

      if (Number(step.dataset.order) === index + 1) {
        step.classList.add("is-locked");
        step.querySelector(".order-remove")?.remove();
      } else {
        selectedSteps[index] = undefined;
        clearStep(step);
        step.classList.add("is-error");
      }
    });
    updateUndoButtons();
    feedback.textContent = "Les rectangles rouges sont a replacer, du plus petit numero manquant au plus grand.";
    feedback.classList.add("is-error");
    feedback.classList.remove("is-success");
  });

  resetButton?.addEventListener("click", resetOrder);
}

document.querySelectorAll("[data-technique-quiz]").forEach((quiz) => {
  const options = quiz.querySelector(".technique-options");
  const answers = Array.from(quiz.querySelectorAll(".technique-answer"));
  const feedback = quiz.querySelector("[data-technique-feedback]");
  const nextLink = document.querySelector("#next-dam-page");
  const lessonPage = document.querySelector("[data-lesson-page]");
  const correctMessage = quiz.dataset.correctMessage || "Bien joue, c'est la bonne technique.";
  const wrongMessage = quiz.dataset.wrongMessage || "Dommage, ce n'est pas cette technique.";

  shuffleElements(answers, options);

  if (lessonPage?.dataset.lessonKey?.match(/^[0-9]?m[0-9]+c[0-9]+l3$/i)) {
    lessonPage.dataset.testPassed = "false";
  }

  if (nextLink) {
    nextLink.dataset.testPassed = "false";
  }

  answers.forEach((answer) => {
    answer.addEventListener("click", () => {
      const isCorrect = answer.dataset.correct === "true";

      answers.forEach((item) => item.classList.remove("is-wrong"));

      answer.classList.add(isCorrect ? "is-correct" : "is-wrong");
      feedback.textContent = isCorrect ? correctMessage : wrongMessage;
      feedback.classList.add(isCorrect ? "is-success" : "is-error");
      feedback.classList.remove(isCorrect ? "is-error" : "is-success");

      if (!isCorrect) {
        return;
      }

      answers.forEach((item) => {
        item.disabled = true;
      });

      if (lessonPage?.dataset.lessonKey?.match(/^[0-9]?m[0-9]+c[0-9]+l3$/i)) {
        lessonPage.dataset.testPassed = "true";
      }

      if (nextLink) {
        nextLink.dataset.testPassed = "true";
        showDamActionLink(nextLink, feedback, "Terminer la le\u00e7on");
      }
    });
  });
});

let youtubeApiPromise;

function loadYoutubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve(window.YT);
      };

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    });
  }

  return youtubeApiPromise;
}

document.querySelectorAll("[data-video-player]").forEach((player, index) => {
  const playButton = player.querySelector(".video-play-button");

  playButton?.addEventListener("click", async () => {
    const videoId = playButton.dataset.videoId;

    if (!videoId) {
      return;
    }

    const playerId = `youtube-technique-player-${Date.now()}-${index}`;
    const playerSlot = document.createElement("div");
    playerSlot.className = "youtube-player-slot";
    playerSlot.setAttribute("role", "button");
    playerSlot.setAttribute("tabindex", "0");
    playerSlot.setAttribute("aria-label", "Mettre la video en pause ou lecture");

    const playerMount = document.createElement("div");
    playerMount.id = playerId;

    playerSlot.appendChild(playerMount);

    const scrubber = document.createElement("input");
    scrubber.className = "video-progress";
    scrubber.type = "range";
    scrubber.min = "0";
    scrubber.max = "1000";
    scrubber.step = "1";
    scrubber.value = "0";
    scrubber.setAttribute("aria-label", "Avancer ou reculer dans la video");

    const scrubberWrap = document.createElement("div");
    scrubberWrap.className = "video-scrub";
    scrubberWrap.appendChild(scrubber);

    player.classList.add("is-playing");
    playButton.replaceWith(playerSlot);
    player.appendChild(scrubberWrap);

    const YouTube = await loadYoutubeApi();
    let duration = 0;
    let isSeeking = false;
    let isPlaying = false;

    const youtubePlayer = new YouTube.Player(playerId, {
      videoId,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        origin: window.location.origin,
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady(event) {
          duration = event.target.getDuration() || 0;
          event.target.playVideo();
        },
        onStateChange(event) {
          isPlaying = event.data === YouTube.PlayerState.PLAYING;
        }
      }
    });

    function togglePlayback() {
      if (!youtubePlayer.playVideo || !youtubePlayer.pauseVideo) {
        return;
      }

      if (isPlaying) {
        youtubePlayer.pauseVideo();
      } else {
        youtubePlayer.playVideo();
      }
    }

    playerSlot.addEventListener("click", togglePlayback);
    playerSlot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePlayback();
      }
    });

    function seekFromScrubber() {
      duration = youtubePlayer.getDuration?.() || duration;

      if (duration > 0) {
        youtubePlayer.seekTo((Number(scrubber.value) / 1000) * duration, true);
      }

      isSeeking = false;
    }

    scrubber.addEventListener("pointerdown", () => {
      isSeeking = true;
    });

    scrubber.addEventListener("input", () => {
      isSeeking = true;
    });

    scrubber.addEventListener("change", seekFromScrubber);
    scrubber.addEventListener("pointerup", seekFromScrubber);

    window.setInterval(() => {
      if (isSeeking || !youtubePlayer.getCurrentTime) {
        return;
      }

      duration = youtubePlayer.getDuration() || duration;
      const currentTime = youtubePlayer.getCurrentTime() || 0;

      if (duration > 0) {
        scrubber.value = String(Math.round((currentTime / duration) * 1000));
      }
    }, 500);
  });
});
