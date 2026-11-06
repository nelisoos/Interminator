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
    browser.contextMenus.update(MENU_ID, {
      title: "Interminator (unavailable here)",
      enabled: false,
    });
    return;
  }

  const result = await browser.storage.sync.get([domain]);
  const enabled = result[domain] === true;
  browser.contextMenus.update(MENU_ID, {
    title: enabled ? "Disable Interminator" : "Enable Interminator",
    enabled: true,
  });
}

async function refreshMenuForActiveTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (tab) refreshMenuForTab(tab);
}

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: MENU_ID,
    title: "Enable Interminator",
    contexts: ["all"],
  });
  refreshMenuForActiveTab();
});

// Keep the title in sync with whichever tab is actually active
browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await browser.tabs.get(activeInfo.tabId);
  refreshMenuForTab(tab);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active) return;
  if (changeInfo.status === "complete" || changeInfo.url) {
    refreshMenuForTab(tab);
  }
});

browser.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === browser.windows.WINDOW_ID_NONE) return;
  refreshMenuForActiveTab();
});

// If the popup's own toggle changes state for the active tab's domain,
// reflect that immediately too (not just after the next reload).
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  refreshMenuForActiveTab();
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab || !tab.url) return;

  const domain = domainFor(tab.url);
  if (!domain) return;

  browser.storage.sync.get([domain]).then((result) => {
    const nowEnabled = !(result[domain] === true);
    const apply = nowEnabled
      ? browser.storage.sync.set({ [domain]: true })
      : browser.storage.sync.remove(domain);

    apply.then(() => browser.tabs.reload(tab.id));
  });
});
