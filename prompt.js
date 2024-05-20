const question =
  document.querySelector(".question_essence").firstChild.textContent;

const options = Array.from(document.querySelectorAll(".answer_body"))?.map(
  (e) => e.textContent
);

const isRadio = document.querySelector("input[type=radio]") != null;

const isCheckbox = document.querySelector("input[type=checkbox]") != null;

const prompt = `Poniżej zadam pytanie na które udzielisz najbardziej prawdopodobnej odpowiedzi. NIE ROZPISUJ SIE CHYBA ZE NIE JESTES PEWIEN. ${
  options.length
    ? `Oto możliwe odpowiedzi, ${
        isRadio
          ? "jedna jest poprawna"
          : isCheckbox
          ? "więcej niż jedna jest poprawna"
          : ""
      }: ${options.join(", ")}.`
    : "To pytanie otwarte."
} Pytanie brzmi: ${question}`;

navigator.clipboard.writeText(prompt);
