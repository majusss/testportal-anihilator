const question =

const sha1 = async (value) => {
  const buffer = new TextEncoder().encode(value);
  const hash_bytes = await window.crypto.subtle.digest("SHA-1", buffer);
  return Array.from(new Uint8Array(hash_bytes))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
};

const getQuestion = () =>
  document.querySelector(".question_essence").firstChild?.textContent || "";

const getAnswers = async () => {
  const answersDOM = document.querySelectorAll(".answer_body");
  const answers = await Promise.all(
    Array.from(answersDOM).map(async (e) => ({
      id: await sha1(e.textContent.trim()),
      text: e.textContent.trim(),
    }))
  );
  return answers;
};

const getImages = async () => {
  const urls = Array.from(document.querySelectorAll(".question_essence img"))
    .map((e) => e.src)
    .filter(Boolean);

  if (urls.some((url) => url.startsWith("data:image/gif"))) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getImages();
  }
  return urls;
};

const isTestPage = !!document.querySelector(".remining-time");
const isRadio = !!document.querySelector("input[type=radio]");
const isCheckbox = !!document.querySelector("input[type=checkbox]");

const getPrompt = async () => {
  const question = getQuestion();
  const answers = await getAnswers();
  const type = isRadio
    ? "Pytanie typu jednokrotny wybór"
    : isCheckbox
    ? "Pytanie typu wielokrotny wybór"
    : "Pytanie otwarte";
  const answersText = answers.length
    ? `Możliwe odpowiedzi: ${answers.map((a) => JSON.stringify(a)).join(", ")}.`
    : "";
  return `Wczuj się w ucznia i odpowiedz na pytanie. ${type}. Treść: "${question}". ${answersText} Zwróć tablicę identyfikatorów poprawnych odpowiedzi lub odpowiedz na pytanie otwarte.`;
};

const parseResponse = (response) => {
  if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.log(response);
    return {
      error: "Invalid response format",
      correctAnswerIds: [],
      openQuestionAnswer: null,
    };
  }

  try {
    const parsed = JSON.parse(response.candidates[0].content.parts[0].text);
    return {
      correctAnswerIds: parsed.correctAnswerIds || [],
      openQuestionAnswer: parsed.openQuestionAnswer || null,
    };
  } catch (error) {
    return {
      error: "Failed to parse response: " + error.message,
      correctAnswerIds: [],
      openQuestionAnswer: null,
    };
  }
};

const clickById = async (id) => {
  const answers = await getAnswers();
  const answer = answers.find((ans) => ans.id === id);
  const answerDOM = Array.from(document.querySelectorAll(".answer_body")).find(
    (dom) => dom.textContent.trim() === answer.text
  );
  if (answerDOM) answerDOM.click();
};

const typeAnswer = (text) => {
  const input = document.querySelector(".question_answers input");
  if (input) {
    input.focus();
    document.execCommand("insertText", false, text);
  }
};

const answer = async (parsedResponse) => {
  if (parsedResponse.error) {
    console.error(parsedResponse);
    return;
  }

  if (parsedResponse.correctAnswerIds.length > 0) {
    await Promise.all(parsedResponse.correctAnswerIds.map(clickById));
  } else {
    typeAnswer(parsedResponse.openQuestionAnswer);
  }
};

const uploadFile = async (url) => {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error("Błąd podczas pobierania pliku: " + res.statusText);
  const blob = await res.blob();

  const formData = new FormData();
  formData.append("file", blob);

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Command": "start, upload, finalize",
        "X-Goog-Upload-Header-Content-Length": blob.size,
        "X-Goog-Upload-Header-Content-Type": blob.type,
      },
      body: formData,
    }
  );

  if (!uploadRes.ok)
    throw new Error("Błąd podczas wczytywania pliku: " + uploadRes.statusText);

  const data = await uploadRes.json();
  return { fileUri: data.file.uri, mimeType: blob.type };
};

const askGemini = async () => {
  const prompt = await getPrompt();
  const images = await getImages();
  const uploadedFiles = await Promise.all(images.map(uploadFile));

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          ...uploadedFiles,
        ],
      },
    ],
    generationConfig: {
      temperature: 1,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          correctAnswerIds: { type: "array", items: { type: "string" } },
          openQuestionAnswer: { type: "string" },
        },
      },
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-002:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );
    const data = await response.json();
    answer(parseResponse(data));
  } catch (error) {
    console.error("Błąd:", error);
  }
};

if (isTestPage) askGemini();
