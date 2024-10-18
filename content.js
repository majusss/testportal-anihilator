chrome.storage.local.get("state", function ({ state }) {
  if (state) {
    const s = document.createElement("script");
    s.src = chrome.extension.getURL("pageScript.js");
    (document.head || document.documentElement).appendChild(s);
  }
});

chrome.storage.local.get("time", function ({ time }) {
  if (time) {
    const s = document.createElement("script");
    s.src = chrome.extension.getURL("timeScript.js");
    (document.head || document.documentElement).appendChild(s);
  }
});

const s = document.createElement("script");
s.src = chrome.extension.getURL("prompt.js");
(document.head || document.documentElement).appendChild(s);
