// Open extension in a tab instead of popup
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('popup.html')
    });
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === '_execute_action') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html')
        });
    }
});