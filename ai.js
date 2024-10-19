const log = (...args) => {
  const lastLog = document.querySelector("#ai-log");
  if (lastLog) lastLog.remove();
  const logEl = document.createElement("div");
  logEl.style =
    "position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); background: white; padding: 10px; border-radius: 8px; z-index: 9999; opacity: 0.7; box-shadow: 0 0 10px rgba(0,0,0,0.1);";
  logEl.id = "ai-log";
  logEl.textContent = args.join(" ");
  document.body.appendChild(logEl);
};

const sha1 = async (value) => {
  const buffer = new TextEncoder().encode(value);
  const hashBuffer = await window.crypto.subtle.digest("SHA-1", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
};

const getQuestionText = () =>
  document.querySelector(".question_essence").textContent || "";

const getAnswers = async () => {
  const answersDOM = Array.from(document.querySelectorAll(".answer_body"));
  log("Pobieram odpowiedzi...");
  return Promise.all(
    answersDOM.map(async (el) => {
      const text = el.textContent.trim();
      const id = await sha1(text);
      return { id, text };
    })
  );
};

const getImages = async () => {
  const imgUrls = Array.from(document.querySelectorAll(".question_essence img"))
    .map((img) => img?.src)
    .filter(Boolean);

  if (imgUrls.some((url) => url.startsWith("data:image/gif"))) {
    log("Oczekiwanie na pełne załadowanie obrazów...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getImages();
  }
  log("Pobrano obrazy", imgUrls.length);
  return imgUrls;
};

const isTestPage = Boolean(document.querySelector(".remining-time"));
const isRadio = Boolean(document.querySelector("input[type=radio]"));
const isCheckbox = Boolean(document.querySelector("input[type=checkbox]"));

const getPrompt = async () => {
  const INTRO = "Wczuj sie w ucznia i odpowiedz na pytanie";
  const TYPE = isRadio
    ? "Pytanie typu jednokrotny wybor"
    : isCheckbox
    ? "Pytanie typu wielokrotny wybor"
    : "Pytanie otwarte";
  const QUESTION = `Tresc: "${getQuestionText()}"`;

  const answers = await getAnswers();
  const ANSWERS = answers.length
    ? `Mozliwe odpowiedzi: ${answers.map(JSON.stringify).join(", ")}`
    : "";
  const OUTRO =
    "Zwroc tablice identyfikatorow poprawnych odpowiedzi lub odpowiedz na pytanie otwarte";

  const fullPrompt = `${INTRO}. ${TYPE}. ${QUESTION}. ${ANSWERS}. ${OUTRO}`;
  log("Wygenerowano prompt:");
  return fullPrompt;
};

const parseResponse = (response) => {
  const candidate = response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) {
    console.error("Błędny format odpowiedzi", response);
    return {
      error: "Invalid response format",
      correctAnswerIds: [],
      openQuestionAnswer: null,
    };
  }

  try {
    const parsed = JSON.parse(candidate);
    log("Przetwarzanie odpowiedz od Gemini");
    return {
      error: null,
      correctAnswerIds: parsed.correctAnswerIds || [],
      openQuestionAnswer: parsed.openQuestionAnswer || null,
    };
  } catch (err) {
    console.error("Błąd parsowania odpowiedzi:", err.message);
    return {
      error: `Failed to parse response: ${err.message}`,
      correctAnswerIds: [],
      openQuestionAnswer: null,
    };
  }
};

const clickById = async (id) => {
  const answers = await getAnswers();
  const answer = answers.find((ans) => ans.id === id);
  const answerDOM = Array.from(document.querySelectorAll(".answer_body")).find(
    (el) => el.textContent.trim() === answer.text
  );
  if (answerDOM) {
    log("Klikam odpowiedźi", answer.text);
    answerDOM.click();
  }
};

const typeAnswer = (text) => {
  const input = document.querySelector(".question_answers input");
  if (input) {
    input.focus();
    log(`Wprowadzanie odpowiedzi tekstowej: ${text}`);
    document.execCommand("insertText", false, text);
  }
};

const handleAnswer = (parsedResponse) => {
  if (parsedResponse.error) return console.error(parsedResponse);

  if (parsedResponse.correctAnswerIds.length === 0) {
    log("Wprowadzam odpowiedź na pytanie otwarte.");
    typeAnswer(parsedResponse.openQuestionAnswer);
  } else {
    log("Klikam poprawne odpowiedzi.");
    parsedResponse.correctAnswerIds.forEach(clickById);
  }
};

const uploadFile = async (url, key) => {
  try {
    log(`Pobieranie zdjecia z URL: ${url}`);
    const downloadRes = await fetch(url);
    if (!downloadRes.ok)
      throw new Error(`Download error: ${downloadRes.statusText}`);

    const blob = await downloadRes.blob();
    const mimeType = "image/png";
    const numBytes = blob.size;

    log("Rozpoczynam przesyłanie pliku...");

    const initialRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": numBytes,
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: { display_name: "IMAGE_FILE" },
        }),
      }
    );

    if (!initialRes.ok)
      throw new Error(
        `Initial upload request failed: ${initialRes.statusText}`
      );
    const uploadUrl = initialRes.headers.get("x-goog-upload-url");

    log("Przesyłanie pliku na URL Gemini...");

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": numBytes,
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: blob,
    });

    if (!uploadRes.ok)
      throw new Error(`File upload failed: ${uploadRes.statusText}`);
    const uploadData = await uploadRes.json();

    log("Przesyłanie zakończone.");
    return uploadData.file.uri;
  } catch (err) {
    console.error("File upload error:", err);
    throw err;
  }
};

const askGemini = async (key) => {
  const prompt = await getPrompt();
  const images = await getImages();
  const uploadedUris = await Promise.all(images.map((i) => uploadFile(i, key)));
  const imageParts = uploadedUris.map((uri) => ({
    file_data: { mime_type: "image/jpeg", file_uri: uri },
  }));

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts],
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

  log("Wysyłam zapytanie do API Gemini...");
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );
    const data = await response.json();
    log("Otrzymano odpowiedź z API:");
    handleAnswer(parseResponse(data));
  } catch (error) {
    console.error("Błąd podczas komunikacji z API:", error);
  }
};

if (isTestPage && window.geminiApiKey) askGemini(window.geminiApiKey);
