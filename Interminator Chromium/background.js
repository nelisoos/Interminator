const MENU_ID = "interminator-toggle";

function domainFor(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname || null;
  } catch {
    return null;
  }
}

async function refreshMenuForTab(tab) {
  if (!tab || !tab.url) return;
  const domain = domainFor(tab.url);

  if (!domain) {
    chrome.contextMenus.update(MENU_ID, {
      title: "Interminator (unavailable here)",
      enabled: false,
    });
    return;
  }

  const result = await chrome.storage.sync.get([domain]);
  const enabled = result[domain] === true;
  chrome.contextMenus.update(MENU_ID, {
    title: enabled ? "Disable Interminator" : "Enable Interminator",
    enabled: true,
  });
}

async function refreshMenuForActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab) refreshMenuForTab(tab);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Enable Interminator",
    contexts: ["all"],
  });
  refreshMenuForActiveTab();
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  refreshMenuForTab(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (changeInfo.status === "complete" || changeInfo.url) {
    refreshMenuForTab(tab);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  refreshMenuForActiveTab();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  refreshMenuForActiveTab();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || !tab.url) return;

  const domain = domainFor(tab.url);
  if (!domain) return;

  chrome.storage.sync.get([domain], (result) => {
    const nowEnabled = !(result[domain] === true);
    const apply = nowEnabled
      ? chrome.storage.sync.set({ [domain]: true })
      : chrome.storage.sync.remove(domain);

    apply.then(() => chrome.tabs.reload(tab.id));
  });
});
