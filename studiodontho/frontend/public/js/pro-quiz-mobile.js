const quizPage = document.querySelector("[data-pro-quiz]");

if (quizPage) {
  const quizObject = document.querySelector("#quiz-object");
  const quizObjectImage = quizObject?.querySelector(".quiz-object-image");
  const quizMessage = document.querySelector("#quiz-message");
  const nextPageLink = document.querySelector("#next-quiz-page");
  const answers = Array.from(document.querySelectorAll(".quiz-answer"));
  const answerGroups = Array.from(document.querySelectorAll(".quiz-options"));
  const correctName = quizPage.dataset.correctName || "cet outil";
  const correctMessage = quizPage.dataset.correctMessage || `Bien joue, c'est ${correctName} !`;
  const wrongMessage = quizPage.dataset.wrongMessage || `Dommage, c'est ${correctName}.`;

  quizObjectImage?.addEventListener("error", () => {
    quizObjectImage.hidden = true;
    quizObject?.classList.add("is-image-missing");
  });

  function revealNextPage() {
    if (nextPageLink) {
      if (nextPageLink.classList.contains("quiz-finish-link")) {
        nextPageLink.classList.remove("top-link", "next-link", "quiz-next-link");
        nextPageLink.classList.add("quiz-final-button");
        nextPageLink.textContent = "Retour au chemin";
        document.querySelector(".quiz-options")?.after(nextPageLink);
      }

      nextPageLink.hidden = false;
    }
  }

  function lockAnswers() {
    answers.forEach((answer) => {
      answer.disabled = true;
    });
  }

  function shuffleAnswers() {
    answerGroups.forEach((group) => {
      const groupAnswers = Array.from(group.querySelectorAll(".quiz-answer"));

      for (let index = groupAnswers.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [groupAnswers[index], groupAnswers[randomIndex]] = [groupAnswers[randomIndex], groupAnswers[index]];
      }

      groupAnswers.forEach((answer) => group.appendChild(answer));
    });
  }

  function answerQuiz(selectedAnswer) {
    const isCorrect = selectedAnswer.dataset.correct === "true";

    answers.forEach((answer) => answer.classList.remove("is-wrong"));
    quizObject?.classList.remove("is-correct", "is-wrong");

    selectedAnswer.classList.add(isCorrect ? "is-correct" : "is-wrong");
    quizObject?.classList.add(isCorrect ? "is-correct" : "is-wrong");
    quizMessage.textContent = isCorrect ? correctMessage : wrongMessage;

    if (!isCorrect) {
      if (nextPageLink) {
        nextPageLink.hidden = true;
      }
      return;
    }

    lockAnswers();
    revealNextPage();
  }

  shuffleAnswers();

  answers.forEach((answer) => {
    answer.addEventListener("click", () => {
      if (!answer.disabled) {
        answerQuiz(answer);
      }
    });
  });
}
