// Promptr - content.js - Manual Icon Approach

console.log("Promptr: Initializing content script (manual mode)...");

// --- Existing Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'insertPrompt') {
        console.log("Promptr: Received insertPrompt message");
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || (activeElement.tagName === 'INPUT' && activeElement.type === 'text') || activeElement.isContentEditable)) {
            if (activeElement.isContentEditable) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(message.prompt));
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    activeElement.textContent = message.prompt;
                }
            } else {
                const start = activeElement.selectionStart;
                const end = activeElement.selectionEnd;
                activeElement.value = activeElement.value.substring(0, start) + message.prompt + activeElement.value.substring(end);
                activeElement.selectionStart = activeElement.selectionEnd = start + message.prompt.length;
            }
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            sendResponse({ success: true });
        } else {
            console.log("Promptr: No active text field found for insertPrompt");
            sendResponse({ success: false, message: 'No suitable text input field is currently active' });
        }
        return true; // Indicates async response
    }
    return false;
});

// --- Manual Icon & Menu Logic ---

let promptrIcon = null;
let promptrMenu = null;
let currentSelectionDetails = null; // Stores { text, range, targetElement }

// Create the floating icon
function createPromptrIcon() {
    // Check if already created AND still in the DOM
    if (promptrIcon && document.body.contains(promptrIcon)) {
        console.log("Promptr: createPromptrIcon - Icon already exists in DOM.");
        return;
    }
    console.log("Promptr: createPromptrIcon - Attempting to create icon...");
    try {
        promptrIcon = document.createElement('div');
        promptrIcon.id = 'promptr-floating-icon';
        promptrIcon.textContent = '✨';
        promptrIcon.style.display = 'none'; // Start hidden
        promptrIcon.addEventListener('mousedown', handleIconClick);

        if (document.body) {
            document.body.appendChild(promptrIcon);
            // Verify it was added
            if (document.getElementById('promptr-floating-icon')) {
                 console.log("Promptr: createPromptrIcon - Icon successfully created and appended.");
            } else {
                 console.error("Promptr: createPromptrIcon - Failed to append icon to body, even though body exists.");
                 promptrIcon = null; // Reset variable if append failed
            }
        } else {
             console.error("Promptr: createPromptrIcon - document.body not available!");
             promptrIcon = null; // Reset variable
        }
    } catch (error) {
         console.error("Promptr: createPromptrIcon - Error during creation:", error);
         promptrIcon = null; // Reset variable on error
    }
}

// Create the action menu (initially hidden)
function createPromptrMenu() {
    // Check if already created AND still in the DOM
    if (promptrMenu && document.body.contains(promptrMenu)) {
         console.log("Promptr: createPromptrMenu - Menu already exists in DOM.");
         return;
    }
    console.log("Promptr: createPromptrMenu - Attempting to create menu...");
    try {
        promptrMenu = document.createElement('div');
        promptrMenu.id = 'promptr-action-menu';
        promptrMenu.style.display = 'none'; // Start hidden

        // Replace Shortcut Item
        const replaceItem = document.createElement('div');
        replaceItem.className = 'promptr-action-menu-item';
        replaceItem.textContent = 'Replace Shortcut';
        replaceItem.addEventListener('mousedown', handleReplaceShortcutClick);
        promptrMenu.appendChild(replaceItem);

        // Enhance Prompt Item
        const enhanceItem = document.createElement('div');
        enhanceItem.className = 'promptr-action-menu-item';
        enhanceItem.textContent = 'Enhance Prompt';
        enhanceItem.addEventListener('mousedown', handleEnhancePromptClick);
        promptrMenu.appendChild(enhanceItem);

        if (document.body) {
            document.body.appendChild(promptrMenu);
             // Verify it was added
            if (document.getElementById('promptr-action-menu')) {
                 console.log("Promptr: createPromptrMenu - Menu successfully created and appended.");
            } else {
                 console.error("Promptr: createPromptrMenu - Failed to append menu to body.");
                 promptrMenu = null; // Reset variable
            }
        } else {
            console.error("Promptr: createPromptrMenu - document.body not available!");
            promptrMenu = null; // Reset variable
        }
    } catch (error) {
        console.error("Promptr: createPromptrMenu - Error during creation:", error);
        promptrMenu = null; // Reset variable on error
    }
}

// Update icon position based on selection
function updateIconPosition(selectionRange) {
    if (!promptrIcon || !selectionRange) return;
    const rect = selectionRange.getBoundingClientRect();
    promptrIcon.style.left = `${window.scrollX + rect.right + 5}px`;
    promptrIcon.style.top = `${window.scrollY + rect.top - 5}px`;
    promptrIcon.style.display = 'block'; // *** ADD THIS LINE ***
}

function showIcon(selectionRange) {
    console.log("Promptr: showIcon called.");
    // Ensure icon exists in the DOM before trying to show it
    if (!promptrIcon || !document.body.contains(promptrIcon)) {
        console.warn("Promptr: showIcon - Icon variable missing or not in DOM. Attempting recreation...");
        createPromptrIcon();
        // Check if creation succeeded this time
        if (!promptrIcon || !document.body.contains(promptrIcon)) {
             console.error("Promptr: showIcon - Failed to create or find icon after recreation attempt. Aborting show.");
             return; // Cannot show if creation failed
        }
         console.log("Promptr: showIcon - Icon successfully created/found after check.");
    } else {
         console.log("Promptr: showIcon - Icon variable exists and element is in DOM.");
    }
    updateIconPosition(selectionRange); // This now sets display: block
    console.log(`Promptr: showIcon - Attempted to set icon display to block at top: ${promptrIcon.style.top}, left: ${promptrIcon.style.left}`);
}

function hideIcon() {
    if (promptrIcon) promptrIcon.style.display = 'none';
    hideMenu(); // Also hide the menu if the icon is hidden
}

function showMenu() {
    console.log("Promptr: showMenu called.");
    // Ensure menu exists in the DOM before trying to show it
    if (!promptrMenu || !document.body.contains(promptrMenu)) {
        console.warn("Promptr: showMenu - Menu variable missing or not in DOM. Attempting recreation...");
        createPromptrMenu();
        // Check if creation succeeded
        if (!promptrMenu || !document.body.contains(promptrMenu)) {
             console.error("Promptr: showMenu - Failed to create or find menu after recreation attempt. Aborting show.");
             return;
        }
        console.log("Promptr: showMenu - Menu successfully created/found after check.");
    } else {
         console.log("Promptr: showMenu - Menu variable exists and element is in DOM.");
    }

    // Ensure icon is visible and get its position
    if (!promptrIcon || promptrIcon.style.display === 'none') {
         console.warn("Promptr: showMenu - Icon is hidden or not found. Cannot position menu.");
         return;
    }
    const iconRect = promptrIcon.getBoundingClientRect();

    // Position menu slightly below the icon
    promptrMenu.style.left = `${window.scrollX + iconRect.left}px`;
    promptrMenu.style.top = `${window.scrollY + iconRect.bottom + 2}px`;
    promptrMenu.style.display = 'block'; // Make it visible

    console.log(`Promptr: showMenu - Attempted to set menu display to block at top: ${promptrMenu.style.top}, left: ${promptrMenu.style.left}`);

    // Check if it's actually visible shortly after setting display: block
    setTimeout(() => {
         if (promptrMenu && document.body.contains(promptrMenu)) {
             const menuRect = promptrMenu.getBoundingClientRect();
             const computedStyle = window.getComputedStyle(promptrMenu);
             console.log(`Promptr: showMenu - Post-check: Menu display=${computedStyle.display}, visibility=${computedStyle.visibility}, opacity=${computedStyle.opacity}, rect=`, menuRect);
         }
    }, 100); // Check after 100ms
}

function hideMenu() {
    if (promptrMenu) promptrMenu.style.display = 'none';
}

// Main handler for detecting text selection
function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        // Find the closest relevant input element (textarea or contenteditable)
        const targetElement = container.nodeType === Node.ELEMENT_NODE
            ? container.closest('textarea, [contenteditable="true"]')
            : container.parentElement?.closest('textarea, [contenteditable="true"]');

        if (targetElement) {
            // Store selection details for later use
            currentSelectionDetails = {
                text: selectedText,
                range: range,
                targetElement: targetElement
            };
            console.log("Promptr: Text selected in valid target:", selectedText);
            showIcon(range);
            return; // Stop processing, valid selection found
        }
    }

    // If no valid selection, hide the icon
    if (currentSelectionDetails && !selection.containsNode(currentSelectionDetails.targetElement, true)) {
         console.log("Promptr: Selection cleared or outside target.");
         currentSelectionDetails = null;
         hideIcon();
    } else if (selectedText.length === 0 && currentSelectionDetails) {
        // Hide if selection becomes empty
         console.log("Promptr: Selection empty.");
         currentSelectionDetails = null;
         hideIcon();
    }
}

// Handler for clicking the floating icon
function handleIconClick(event) {
    event.stopPropagation(); // Prevent triggering document click listener
    event.preventDefault(); // Prevent potential focus shifts
    console.log("Promptr: Icon clicked.");
    showMenu();
}

// Helper function to replace selected text (extracted and adapted from handleReplaceShortcutClick)
function replaceSelectedText(newText) {
    if (!currentSelectionDetails) {
        console.error("Promptr: Cannot replace text, no selection details found.");
        return;
    }
    const { range, targetElement } = currentSelectionDetails;

    try {
        // Replace the selected text within the original range
        range.deleteContents(); // Clear the original selection

        // Handle newlines correctly for non-textarea elements
        const lines = newText.split('\n');
        lines.forEach((line, index) => {
            range.insertNode(document.createTextNode(line));
            if (index < lines.length - 1) {
                // Add a line break element if it's not the last line
                range.insertNode(document.createElement('br'));
            }
        });

        // Move cursor to the end of the inserted text
        range.collapse(false); // Collapse the range to the end point
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger input event for the target element
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));

        console.log("Promptr: Text replaced successfully.");
    } catch (error) {
        console.error("Promptr: Error replacing text with range:", error);
        // Fallback for basic textarea/input if range manipulation fails
        if (targetElement.value !== undefined && currentSelectionDetails.text) {
             const originalText = currentSelectionDetails.text;
             const currentVal = targetElement.value; // Textarea/input handles \n fine
             // Find the original text to replace (this might be brittle)
             const start = targetElement.selectionStart - originalText.length; // Estimate start based on current selection end
             const end = targetElement.selectionEnd;

             if (start >= 0 && currentVal.substring(start, end) === originalText) {
                  targetElement.value = currentVal.substring(0, start) + newText + currentVal.substring(end);
                  targetElement.selectionStart = targetElement.selectionEnd = start + newText.length;
                  targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                  console.log("Promptr: Text replaced successfully (fallback).");
             } else {
                  console.error("Promptr: Fallback replacement failed - original text not found at expected position.");
             }
        } else {
            console.error("Promptr: Fallback replacement failed - target is not a standard input/textarea or original text missing.");
        }
    }
}

// Handler for clicking "Enhance Prompt" in the menu
function handleEnhancePromptClick(event) {
    event.stopPropagation();
    event.preventDefault();

    if (!currentSelectionDetails) {
        console.error("Promptr: Enhance clicked but no selection details found.");
        hideMenu();
        hideIcon();
        return;
    }

    const originalText = currentSelectionDetails.text;
    console.log("Promptr: Attempting to enhance prompt:", originalText);

    // Optional: Provide visual feedback (e.g., disable button, change text)
    // Find both menu items to disable them
    const enhanceButton = event.target;
    const replaceButton = promptrMenu.querySelector('.promptr-action-menu-item:first-child'); // Assuming Replace is first
    enhanceButton.textContent = 'Enhancing...';
    enhanceButton.style.pointerEvents = 'none'; // Disable further clicks
    if (replaceButton) replaceButton.style.pointerEvents = 'none';

    // Keep menu open during processing

    chrome.runtime.sendMessage({ action: 'enhancePrompt', text: originalText }, (response) => {
        // Restore button state regardless of outcome
        enhanceButton.textContent = 'Enhance Prompt';
        enhanceButton.style.pointerEvents = 'auto';
        if (replaceButton) replaceButton.style.pointerEvents = 'auto';

        // Hide menu and icon AFTER response
        hideMenu();
        hideIcon();

        if (chrome.runtime.lastError) {
            console.error("Promptr: Error sending/receiving enhance message:", chrome.runtime.lastError.message);
            alert("Error enhancing prompt: Could not communicate with background script.");
            return;
        }

        if (response && response.enhancedPrompt) {
            console.log("Promptr: Received enhanced prompt:", response.enhancedPrompt);
            replaceSelectedText(response.enhancedPrompt);
        } else {
            console.error("Promptr: Received invalid response from background script:", response);
            alert(`Error enhancing prompt: ${response?.error || 'Invalid response received.'}`);
        }
    });
}

// Handler for clicking "Replace Shortcut" in the menu
function handleReplaceShortcutClick(event) {
    event.stopPropagation(); // Prevent triggering document click listener
    event.preventDefault();

    if (!currentSelectionDetails) {
        console.error("Promptr: Replace clicked but no selection details found.");
        hideMenu();
        hideIcon();
        return;
    }

    const shortcutText = currentSelectionDetails.text;
    console.log("Promptr: Attempting to replace shortcut:", shortcutText);

    // Fetch the 'savedPrompts' array instead of 'prompts'
    chrome.storage.sync.get(['savedPrompts'], (data) => {
        if (chrome.runtime.lastError) {
            console.error("Promptr: Error getting savedPrompts from storage:", chrome.runtime.lastError);
            return;
        }
        console.log("Promptr: Storage result for 'savedPrompts':", data); // Log the array

        const savedPrompts = data.savedPrompts || [];
        // Find the prompt object where the 'title' matches the shortcutText
        const foundPrompt = savedPrompts.find(prompt => prompt.title === shortcutText);

        if (foundPrompt) { // Check if we found a matching prompt object
            // The detailed prompt is stored in the 'enhancedPrompt' field
            const detailedPrompt = foundPrompt.enhancedPrompt;
            console.log(`Promptr: Found detailed prompt for ${shortcutText}:`, detailedPrompt);
            const { range, targetElement } = currentSelectionDetails;

            try {
                 // Replace the selected text within the original range
                 range.deleteContents(); // Clear the original selection

                 // Handle newlines correctly for non-textarea elements
                 const lines = detailedPrompt.split('\n');
                 lines.forEach((line, index) => {
                     range.insertNode(document.createTextNode(line));
                     if (index < lines.length - 1) {
                         // Add a line break element if it's not the last line
                         range.insertNode(document.createElement('br'));
                     }
                 });

                 // Move cursor to the end of the inserted text
                 range.collapse(false); // Collapse the range to the end point
                 const selection = window.getSelection();
                 selection.removeAllRanges();
                 selection.addRange(range);

                 // Trigger input event for the target element
                 targetElement.dispatchEvent(new Event('input', { bubbles: true }));

                 console.log("Promptr: Shortcut replaced successfully.");
            } catch (error) {
                 console.error("Promptr: Error replacing text:", error);
                 // Fallback for basic textarea/input if range manipulation fails
                 if (targetElement.value !== undefined) {
                     const currentVal = targetElement.value; // Textarea/input handles \n fine
                     // Find the text to replace (this might be brittle)
                     const start = currentVal.indexOf(shortcutText); // Simplistic find
                     if (start !== -1) {
                          const end = start + shortcutText.length;
                          targetElement.value = currentVal.substring(0, start) + detailedPrompt + currentVal.substring(end);
                          targetElement.selectionStart = targetElement.selectionEnd = start + detailedPrompt.length;
                          targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                          console.log("Promptr: Shortcut replaced successfully (fallback).");
                     } else {
                         console.error("Promptr: Fallback failed to find shortcut text in value.");
                     }
                 }
            }

        } else {
            console.log("Promptr: Selected text is not a saved shortcut.");
            // Optionally provide feedback to the user here
            alert(`"${shortcutText}" is not a saved shortcut.`);
        }

        // Hide menu and icon after processing
        hideMenu();
        hideIcon();
        currentSelectionDetails = null;
    });
}

// --- Event Listeners Setup ---

// Listen for mouse release to check selection
document.addEventListener('mouseup', handleTextSelection);
// Also check on key release in case selection changes via keyboard
document.addEventListener('keyup', handleTextSelection);

// Listen for clicks outside the menu/icon to hide them
document.addEventListener('mousedown', (event) => {
    // Hide menu if click is outside the menu and the icon
    if (promptrMenu && promptrMenu.style.display === 'block' && !promptrMenu.contains(event.target) && !promptrIcon.contains(event.target)) {
        hideMenu();
    }
    // Hide icon if click is outside the icon AND selection is lost (handled by mouseup/keyup)
    // but add a safety net here.
    if (promptrIcon && promptrIcon.style.display === 'block' && !promptrIcon.contains(event.target) && window.getSelection().toString().length === 0) {
        hideIcon();
    }
});


// --- Initial Setup ---
// Create elements on load (or wait for DOMContentLoaded if preferred)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
         createPromptrIcon();
         createPromptrMenu();
    });
} else {
    createPromptrIcon();
    createPromptrMenu();
}

console.log("Promptr: Content script setup complete (manual mode).");