const pageScript = document.createElement("script");
pageScript.src = chrome.extension.getURL("pageScript.js");
(document.head || document.documentElement).appendChild(pageScript);

chrome.storage.local.get("time", ({ time }) => {
  if (time) {
    const s = document.createElement("script");
    s.src = chrome.extension.getURL("timeScript.js");
    (document.head || document.documentElement).appendChild(s);
  }
});

chrome.storage.local.get("key", ({ key }) => {
  if (key) {
    const s = document.createElement("script");
    s.innerHTML = `window.geminiApiKey = "${key}";`;
    (document.head || document.documentElement).appendChild(s);
  }
});

chrome.storage.local.get("debug", ({ debug }) => {
  const s = document.createElement("script");
  s.innerHTML = `window.showDebug = "${debug}";`;
  (document.head || document.documentElement).appendChild(s);
});

const ai = document.createElement("script");
ai.src = chrome.extension.getURL("ai.js");
(document.head || document.documentElement).appendChild(ai);
