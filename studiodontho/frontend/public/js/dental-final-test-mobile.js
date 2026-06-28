(() => {
  const dentalFinalTest = document.querySelector("[data-dental-final-test]");

  if (!dentalFinalTest) {
    return;
  }

  const lessonPage = document.querySelector("[data-lesson-page]") || dentalFinalTest;
  const lessonKey = lessonPage?.dataset.lessonKey || "";
  const isStrictTest = /^[0-9]?m[0-9]+c[0-9]+l3$/i.test(lessonKey);
  const isDiscoveryQuiz = dentalFinalTest.dataset.discoveryQuiz === "true" ||
    /^[0-9]?m[0-9]+c[0-9]+l1$/i.test(lessonKey);
  const questions = Array.from(document.querySelectorAll("[data-test-question]"));
  const finishLink = document.querySelector("[data-complete-lesson]");
  const scoreLabel = document.querySelector("#dental-test-score");
  const successMessage = document.querySelector("#dental-test-success");

  dentalFinalTest.dataset.testPassed = "false";
  dentalFinalTest.dataset.reviewMode = isStrictTest ? "strict" : (isDiscoveryQuiz ? "discovery" : "retry");

  if (finishLink) {
    finishLink.dataset.testPassed = "false";
  }

  function moveFinishButton() {
    if (!finishLink) {
      if (successMessage) {
        successMessage.textContent = successMessage.textContent || "Quiz termine.";
        successMessage.hidden = false;
      }
      return;
    }

    finishLink.dataset.testPassed = "true";
    finishLink.hidden = false;
    finishLink.textContent = "Terminer la le\u00e7on";

    if (!successMessage) {
      return;
    }

    finishLink.classList.remove("top-link", "next-link", "recap-finish-link");
    finishLink.classList.add("dental-test-finish-button");
    successMessage.appendChild(finishLink);
    successMessage.hidden = false;
  }

  function shuffleOptions(group) {
    const options = Array.from(group.querySelectorAll("button"));

    for (let index = options.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[randomIndex]] = [options[randomIndex], options[index]];
    }

    options.forEach((option) => group.appendChild(option));
  }

  function getPassThreshold(total) {
    if (total >= 20) {
      return 18;
    }

    if (total >= 10) {
      return 8;
    }

    return total;
  }

  function getCorrectCount() {
    return questions.filter((question) => question.dataset.userCorrect === "true").length;
  }

  function getAnsweredCount() {
    return questions.filter((question) => question.dataset.answered === "true").length;
  }

  function setScoreLabel(text) {
    if (scoreLabel) {
      scoreLabel.textContent = text;
    }
  }

  function showQuizFinishButton() {
    dentalFinalTest.dataset.testPassed = "true";

    if (successMessage && finishLink) {
      successMessage.textContent = "";
    }

    moveFinishButton();
  }

  function updateRetryScore() {
    const completedCount = questions.filter((question) => question.classList.contains("is-complete")).length;
    const total = questions.length;

    setScoreLabel(`${completedCount}/${total} bonnes r\u00e9ponses`);

    if (completedCount === total) {
      showQuizFinishButton();
    }
  }

  function updateStrictProgress(validateButton) {
    const answeredCount = getAnsweredCount();
    const total = questions.length;

    setScoreLabel(`${answeredCount}/${total} r\u00e9ponses donn\u00e9es`);

    if (validateButton) {
      validateButton.disabled = answeredCount !== total;
    }
  }

  function updateDiscoveryScore() {
    const answeredCount = getAnsweredCount();
    const total = questions.length;

    setScoreLabel(`${answeredCount}/${total} questions vues`);

    if (answeredCount === total) {
      dentalFinalTest.dataset.testPassed = "true";
      if (successMessage) {
        successMessage.textContent = successMessage.textContent || "Quiz termine.";
        successMessage.hidden = false;
      }
    }
  }

  function showStrictMessage(message, stateClass = "") {
    if (!successMessage) {
      return;
    }

    successMessage.classList.remove("is-accepted", "is-refused");
    if (stateClass) {
      successMessage.classList.add(stateClass);
    }
    successMessage.textContent = message;
    successMessage.hidden = false;
  }

  function createStrictActions() {
    const actions = document.createElement("div");
    actions.className = "dental-test-actions";

    const validateButton = document.createElement("button");
    validateButton.className = "dental-test-check-button";
    validateButton.type = "button";
    validateButton.textContent = "Valider le test";
    validateButton.disabled = true;

    const retryButton = document.createElement("button");
    retryButton.className = "dental-test-retry-button";
    retryButton.type = "button";
    retryButton.textContent = "Recommencer";
    retryButton.hidden = true;

    actions.append(validateButton, retryButton);

    const target = successMessage || document.querySelector(".course-sheet");
    target?.before(actions);

    return { validateButton, retryButton };
  }

  function resetStrictTest(validateButton, retryButton) {
    dentalFinalTest.dataset.testPassed = "false";
    if (finishLink) {
      finishLink.dataset.testPassed = "false";
      finishLink.hidden = true;
    }

    questions.forEach((question) => {
      question.dataset.answered = "false";
      question.dataset.userCorrect = "false";
      question.classList.remove("is-answered", "is-complete", "is-review-correct", "is-review-wrong");
      const feedback = question.querySelector(".test-feedback");

      if (feedback) {
        feedback.textContent = "";
      }
      question.querySelectorAll(".test-options button").forEach((option) => {
        option.disabled = false;
        option.classList.remove("is-selected", "is-correct", "is-wrong");
      });
    });

    if (successMessage) {
      successMessage.classList.remove("is-accepted", "is-refused");
      successMessage.textContent = "";
      successMessage.hidden = true;
    }

    retryButton.hidden = true;
    validateButton.hidden = false;
    updateStrictProgress(validateButton);
  }

  function validateStrictTest(validateButton, retryButton) {
    const total = questions.length;
    const answeredCount = getAnsweredCount();

    if (answeredCount !== total) {
      showStrictMessage("R\u00e9ponds \u00e0 toutes les questions avant de valider.", "is-refused");
      return;
    }

    questions.forEach((question) => {
      const selectedOption = question.querySelector(".test-options button.is-selected");
      const correctOption = question.querySelector(".test-options button[data-correct='true']");
      const feedback = question.querySelector(".test-feedback");
      const isCorrect = selectedOption?.dataset.correct === "true";

      question.classList.add(isCorrect ? "is-review-correct" : "is-review-wrong");
      selectedOption?.classList.add(isCorrect ? "is-correct" : "is-wrong");
      correctOption?.classList.add("is-correct");

      if (isCorrect) {
        feedback.textContent = "Bonne r\u00e9ponse.";
        return;
      }

      feedback.textContent = `Ta r\u00e9ponse est en rouge. La bonne r\u00e9ponse est : ${correctOption?.textContent.trim() || ""}`;
    });

    const correctCount = getCorrectCount();
    const passThreshold = getPassThreshold(total);
    const accepted = correctCount >= passThreshold;

    setScoreLabel(`${correctCount}/${total} bonnes r\u00e9ponses`);

    if (accepted) {
      dentalFinalTest.dataset.testPassed = "true";
      showStrictMessage(`Accept\u00e9 : ${correctCount}/${total}.`, "is-accepted");
      validateButton.hidden = true;
      retryButton.hidden = true;
      moveFinishButton();
      return;
    }

    showStrictMessage(`Pas accept\u00e9 : ${correctCount}/${total}. Il faut au moins ${passThreshold}/${total}.`, "is-refused");
    validateButton.hidden = true;
    retryButton.hidden = false;
  }

  function initRetryQuiz() {
    questions.forEach((question) => {
      const options = Array.from(question.querySelectorAll(".test-options button"));
      const feedback = question.querySelector(".test-feedback");
      const optionGroup = question.querySelector(".test-options");

      if (optionGroup) {
        shuffleOptions(optionGroup);
      }

      options.forEach((option) => {
        option.addEventListener("click", () => {
          if (question.classList.contains("is-complete")) {
            return;
          }

          options.forEach((item) => item.classList.remove("is-wrong"));

          if (option.dataset.correct === "true") {
            option.classList.add("is-correct");
            options.forEach((item) => {
              item.disabled = true;
            });
            question.classList.add("is-complete");

            if (feedback) {
              feedback.textContent = "Bonne r\u00e9ponse.";
            }

            updateRetryScore();
            return;
          }

          option.classList.add("is-wrong");

          if (feedback) {
            feedback.textContent = "Ce n'est pas encore \u00e7a, relis les indices et retente.";
          }
        });
      });
    });

    updateRetryScore();
  }

  function initDiscoveryQuiz() {
    questions.forEach((question, questionIndex) => {
      const options = Array.from(question.querySelectorAll(".test-options button"));
      const feedback = question.querySelector(".test-feedback");
      const optionGroup = question.querySelector(".test-options");

      if (optionGroup) {
        shuffleOptions(optionGroup);
      }

      question.dataset.answered = "false";
      question.dataset.userCorrect = "false";

      options.forEach((option) => {
        option.addEventListener("click", () => {
          if (question.dataset.answered === "true") {
            return;
          }

          const correctOption = question.querySelector(".test-options button[data-correct='true']");
          const isCorrect = option.dataset.correct === "true";

          question.dataset.answered = "true";
          question.dataset.userCorrect = String(isCorrect);
          question.classList.add("is-answered", isCorrect ? "is-review-correct" : "is-review-wrong");
          option.classList.add(isCorrect ? "is-correct" : "is-wrong");
          correctOption?.classList.add("is-correct");

          options.forEach((item) => {
            item.disabled = true;
          });

          if (feedback) {
            feedback.textContent = isCorrect
              ? "Bonne reponse."
              : `Pas grave : la bonne reponse est ${correctOption?.textContent.trim() || ""}.`;
          }

          updateDiscoveryScore();

          const nextQuestion = questions[questionIndex + 1];
          if (nextQuestion) {
            window.setTimeout(() => {
              nextQuestion.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 350);
          }
        });
      });
    });

    updateDiscoveryScore();
  }

  function initStrictTest() {
    const { validateButton, retryButton } = createStrictActions();

    questions.forEach((question) => {
      const options = Array.from(question.querySelectorAll(".test-options button"));
      const feedback = question.querySelector(".test-feedback");
      const optionGroup = question.querySelector(".test-options");

      if (optionGroup) {
        shuffleOptions(optionGroup);
      }

      question.dataset.answered = "false";
      question.dataset.userCorrect = "false";

      options.forEach((option) => {
        option.addEventListener("click", () => {
          if (question.dataset.answered === "true") {
            return;
          }

          question.dataset.answered = "true";
          question.dataset.userCorrect = String(option.dataset.correct === "true");
          question.classList.add("is-answered");
          option.classList.add("is-selected");
          options.forEach((item) => {
            item.disabled = true;
          });

          if (feedback) {
            feedback.textContent = "R\u00e9ponse enregistr\u00e9e.";
          }

          updateStrictProgress(validateButton);
        });
      });
    });

    validateButton.addEventListener("click", () => validateStrictTest(validateButton, retryButton));
    retryButton.addEventListener("click", () => resetStrictTest(validateButton, retryButton));

    updateStrictProgress(validateButton);
  }

  if (isStrictTest) {
    initStrictTest();
  } else if (isDiscoveryQuiz) {
    initDiscoveryQuiz();
  } else {
    initRetryQuiz();
  }
})();
