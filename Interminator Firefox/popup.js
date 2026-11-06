document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("toggleBtn");
  const siteName = document.getElementById("siteName");
  const siteIcon = document.getElementById("siteIcon");
  const fontSelect = document.getElementById("fontSelect");

  // Global font choice applies to every stored site, not just this domain
  browser.storage.sync.get(["interminatorFont"]).then(function (result) {
    fontSelect.value = result.interminatorFont === "geist" ? "geist" : "inter";
  });

  fontSelect.addEventListener("change", function () {
    browser.storage.sync.set({ interminatorFont: fontSelect.value }).then(function () {
      // Only reload tabs that are actually on an enabled domain
      browser.storage.sync.get(null).then(function (all) {
        const enabledDomains = new Set(
          Object.keys(all).filter((k) => k !== "interminatorFont" && all[k] === true)
        );
        browser.tabs.query({}).then(function (allTabs) {
          allTabs.forEach((t) => {
            try {
              if (t.url && enabledDomains.has(new URL(t.url).hostname)) {
                browser.tabs.reload(t.id);
              }
            } catch (e) {}
          });
        });
      });
    });
  });

  function render(enabled) {
    btn.textContent = enabled ? "active" : "turn on";
    btn.classList.toggle("active", enabled);
  }

  const blockedProtocols = ["about:", "moz-extension:", "resource:", "chrome:", "chrome-extension:"];

  // Get current tab URL
  browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    // Check if we have a valid tab with a URL
    if (!tabs[0] || !tabs[0].url) {
      siteName.textContent = "Not available on this page";
      siteIcon.style.display = "none";
      btn.disabled = true;
      return;
    }

    let url;
    try {
      url = new URL(tabs[0].url);
    } catch (e) {
      siteName.textContent = "Not available on this page";
      siteIcon.style.display = "none";
      btn.disabled = true;
      return;
    }
    const domain = url.hostname;
    const displayDomain = domain.replace(/^www\./, "");

    // Don't show on internal browser pages
    if (blockedProtocols.includes(url.protocol)) {
      siteName.textContent = "Not available on this page";
      siteIcon.style.display = "none";
      btn.disabled = true;
      return;
    }

    // Display current domain (without www.)
    siteName.textContent = displayDomain;

    // tab.favIconUrl works in both Chrome and Firefox
    if (tabs[0].favIconUrl) {
      siteIcon.src = tabs[0].favIconUrl;
    } else {
      siteIcon.style.display = "none";
    }

    // Hide icon if it fails to load
    siteIcon.onerror = function () {
      siteIcon.style.display = "none";
    };

    // Load saved state for this domain
    browser.storage.sync.get([domain]).then(function (result) {
      render(result[domain] === true); // Default to false (off)
    });

    // Toggle on click, save state, reload page
    btn.addEventListener("click", function () {
      const enabled = !btn.classList.contains("active");

      const apply = enabled
        ? browser.storage.sync.set({ [domain]: true })
        : browser.storage.sync.remove(domain);

      apply.then(function () {
        render(enabled);
        browser.tabs.reload(tabs[0].id);
      });
    });
  });
});
