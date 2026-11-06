(function() {
  const domain = window.location.hostname;

  browser.storage.sync.get([domain, 'interminatorFont']).then(function(result) {
    const enabled = result[domain] === true;
    if (!enabled) return;

    const font = result.interminatorFont === 'geist' ? 'geist' : 'inter';
    const fontFamily = font === 'geist' ? 'Geist' : 'Inter';
    const fontFile = font === 'geist' ? 'GeistVariable.woff2' : 'InterVariable.woff2';
    const fontUrl = browser.runtime.getURL(`assets/fonts/${fontFile}`);
    const MARK = 'data-interminator-icon';

    // Known icon-font libraries -- checked first since it's cheap and
    // catches the vast majority instantly, before falling back to the
    // more expensive computed-style capture below.
    const ICON_SELECTOR = [
      '[class*="material-icons"]', '[class*="material-symbols"]',
      '[class*="google-symbols"]',
      '.fa', '.fas', '.far', '.fal', '.fab', '.fad', '.fass', '.fasr',
      '.fa-solid', '.fa-regular', '.fa-light', '.fa-thin', '.fa-duotone', '.fa-brands', '.fa-sharp',
      '[class^="fa-"]', '[class*=" fa-"]',
      '[class^="icon-"]', '[class*=" icon-"]',
      '.glyphicon', '.mdi', '.bi', '.ion', 'ion-icon', '.octicon',
      '.iconify', 'iconify-icon', '[data-icon]', '.iconfont',
      '[class^="ti-"]', '[class*=" ti-"]',
      'svg', 'use'
    ].join(',');

    // Private-Use-Area codepoints: how unlisted/custom icon fonts encode
    // their glyphs. Inter has no glyphs there -> tofu/blank if forced.
    const PUA = /[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/u;

    const styleElement = document.createElement('style');
    styleElement.id = 'inter-font-override';
    styleElement.textContent = `
      @font-face {
        font-family: '${fontFamily}';
        font-style: normal;
        font-weight: 100 900;
        font-display: swap;
        src: url('${fontUrl}') format('woff2');
      }

      *:not([${MARK}]):not(pre):not(pre *):not(code):not(code *):not(kbd):not(samp):not(textarea) {
        font-family: '${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Fix one icon element: measure what its font-family would actually
    // be with our stylesheet out of the picture (disable it, read
    // getComputedStyle, re-enable), then force that exact value back on
    // inline. This works no matter *how* the site sets the icon font --
    // an explicit rule on the element, an obfuscated build-hash class, or
    // plain inheritance from an ancestor -- because it doesn't depend on
    // our rule correctly losing a cascade fight, it just restores the
    // answer directly.
    function fixIcon(el) {
      if (!el || el.nodeType !== 1 || el.hasAttribute(MARK)) return;
      el.setAttribute(MARK, '');
      styleElement.disabled = true;
      const original = getComputedStyle(el).fontFamily;
      styleElement.disabled = false;
      if (original) {
        el.style.setProperty('font-family', original, 'important');
      }
    }

    function scanTree(root) {
      if (!root || root.nodeType !== 1 && root.nodeType !== 11) return;
      const elements = root.nodeType === 1
        ? [root, ...root.querySelectorAll('*')]
        : [...root.querySelectorAll('*')];

      for (const el of elements) {
        if (el.matches && el.matches(ICON_SELECTOR)) {
          fixIcon(el);
        } else {
          for (const child of el.childNodes) {
            if (child.nodeType === 3 && PUA.test(child.nodeValue)) {
              fixIcon(el);
              break;
            }
          }
        }

        // Our stylesheet lives in the main document and can't select
        // inside shadow trees directly, but inherited font-family still
        // leaks in through the shadow boundary -- and neither
        // querySelectorAll nor a light-DOM MutationObserver can see into
        // one without doing this explicitly. Only reaches open roots;
        // closed shadow roots are inaccessible to any content script.
        if (el.shadowRoot) {
          scanTree(el.shadowRoot);
          observe(el.shadowRoot);
        }
      }
    }

    function observe(root) {
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) scanTree(n);
            else if (n.nodeType === 3 && PUA.test(n.nodeValue) && n.parentElement) {
              fixIcon(n.parentElement);
            }
          });
          if (m.type === 'characterData' && PUA.test(m.target.nodeValue) && m.target.parentElement) {
            fixIcon(m.target.parentElement);
          }
        }
      }).observe(root, { childList: true, subtree: true, characterData: true });
    }

    scanTree(document.documentElement);
    observe(document.documentElement);
  });
})();
