const setup = () => {
  chrome.storage.local.get("state", function ({ state }) {
    document.querySelector("#in").checked = state;
  });

  chrome.storage.local.get("time", function ({ time }) {
    document.querySelector("#time").checked = time;
  });
};
setup();

document.querySelector("#in").onclick = () => {
  const off = document.querySelector("#in").checked;
  chrome.storage.local.set({ state: off });
};

document.querySelector("#time").onclick = () => {
  const time = document.querySelector("#time").checked;
  chrome.storage.local.set({ time });
};
