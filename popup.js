document.addEventListener("DOMContentLoaded", function () {
  const shortcutsList = document.getElementById("shortcutsList");
  const urlInput = document.getElementById("url");
  const domainInput = document.getElementById("domain");
  const modifier1Select = document.getElementById("modifier1");
  const mainKeySelect = document.getElementById("mainKey");
  const modifier2Select = document.getElementById("modifier2");
  const colorSelect = document.getElementById("color");
  const addBtn = document.getElementById("addBtn");
  const updateBtn = document.getElementById("updateBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const themeSelect = document.getElementById("theme");
  const shortkeyPreview = document.getElementById("shortkeyPreview");
  const openInNewTabCheckbox = document.getElementById("openInNewTab");

  let editingIndex = -1;

  // Custom Toast Notification System
  function showToast(message, type = "error") {
    // Remove existing toast if any
    const existingToast = document.querySelector(".custom-toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
      </div>
    `;

    document.body.appendChild(toast);

    // Show toast with animation
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => {
      hideToast(toast);
    }, 5000);

    // Close button click
    toast.querySelector(".toast-close").addEventListener("click", () => {
      clearTimeout(autoRemove);
      hideToast(toast);
    });

    // Click anywhere to dismiss
    toast.addEventListener("click", (e) => {
      if (e.target === toast) {
        clearTimeout(autoRemove);
        hideToast(toast);
      }
    });
  }

  function hideToast(toast) {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }

  // Custom Confirm Dialog
  function showConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "confirm-overlay";

      overlay.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-message">${message}</div>
          <div class="confirm-buttons">
            <button class="confirm-btn confirm-cancel">Cancel</button>
            <button class="confirm-btn confirm-ok">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Show with animation
      setTimeout(() => {
        overlay.classList.add("show");
      }, 10);

      const dialog = overlay.querySelector(".confirm-dialog");

      overlay.querySelector(".confirm-cancel").addEventListener("click", () => {
        hideConfirm(overlay);
        resolve(false);
      });

      overlay.querySelector(".confirm-ok").addEventListener("click", () => {
        hideConfirm(overlay);
        resolve(true);
      });

      // Close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          hideConfirm(overlay);
          resolve(false);
        }
      });

      // Escape key to close
      const escapeHandler = (e) => {
        if (e.key === "Escape") {
          hideConfirm(overlay);
          resolve(false);
          document.removeEventListener("keydown", escapeHandler);
        }
      };
      document.addEventListener("keydown", escapeHandler);
    });
  }

  function hideConfirm(overlay) {
    overlay.classList.remove("show");
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 300);
  }

  // Load saved theme
  chrome.storage.sync.get(["theme"], function (result) {
    const theme = result.theme || "dark";
    themeSelect.value = theme;
    document.body.className = `theme-${theme}`;
  });

  // Load saved shortcuts
  loadShortcuts();

  // Theme change handler
  themeSelect.addEventListener("change", function () {
    const theme = this.value;
    document.body.className = `theme-${theme}`;
    chrome.storage.sync.set({ theme: theme });
  });

  // Update shortkey preview and validation
  function updateShortkeyPreview() {
    const modifier1 = modifier1Select.value;
    const mainKey = getKeyDisplay(mainKeySelect.value);
    const modifier2 = modifier2Select.value;

    let preview = "";

    // First modifier
    if (modifier1 !== "none") {
      preview += modifier1.charAt(0).toUpperCase() + modifier1.slice(1) + "+";
    }

    // Main key
    preview += mainKey;

    // Second key (can be modifier or character)
    if (modifier2 !== "none") {
      preview +=
        "+" +
        (["ctrl", "shift", "alt"].includes(modifier2)
          ? modifier2.charAt(0).toUpperCase() + modifier2.slice(1)
          : modifier2.toUpperCase());
    }

    shortkeyPreview.textContent = preview || "None";

    // Validate the combination
    validateCombination(modifier1, mainKeySelect.value, modifier2);
  }

  function validateCombination(modifier1, mainKey, modifier2) {
    const validationMessage =
      document.getElementById("validationMessage") || createValidationMessage();
    const addBtn = document.getElementById("addBtn");
    const updateBtn = document.getElementById("updateBtn");

    // Reset validation
    validationMessage.textContent = "";
    validationMessage.className = "validation-message";
    addBtn.disabled = false;
    updateBtn.disabled = false;

    // Clear any existing timeout
    if (window.validationTimeout) {
      clearTimeout(window.validationTimeout);
      window.validationTimeout = null;
    }

    // Check for invalid combinations
    const issues = [];

    // Rule 1: No multiple character keys
    const isModifier1Char = !["none", "ctrl", "shift", "alt"].includes(
      modifier1
    );
    const isModifier2Char = !["none", "ctrl", "shift", "alt"].includes(
      modifier2
    );
    const isMainKeyChar = mainKey.length === 1 && /[a-z0-9]/i.test(mainKey);

    if (
      (isModifier1Char && isMainKeyChar) ||
      (isMainKeyChar && isModifier2Char) ||
      (isModifier1Char && isModifier2Char)
    ) {
      issues.push("❌ Multiple character keys won't work (like A+B)");
    }

    // Rule 2: No mixed special keys with character keys
    const isMainKeySpecial =
      mainKey.length > 1 && !["ctrl", "shift", "alt"].includes(mainKey);
    if (
      (isModifier1Char && isMainKeySpecial) ||
      (isMainKeySpecial && isModifier2Char)
    ) {
      issues.push("❌ Mixed special keys with character keys won't work");
    }

    // Rule 3: Prevent duplicate modifiers (like Alt+Alt, Ctrl+Ctrl)
    if (modifier1 === mainKey && modifier1 !== "none") {
      issues.push(
        `❌ Duplicate modifier: ${modifier1.toUpperCase()} + ${mainKey.toUpperCase()} won't work`
      );
    }

    if (
      modifier2 === mainKey &&
      modifier2 !== "none" &&
      ["ctrl", "shift", "alt"].includes(modifier2)
    ) {
      issues.push(
        `❌ Duplicate modifier: ${mainKey.toUpperCase()} + ${modifier2.toUpperCase()} won't work`
      );
    }

    if (
      modifier1 === modifier2 &&
      modifier1 !== "none" &&
      modifier2 !== "none"
    ) {
      issues.push(
        `❌ Duplicate modifiers: ${modifier1.toUpperCase()} + ${modifier2.toUpperCase()} won't work`
      );
    }

    // Display validation results for basic rules first
    if (issues.length > 0) {
      validationMessage.innerHTML = issues.join("<br>");
      validationMessage.classList.add("error");
      addBtn.disabled = true;
      updateBtn.disabled = true;
      return false;
    }

    // Rule 4: Check for key conflicts with existing shortcuts
    const newShortkey = buildShortkey(modifier1, mainKey, modifier2);
    const newDomain = domainInput.value
      .trim()
      .replace(/https?:\/\//, "")
      .replace("www.", "");

    checkKeyConflicts(newShortkey, newDomain)
      .then((conflicts) => {
        if (conflicts.length > 0) {
          const conflictIssues = [];

          conflicts.forEach((conflict) => {
            if (conflict.type === "global_override") {
              conflictIssues.push(
                `❌ This key conflicts with global shortcut: "${conflict.existing.shortkey}" → ${conflict.existing.url}`
              );
            } else if (conflict.type === "specific_override") {
              conflictIssues.push(
                `❌ Global shortcut "${conflict.existing.shortkey}" will override this`
              );
            } else if (conflict.type === "same_domain") {
              conflictIssues.push(
                `❌ Key already used on ${conflict.existing.domain}: "${conflict.existing.shortkey}" → ${conflict.existing.url}`
              );
            }
          });

          if (conflictIssues.length > 0) {
            validationMessage.innerHTML = conflictIssues.join("<br>");
            validationMessage.classList.add("error");
            addBtn.disabled = true;
            updateBtn.disabled = true;
          }
        }
      })
      .catch((error) => {
        console.log("Error checking conflicts:", error);
      });

    // Rule 5: Warn about common browser shortcuts
    const combination = newShortkey.toLowerCase();
    const conflictingShortcuts = {
      // High severity - Critical browser functions
      "ctrl+t": { message: "Opens new tab", severity: "high" },
      "ctrl+w": { message: "Closes tab", severity: "high" },
      "ctrl+shift+t": { message: "Reopens closed tab", severity: "high" },
      "alt+f4": { message: "Closes browser", severity: "high" },

      // Medium severity - Common navigation
      "ctrl+r": { message: "Refreshes page", severity: "medium" },
      "ctrl+shift+r": { message: "Hard refresh", severity: "medium" },
      "alt+←": { message: "Go back", severity: "medium" },
      "alt+→": { message: "Go forward", severity: "medium" },
      f5: { message: "Refresh", severity: "medium" },

      // Low severity - Less critical functions
      "ctrl+h": { message: "Opens history", severity: "low" },
      "ctrl+j": { message: "Opens downloads", severity: "low" },
      "ctrl+l": { message: "Focuses address bar", severity: "low" },
      "ctrl+k": { message: "Focuses search", severity: "low" },
      "ctrl+f": { message: "Opens find dialog", severity: "low" },
      "ctrl+p": { message: "Opens print dialog", severity: "low" },

      // Tab management
      "ctrl+tab": { message: "Next tab", severity: "medium" },
      "ctrl+shift+tab": { message: "Previous tab", severity: "medium" },
      "ctrl+1": { message: "Switch to tab 1", severity: "low" },
      "ctrl+2": { message: "Switch to tab 2", severity: "low" },
      "ctrl+3": { message: "Switch to tab 3", severity: "low" },
      "ctrl+4": { message: "Switch to tab 4", severity: "low" },
      "ctrl+5": { message: "Switch to tab 5", severity: "low" },
      "ctrl+6": { message: "Switch to tab 6", severity: "low" },
      "ctrl+7": { message: "Switch to tab 7", severity: "low" },
      "ctrl+8": { message: "Switch to tab 8", severity: "low" },
      "ctrl+9": { message: "Switch to last tab", severity: "low" },

      // Developer tools
      f12: { message: "Opens developer tools", severity: "low" },
      "ctrl+shift+i": { message: "Opens developer tools", severity: "low" },
      "ctrl+shift+j": { message: "Opens console", severity: "low" },
      "ctrl+shift+c": { message: "Inspect element", severity: "low" },

      // Media controls
      space: { message: "Play/pause media", severity: "medium" },
      f: { message: "Fullscreen video", severity: "low" },
      m: { message: "Mute video", severity: "low" },

      // System shortcuts
      "alt+tab": { message: "Switch applications", severity: "high" },
      "win+d": { message: "Show desktop", severity: "medium" },
      "win+e": { message: "Open file explorer", severity: "medium" },
    };

    if (conflictingShortcuts[combination]) {
      const conflict = conflictingShortcuts[combination];
      const severityIcon =
        conflict.severity === "high"
          ? "🔴"
          : conflict.severity === "medium"
          ? "🟡"
          : "🟢";
      issues.push(
        `${severityIcon} Conflicts with ${conflict.severity} priority shortcut: ${conflict.message}`
      );
    }

    // Display validation results
    if (issues.length > 0) {
      validationMessage.innerHTML = issues.join("<br>");
      validationMessage.classList.add("warning");

      // Auto-hide warnings after 4 seconds
      window.validationTimeout = setTimeout(() => {
        validationMessage.textContent = "";
        validationMessage.className = "validation-message";
      }, 4000);
    }

    return issues.length === 0;
  }

  // New function to check key conflicts
  function checkKeyConflicts(newShortkey, newDomain) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["shortcuts"], function (result) {
        const shortcuts = result.shortcuts || [];
        const conflicts = [];

        // Skip conflict check if we're editing (we'll handle this case separately)
        if (editingIndex !== -1) {
          resolve(conflicts);
          return;
        }

        shortcuts.forEach((existing, index) => {
          // Skip if keys don't match
          if (existing.shortkey.toLowerCase() !== newShortkey.toLowerCase()) {
            return;
          }

          // Case 1: New shortcut is global but existing is specific
          if (newDomain === "*" && existing.domain !== "*") {
            conflicts.push({
              type: "global_override",
              existing: existing,
              message: `Global shortcut will override specific domain shortcut`,
            });
          }
          // Case 2: New shortcut is specific but existing is global
          else if (newDomain !== "*" && existing.domain === "*") {
            conflicts.push({
              type: "specific_override",
              existing: existing,
              message: `Existing global shortcut will override this`,
            });
          }
          // Case 3: Both are global
          else if (newDomain === "*" && existing.domain === "*") {
            conflicts.push({
              type: "same_domain",
              existing: existing,
              message: `Key already used as global shortcut`,
            });
          }
          // Case 4: Both are specific to same domain
          else if (newDomain === existing.domain) {
            conflicts.push({
              type: "same_domain",
              existing: existing,
              message: `Key already used on this domain`,
            });
          }
          // Case 5: Different specific domains - ALLOWED (no conflict)
        });

        resolve(conflicts);
      });
    });
  }

  // New function to check key conflicts
  function checkKeyConflicts(newShortkey, newDomain) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["shortcuts"], function (result) {
        const shortcuts = result.shortcuts || [];
        const conflicts = [];

        // Skip conflict check if we're editing (we'll handle this case separately)
        if (editingIndex !== -1) {
          resolve(conflicts);
          return;
        }

        shortcuts.forEach((existing, index) => {
          // Skip if keys don't match
          if (existing.shortkey.toLowerCase() !== newShortkey.toLowerCase()) {
            return;
          }

          // Case 1: New shortcut is global but existing is specific
          if (newDomain === "*" && existing.domain !== "*") {
            conflicts.push({
              type: "global_override",
              existing: existing,
              message: `Global shortcut will override specific domain shortcut`,
            });
          }
          // Case 2: New shortcut is specific but existing is global
          else if (newDomain !== "*" && existing.domain === "*") {
            conflicts.push({
              type: "specific_override",
              existing: existing,
              message: `Existing global shortcut will override this`,
            });
          }
          // Case 3: Both are global
          else if (newDomain === "*" && existing.domain === "*") {
            conflicts.push({
              type: "same_domain",
              existing: existing,
              message: `Key already used as global shortcut`,
            });
          }
          // Case 4: Both are specific to same domain
          else if (newDomain === existing.domain) {
            conflicts.push({
              type: "same_domain",
              existing: existing,
              message: `Key already used on this domain`,
            });
          }
          // Case 5: Different specific domains - ALLOWED (no conflict)
        });

        resolve(conflicts);
      });
    });
  }

  function createValidationMessage() {
    const message = document.createElement("div");
    message.id = "validationMessage";
    message.className = "validation-message";
    shortkeyPreview.parentNode.appendChild(message);
    return message;
  }

  function getKeyDisplay(key) {
    const specialKeys = {
      arrowup: "↑",
      arrowdown: "↓",
      arrowleft: "←",
      arrowright: "→",
      space: "Space",
      enter: "Enter",
      tab: "Tab",
      escape: "Esc",
      backspace: "Backspace",
      delete: "Delete",
      insert: "Insert",
      home: "Home",
      end: "End",
      pageup: "Page Up",
      pagedown: "Page Down",
    };
    return specialKeys[key] || key.toUpperCase();
  }

  modifier1Select.addEventListener("change", updateShortkeyPreview);
  mainKeySelect.addEventListener("change", updateShortkeyPreview);
  modifier2Select.addEventListener("change", updateShortkeyPreview);

  // Auto-fill domain from URL
  urlInput.addEventListener("blur", function () {
    if (urlInput.value && !domainInput.value) {
      try {
        const url = new URL(urlInput.value);
        domainInput.value = url.hostname.replace("www.", "");
      } catch (e) {
        // Invalid URL, do nothing
      }
    }
  });

  // Add shortcut handler
  addBtn.addEventListener("click", function () {
    const url = urlInput.value.trim();
    let domain = domainInput.value.trim();
    const openInNewTab = openInNewTabCheckbox.checked;

    if (!url || !domain) {
      showToast("Please fill in URL and Domain fields", "warning");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      showToast("Please enter a valid URL", "warning");
      return;
    }

    // Validate key combination
    const modifier1 = modifier1Select.value;
    const mainKey = mainKeySelect.value;
    const modifier2 = modifier2Select.value;

    if (!validateCombination(modifier1, mainKey, modifier2)) {
      showToast(
        "Please fix the key combination issues before saving.",
        "warning"
      );
      return;
    }

    // Handle global domain
    if (domain === "*") {
      domain = "*";
    } else {
      // Clean domain (remove protocol and www)
      domain = domain.replace(/https?:\/\//, "").replace("www.", "");
    }

    const color = colorSelect.value;

    // Build shortkey
    let shortkey = buildShortkey(modifier1, mainKey, modifier2);

    saveShortcut(url, shortkey, domain, color, openInNewTab);
    resetForm();
  });

  updateBtn.addEventListener("click", function () {
    const url = urlInput.value.trim();
    let domain = domainInput.value.trim();
    const openInNewTab = openInNewTabCheckbox.checked;

    if (!url || !domain) {
      showToast("Please fill in URL and Domain fields", "warning");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      showToast("Please enter a valid URL", "warning");
      return;
    }

    // Validate key combination
    const modifier1 = modifier1Select.value;
    const mainKey = mainKeySelect.value;
    const modifier2 = modifier2Select.value;

    if (!validateCombination(modifier1, mainKey, modifier2)) {
      showToast(
        "Please fix the key combination issues before saving.",
        "warning"
      );
      return;
    }

    // Handle global domain
    if (domain === "*") {
      domain = "*";
    } else {
      // Clean domain (remove protocol and www)
      domain = domain.replace(/https?:\/\//, "").replace("www.", "");
    }

    const color = colorSelect.value;

    // Build shortkey
    let shortkey = buildShortkey(modifier1, mainKey, modifier2);

    updateShortcut(editingIndex, url, shortkey, domain, color, openInNewTab);
    resetForm();
  });

  function buildShortkey(modifier1, mainKey, modifier2) {
    let shortkey = "";

    // First modifier
    if (modifier1 !== "none") {
      shortkey += modifier1.charAt(0).toUpperCase() + modifier1.slice(1) + "+";
    }

    // Main key
    shortkey += getKeyDisplay(mainKey);

    // Second key (can be modifier or character)
    if (modifier2 !== "none") {
      shortkey +=
        "+" +
        (["ctrl", "shift", "alt"].includes(modifier2)
          ? modifier2.charAt(0).toUpperCase() + modifier2.slice(1)
          : modifier2.toUpperCase());
    }

    return shortkey;
  }

  // Cancel edit handler
  cancelBtn.addEventListener("click", resetForm);

  function resetForm() {
    urlInput.value = "";
    domainInput.value = "";
    modifier1Select.value = "none";
    mainKeySelect.value = "h";
    modifier2Select.value = "none";
    colorSelect.value = "default";
    openInNewTabCheckbox.checked = false; // Reset checkbox
    addBtn.style.display = "block";
    updateBtn.style.display = "none";
    cancelBtn.style.display = "none";
    editingIndex = -1;

    // Clear any existing timeout
    if (window.validationTimeout) {
      clearTimeout(window.validationTimeout);
      window.validationTimeout = null;
    }

    // Clear validation message
    const validationMessage = document.getElementById("validationMessage");
    if (validationMessage) {
      validationMessage.textContent = "";
      validationMessage.className = "validation-message";
    }

    updateShortkeyPreview();
  }
  function loadShortcuts() {
    chrome.storage.sync.get(["shortcuts"], function (result) {
      const shortcuts = result.shortcuts || [];
      displayShortcuts(shortcuts);
    });
  }

  function displayShortcuts(shortcuts) {
  shortcutsList.innerHTML = "";

  if (shortcuts.length === 0) {
    shortcutsList.innerHTML =
      '<div class="empty-row">No shortcuts added yet</div>';
    return;
  }

  shortcuts.forEach((shortcut, index) => {
    const shortcutElement = document.createElement("div");
    shortcutElement.className = `table-row color-${
      shortcut.color || "default"
    }`;

    const isGlobal = shortcut.domain === "*";
    const domainDisplay = isGlobal
      ? `<span class="global-badge">🌍 Global</span>`
      : shortcut.domain;

    // FIX: Ensure openInNewTab is properly checked
    const openInNewTab = shortcut.openInNewTab || false;
    const tabDisplay = openInNewTab
      ? `<span class="new-tab-badge">New Tab</span>`
      : `<span class="current-tab-badge">Current</span>`;

    shortcutElement.innerHTML = `
              <div class="url-cell">${shortcut.url}</div>
              <div class="shortkey-cell">${shortcut.shortkey}</div>
              <div class="domain-cell">
                  ${domainDisplay}
              </div>
              <div class="tab-cell">
                  ${tabDisplay}
              </div>
              <div class="color-cell">
                  <div class="color-indicator ${
                    shortcut.color || "default"
                  }"></div>
              </div>
              <div class="actions-cell">
                  <button class="edit-btn" data-index="${index}">Edit</button>
                  <button class="delete-btn" data-index="${index}">Delete</button>
              </div>
          `;
    shortcutsList.appendChild(shortcutElement);
  });

  // Add event listeners
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      editShortcut(index);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      deleteShortcut(index);
    });
  });
}


  function editShortcut(index) {
  chrome.storage.sync.get(["shortcuts"], function (result) {
    const shortcuts = result.shortcuts || [];
    const shortcut = shortcuts[index];

    // Parse the shortkey
    const parts = shortcut.shortkey.split("+");
    let modifier1 = "none";
    let mainKey = "h";
    let modifier2 = "none";

    if (parts.length === 1) {
      mainKey = getKeyValue(parts[0]);
    } else if (parts.length === 2) {
      modifier1 = parts[0].toLowerCase();
      mainKey = getKeyValue(parts[1]);
    } else if (parts.length === 3) {
      modifier1 = parts[0].toLowerCase();
      mainKey = getKeyValue(parts[1]);
      modifier2 = parts[2].toLowerCase();
    }

    // Fill the form - FIX: Ensure openInNewTab is properly set
    urlInput.value = shortcut.url;
    domainInput.value = shortcut.domain;
    modifier1Select.value = modifier1;
    mainKeySelect.value = mainKey;
    modifier2Select.value = modifier2;
    colorSelect.value = shortcut.color || "default";
    openInNewTabCheckbox.checked = Boolean(shortcut.openInNewTab); // Ensure boolean value

    // Switch to edit mode
    addBtn.style.display = "none";
    updateBtn.style.display = "block";
    cancelBtn.style.display = "block";
    editingIndex = index;

    updateShortkeyPreview();
  });
}

  function getKeyValue(displayKey) {
    const specialKeys = {
      "↑": "arrowup",
      "↓": "arrowdown",
      "←": "arrowleft",
      "→": "arrowright",
      Space: "space",
      Enter: "enter",
      Tab: "tab",
      Esc: "escape",
      Backspace: "backspace",
      Delete: "delete",
      Insert: "insert",
      Home: "home",
      End: "end",
      "Page Up": "pageup",
      "Page Down": "pagedown",
    };

    const lowerKey = displayKey.toLowerCase();
    return (
      specialKeys[displayKey] ||
      Object.keys(specialKeys).find((key) => specialKeys[key] === lowerKey) ||
      lowerKey
    );
  }

  function saveShortcut(url, shortkey, domain, color, openInNewTab) {
  chrome.storage.sync.get(["shortcuts"], function (result) {
    const shortcuts = result.shortcuts || [];

    // Final conflict check (in case of race conditions)
    const conflicts = shortcuts.filter((existing, index) => {
      if (editingIndex === index) return false; // Skip the one we're editing
      return (
        existing.shortkey.toLowerCase() === shortkey.toLowerCase() &&
        ((domain === "*" && existing.domain !== "*") ||
          (domain !== "*" && existing.domain === "*") ||
          domain === existing.domain)
      );
    });

    if (conflicts.length > 0) {
      showToast(
        "Key conflict detected! This shortcut cannot be saved due to conflicts with existing shortcuts."
      );
      return;
    }

    // FIX: Ensure openInNewTab is properly saved as boolean
    const shortcutData = { 
      url, 
      shortkey, 
      domain, 
      color, 
      openInNewTab: Boolean(openInNewTab) 
    };

    if (editingIndex === -1) {
      // Add new shortcut
      shortcuts.push(shortcutData);
      showToast("Shortcut added successfully!", "success");
    } else {
      // Update existing shortcut
      shortcuts[editingIndex] = shortcutData;
      showToast("Shortcut updated successfully!", "success");
    }

    chrome.storage.sync.set({ shortcuts: shortcuts }, function () {
      // Clear cache and update localStorage
      clearShortcutCache(shortcuts);
      loadShortcuts();
    });
  });
}

  function updateShortcut(index, url, shortkey, domain, color, openInNewTab) {
  chrome.storage.sync.get(["shortcuts"], function (result) {
    const shortcuts = result.shortcuts || [];
    // FIX: Ensure openInNewTab is properly saved as boolean
    shortcuts[index] = { 
      url, 
      shortkey, 
      domain, 
      color, 
      openInNewTab: Boolean(openInNewTab) 
    };
    chrome.storage.sync.set({ shortcuts: shortcuts }, function () {
      // Clear cache and update localStorage
      clearShortcutCache(shortcuts);
      loadShortcuts();
    });
  });
}

  async function deleteShortcut(index) {
    const confirmed = await showConfirm(
      "Are you sure you want to delete this shortcut?"
    );
    if (confirmed) {
      chrome.storage.sync.get(["shortcuts"], function (result) {
        const shortcuts = result.shortcuts || [];
        shortcuts.splice(index, 1);
        chrome.storage.sync.set({ shortcuts: shortcuts }, function () {
          // Clear cache and update localStorage
          clearShortcutCache(shortcuts);
          loadShortcuts();
          showToast("Shortcut deleted successfully!", "success");
        });
      });
    }
  }

  function clearShortcutCache(shortcuts) {
    // Update localStorage
    try {
      localStorage.setItem("urlShortkeyShortcuts", JSON.stringify(shortcuts));
      console.log("Updated localStorage with", shortcuts.length, "shortcuts");
    } catch (e) {
      console.log("LocalStorage update failed:", e);
    }

    // Send message to all tabs to clear cache
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach((tab) => {
        // Only send to http/https pages
        if (
          tab.url &&
          (tab.url.startsWith("http:") || tab.url.startsWith("https:"))
        ) {
          chrome.tabs
            .sendMessage(tab.id, { action: "clearCache" })
            .catch((error) => {
              // Ignore errors for tabs that don't have content script
            });
        }
      });
    });
  }

  // Initialize preview
  updateShortkeyPreview();
});
