// content.js
(function () {
  "use strict";

  let shortcuts = [];
  let isCacheValid = false;

 // UPDATE the loadShortcuts function in content.js to add debugging:
function loadShortcuts() {
  console.log("Loading shortcuts...");

  // Try localStorage first for performance
  try {
    const cached = localStorage.getItem("urlShortkeyShortcuts");
    if (cached) {
      shortcuts = JSON.parse(cached);
      isCacheValid = true;
      console.log("Loaded shortcuts from cache:", shortcuts.length, shortcuts);
      // Debug: Check if openInNewTab property exists
      shortcuts.forEach((shortcut, index) => {
        console.log(`Shortcut ${index}:`, shortcut.shortkey, "openInNewTab:", shortcut.openInNewTab);
      });
    }
  } catch (e) {
    console.log("Cache load failed:", e);
  }

  // Always check chrome.storage for updates
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.sync.get(["shortcuts"], function (result) {
      const newShortcuts = result.shortcuts || [];
      console.log("Loaded from chrome.storage:", newShortcuts.length, newShortcuts);
      
      // Debug: Check if openInNewTab property exists
      newShortcuts.forEach((shortcut, index) => {
        console.log(`Chrome storage shortcut ${index}:`, shortcut.shortkey, "openInNewTab:", shortcut.openInNewTab);
      });

      if (JSON.stringify(newShortcuts) !== JSON.stringify(shortcuts)) {
        shortcuts = newShortcuts;
        try {
          localStorage.setItem(
            "urlShortkeyShortcuts",
            JSON.stringify(shortcuts)
          );
        } catch (e) {
          console.log("Cache update failed:", e);
        }
      }
      isCacheValid = true;
    });
  }
}

  // Check if user is focused on an input field
  function isUserTyping() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    // Direct input fields
    if (
      activeElement.tagName === "INPUT" &&
      activeElement.type !== "checkbox" &&
      activeElement.type !== "radio" &&
      activeElement.type !== "button" &&
      activeElement.type !== "submit" &&
      activeElement.type !== "reset"
    ) {
      return true;
    }

    // Textareas
    if (activeElement.tagName === "TEXTAREA") {
      return true;
    }

    // Contenteditable elements
    if (activeElement.isContentEditable) {
      return true;
    }

    return false;
  }

  // Parse key combination - FIXED VERSION
  function parseKeyCombination(event) {
    const keys = [];

    if (event.ctrlKey) keys.push("Ctrl");
    if (event.shiftKey) keys.push("Shift");
    if (event.altKey) keys.push("Alt");

    // Handle special keys
    const key = event.key.toLowerCase();

    // Skip if only modifiers are pressed
    if (["control", "shift", "alt", "meta"].includes(key)) {
      return "";
    }

    if (key === " ") {
      keys.push("Space");
    } else if (key === "escape") {
      keys.push("Esc");
    } else if (key === "tab") {
      keys.push("Tab");
    } else if (key === "enter") {
      keys.push("Enter");
    } else if (key === "backspace") {
      keys.push("Backspace");
    } else if (key === "delete") {
      keys.push("Delete");
    } else if (key === "arrowup") {
      keys.push("↑");
    } else if (key === "arrowdown") {
      keys.push("↓");
    } else if (key === "arrowleft") {
      keys.push("←");
    } else if (key === "arrowright") {
      keys.push("→");
    } else if (key === "pageup") {
      keys.push("Page Up");
    } else if (key === "pagedown") {
      keys.push("Page Down");
    } else if (key === "home") {
      keys.push("Home");
    } else if (key === "end") {
      keys.push("End");
    } else if (key === "insert") {
      keys.push("Insert");
    } else if (key.length === 1 && /[a-z0-9]/i.test(key)) {
      // Regular character keys
      keys.push(key.toUpperCase());
    } else if (key.startsWith("f") && key.length > 1) {
      // Function keys F1-F12
      const fNumber = key.substring(1);
      if (!isNaN(fNumber)) {
        keys.push(key.toUpperCase());
      }
    }

    return keys.join("+");
  }

  // Find matching shortcut - FIXED VERSION
  function findMatchingShortcut(keyCombination, currentDomain) {
    if (!shortcuts || shortcuts.length === 0) {
      console.log("No shortcuts available");
      return null;
    }

    // Clean current domain for comparison
    const cleanDomain = currentDomain.replace("www.", "");

    console.log("Looking for:", keyCombination, "on domain:", cleanDomain);

    // Look for global shortcuts first (they have lower priority)
    const globalMatch = shortcuts.find(
      (shortcut) =>
        shortcut.shortkey.toLowerCase() === keyCombination.toLowerCase() &&
        shortcut.domain === "*"
    );

    // Look for domain-specific shortcuts (higher priority)
    const domainMatch = shortcuts.find(
      (shortcut) =>
        shortcut.shortkey.toLowerCase() === keyCombination.toLowerCase() &&
        shortcut.domain === cleanDomain
    );

    // Domain-specific shortcuts override global shortcuts
    if (domainMatch) {
      console.log("Found domain-specific shortcut:", domainMatch);
      return domainMatch;
    }

    if (globalMatch) {
      console.log("Found global shortcut:", globalMatch);
      return globalMatch;
    }

    console.log("No matching shortcut found");
    return null;
  }

  // REPLACE the handleKeydown function in content.js:
function handleKeydown(event) {
  // Check if user is typing first - just return, no message
  if (isUserTyping()) {
    return;
  }

  // Don't handle events that are already handled
  if (event.defaultPrevented) {
    return;
  }

  // Get key combination
  const keyCombination = parseKeyCombination(event);

  // Don't handle empty or invalid combinations
  if (!keyCombination || keyCombination === "") {
    return;
  }

  console.log("Key combination:", keyCombination);

  // Find matching shortcut
  const currentDomain = window.location.hostname;
  const shortcut = findMatchingShortcut(keyCombination, currentDomain);

  if (shortcut) {
    console.log("Shortcut triggered:", shortcut.shortkey, "->", shortcut.url);
    console.log("Open in new tab:", shortcut.openInNewTab); // Debug log
    event.preventDefault();
    event.stopPropagation();

    // Navigate to the URL - FIX: Properly check openInNewTab
    if (shortcut.openInNewTab === true) {
      // Open in new tab
      console.log("Opening in new tab");
      window.open(shortcut.url, '_blank', 'noopener,noreferrer');
    } else {
      // Open in current tab
      console.log("Opening in current tab");
      window.location.href = shortcut.url;
    }
  }
}

  // Listen for messages from popup
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.action === "clearCache") {
        shortcuts = [];
        isCacheValid = false;
        loadShortcuts();
        sendResponse({ status: "cache cleared" });
      }
    });
  }

  // Initialize
  function initialize() {
    console.log("URL Shortkey content script initializing...");
    loadShortcuts();

    // Remove existing event listener to avoid duplicates
    document.removeEventListener("keydown", handleKeydown, true);

    // Add event listener with capture phase to catch events early
    document.addEventListener("keydown", handleKeydown, true);

    console.log("URL Shortkey content script initialized successfully");
  }

  // Initialize when page is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
