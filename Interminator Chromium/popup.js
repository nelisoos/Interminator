document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("toggleBtn");
  const siteName = document.getElementById("siteName");
  const siteIcon = document.getElementById("siteIcon");
  const fontSelect = document.getElementById("fontSelect");

  chrome.storage.sync.get(["interminatorFont"], function (result) {
    fontSelect.value = result.interminatorFont === "geist" ? "geist" : "inter";
  });

  fontSelect.addEventListener("change", function () {
    chrome.storage.sync.set({ interminatorFont: fontSelect.value }).then(function () {
      chrome.storage.sync.get(null, function (all) {
        const enabledDomains = new Set(
          Object.keys(all).filter((k) => k !== "interminatorFont" && all[k] === true)
        );
        chrome.tabs.query({}, function (allTabs) {
          allTabs.forEach((t) => {
            try {
              if (t.url && enabledDomains.has(new URL(t.url).hostname)) {
                chrome.tabs.reload(t.id);
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

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0] || !tabs[0].url) {
      siteName.textContent = "Not available on this page";
      siteIcon.style.display = "none";
      btn.disabled = true;
      return;
    }

    const url = new URL(tabs[0].url);
    const domain = url.hostname;
    const displayDomain = domain.replace(/^www\./, "");

    if (url.protocol === "chrome:" || url.protocol === "chrome-extension:") {
      siteName.textContent = "Not available on this page";
      siteIcon.style.display = "none";
      btn.disabled = true;
      return;
    }

    siteName.textContent = displayDomain;

    const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
    faviconUrl.searchParams.set("pageUrl", tabs[0].url);
    faviconUrl.searchParams.set("size", "32");
    siteIcon.src = faviconUrl.toString();

    siteIcon.onerror = function () {
      siteIcon.style.display = "none";
    };

    chrome.storage.sync.get([domain], function (result) {
      render(result[domain] === true);
    });

    btn.addEventListener("click", function () {
      const enabled = !btn.classList.contains("active");

      const apply = enabled
        ? chrome.storage.sync.set({ [domain]: true })
        : chrome.storage.sync.remove(domain);

      apply.then(function () {
        render(enabled);
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });
});
