chrome.storage.local.get("debug", ({ debug }) => {
  document.querySelector("#debug").checked = debug;
});

chrome.storage.local.get("time", ({ time }) => {
  document.querySelector("#time").checked = time;
});

chrome.storage.local.get("key", ({ key }) => {
  console.log(key);
  document.querySelector("#key").value = key
    .split("")
    .map(() => "*")
    .join("");
});

document.querySelector("#debug").addEventListener("change", (e) => {
  chrome.storage.local.set({ debug: e.target.checked });
});

document.querySelector("#time").addEventListener("change", (e) => {
  chrome.storage.local.set({ time: e.target.checked });
});

document.querySelector("#key").addEventListener("change", (e) => {
  chrome.storage.local.set({ key: e.target.value });
});
