document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const basePromptInput = document.getElementById('base-prompt');
    const enhanceButton = document.getElementById('enhance-button');
    const loadingElement = document.getElementById('loading');
    const resultContainer = document.getElementById('result-container');
    const enhancedPromptElement = document.getElementById('enhanced-prompt');
    const copyButton = document.getElementById('copy-button');
    const saveButton = document.getElementById('save-button');
    const savedPromptsList = document.getElementById('saved-prompts-list');
    const noSavedPromptsElement = document.getElementById('no-saved-prompts');
    // New elements for bookmark tab
    const shortcutPromptInput = document.getElementById('shortcut-prompt');
    const detailedPromptInput = document.getElementById('detailed-prompt');
    const saveBookmarkButton = document.getElementById('save-bookmark-button');
    // New container for parameters
    const parameterContainer = document.getElementById('parameter-container');

    // API endpoint - This might become less relevant here, background.js handles calls
    // const API_ENDPOINT = '...';

    // --- State Management ---
    let uiState = 'INITIAL'; // INITIAL, PENDING_PARAMS, PARAMS_RECEIVED, PENDING_GENERATION, GENERATION_COMPLETE
    let storedBasePrompt = '';
    let currentParameters = []; // To store parameter definitions received from backend

    // --- Helper Functions ---
    function setUIState(newState) {
        uiState = newState;
        console.log("UI State changed to:", uiState);

        // Reset common elements
        loadingElement.classList.add('hidden');
        enhanceButton.disabled = false;

        switch (uiState) {
            case 'INITIAL':
                parameterContainer.classList.add('hidden');
                resultContainer.classList.add('hidden');
                parameterContainer.innerHTML = ''; // Clear old parameters
                enhanceButton.textContent = 'Enhance Prompt';
                basePromptInput.disabled = false;
                storedBasePrompt = '';
                currentParameters = [];
                break;
            case 'PENDING_PARAMS':
                loadingElement.textContent = 'Getting parameters...';
                loadingElement.classList.remove('hidden');
                enhanceButton.disabled = true;
                enhanceButton.textContent = 'Loading...';
                basePromptInput.disabled = true; // Disable input while loading
                parameterContainer.classList.add('hidden');
                resultContainer.classList.add('hidden');
                break;
            case 'PARAMS_RECEIVED':
                parameterContainer.classList.remove('hidden'); // Show parameters
                resultContainer.classList.add('hidden');
                enhanceButton.textContent = 'Generate';
                basePromptInput.disabled = true; // Keep disabled
                break;
            case 'PENDING_GENERATION':
                loadingElement.textContent = 'Generating enhanced prompt...';
                loadingElement.classList.remove('hidden');
                enhanceButton.disabled = true;
                enhanceButton.textContent = 'Generating...';
                parameterContainer.classList.add('hidden'); // Hide params while generating
                resultContainer.classList.add('hidden');
                break;
            case 'GENERATION_COMPLETE':
                resultContainer.classList.remove('hidden'); // Show result
                parameterContainer.classList.add('hidden');
                enhanceButton.textContent = 'Start Over'; // Change button to allow reset
                basePromptInput.disabled = false; // Re-enable for new prompt
                break;
            default:
                console.error('Unknown UI State:', newState);
                setUIState('INITIAL'); // Reset to known state
        }
    }

    /**
     * Creates and displays input fields for the given parameters.
     * @param {Array<Object>} parameters - Array of parameter objects { name, label, type, placeholder, required }
     */
    function createParameterInputs(parameters) {
        const container = document.getElementById('parameter-container');
        container.innerHTML = ''; // Clear previous inputs
        container.style.display = 'block'; // Make sure container is visible

        // Optional: Add a heading for the parameters section
        const heading = document.createElement('h3');
        heading.textContent = 'Refine your Prompt:';
        heading.style.marginTop = '15px'; // Add some space above
        heading.style.marginBottom = '10px';
        heading.style.fontSize = '1em'; // Adjust size if needed
        container.appendChild(heading);

        parameters.forEach(param => {
            // Create the wrapping div matching the base prompt structure
            const groupDiv = document.createElement('div');
            groupDiv.className = 'input-group'; // Use the same class as the base prompt group
            groupDiv.style.marginBottom = '12px'; // Add some space between parameter groups

            const label = document.createElement('label');
            // Basic styling for the label
            label.style.display = 'block';
            label.style.marginBottom = '4px';
            label.style.fontWeight = 'normal'; // Adjust weight as needed
            label.style.fontSize = '0.9em';
            label.textContent = `${param.label}${param.required ? ' *' : ''}:`; // Added space before asterisk
            label.htmlFor = `param-${param.name}`;

            let input;
            const inputBaseStyle = 'width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 0.9em;'; // Common styles

            if (param.type === 'textarea') {
                input = document.createElement('textarea');
                input.rows = 2; // Slightly smaller default size for params
                input.style.cssText = inputBaseStyle + 'resize: vertical;'; // Allow vertical resize
            } else { // Default to text input
                input = document.createElement('input');
                input.type = param.type || 'text';
                input.style.cssText = inputBaseStyle;
            }
            // Add a class if you have specific CSS rules, e.g., 'form-control'
            // input.className = 'form-control'; 
            input.id = `param-${param.name}`;
            input.name = param.name;
            input.placeholder = param.placeholder || '';
            if (param.required) {
                input.required = true;
                // Optional: Add visual cue beyond asterisk if needed
                // label.style.fontWeight = 'bold'; 
            }

            // Append label and input to the group div
            groupDiv.appendChild(label);
            groupDiv.appendChild(input);

            // Append the group div to the main container
            container.appendChild(groupDiv);
        });
    }

    function collectParameterValues() {
        const collected = {};
        let isValid = true; 
        currentParameters.forEach(param => {
            const inputElement = document.getElementById(`param-${param.name}`);
            if (inputElement) {
                const value = inputElement.value.trim();
                if (param.required && !value) {
                    alert(`Please fill in the '${param.label}' parameter.`);
                    isValid = false;
                }
                collected[param.name] = value;
            } else {
                 console.warn(`Could not find input element for parameter: ${param.name}`);
            }
        });
        return isValid ? collected : null;
    }

    // --- Initialization ---
    setUIState('INITIAL'); // Set initial state on load

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');

            // If we're switching to saved prompts tab, load saved prompts
            if (button.dataset.tab === 'saved') {
                loadSavedPrompts();
            }
        });
    });

    // Enhance/Generate button click handler (MODIFIED)
    enhanceButton.addEventListener('click', () => {
        if (uiState === 'INITIAL' || uiState === 'GENERATION_COMPLETE') {
            // --- Start Enhancement Flow --- 
            if (uiState === 'GENERATION_COMPLETE') {
                 // Reset if starting over
                 setUIState('INITIAL');
                 basePromptInput.value = '';
                 enhancedPromptElement.value = '';
                 return; // Exit handler, user needs to input prompt now
            }

            const basePrompt = basePromptInput.value.trim();
            if (!basePrompt) {
                alert('Please enter a prompt to enhance.');
                return;
            }
            storedBasePrompt = basePrompt; // Store for later use
            setUIState('PENDING_PARAMS');

            // Send message to background to get parameters
            chrome.runtime.sendMessage({ action: 'getParameters', basePrompt: storedBasePrompt }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending getParameters message:', chrome.runtime.lastError.message);
                    alert(`Error communicating with background: ${chrome.runtime.lastError.message}`);
                    setUIState('INITIAL');
                    return;
                }
                console.log('Received getParameters response from background:', response);

                if (response.error) {
                    alert(`Error getting parameters: ${response.error}`);
                    setUIState('INITIAL');
                    return;
                }

                if (response.parameters && response.parameters.length > 0) {
                    createParameterInputs(response.parameters);
                    setUIState('PARAMS_RECEIVED');
                } else {
                    // If no parameters are returned, maybe proceed directly to enhance?
                    // Or show an error/message? For now, assume parameters are expected.
                    console.warn('No parameters received from background. Resetting.');
                    alert('Could not retrieve enhancement parameters.');
                    setUIState('INITIAL');
                }
            });

        } else if (uiState === 'PARAMS_RECEIVED') {
            // --- Generate Final Prompt --- 
            const collectedParameters = collectParameterValues();
            if (!collectedParameters) {
                 // collectParameterValues shows an alert if invalid
                 return; 
            }

            setUIState('PENDING_GENERATION');

            // Send message to background script to handle the final enhancement API call
            chrome.runtime.sendMessage({ 
                action: 'enhancePrompt', 
                text: storedBasePrompt, 
                parameters: collectedParameters // Send collected parameters
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending enhancePrompt message:', chrome.runtime.lastError.message);
                    alert(`Error communicating with background: ${chrome.runtime.lastError.message}`);
                    setUIState('PARAMS_RECEIVED'); // Go back to parameter state for retry
                    return;
                }
                console.log('Received enhancePrompt response from background:', response);

                if (response.error) {
                    alert(`Error enhancing prompt: ${response.error}`);
                    setUIState('PARAMS_RECEIVED'); // Go back to parameter state for retry
                    return;
                }

                const enhancedPrompt = response.enhancedPrompt;
                if (!enhancedPrompt) {
                     alert('Received empty enhanced prompt from background.');
                     setUIState('PARAMS_RECEIVED'); // Go back to parameter state for retry
                     return;
                }

                // Display the enhanced prompt
                enhancedPromptElement.value = enhancedPrompt;
                setUIState('GENERATION_COMPLETE');
            });
        }
    });

    // Copy button click handler
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(enhancedPromptElement.value) // Read .value
            .then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy to Clipboard';
                }, 2000);
            })
            .catch(err => {
                alert('Failed to copy text: ' + err);
            });
    });

    // Save button click handler
    saveButton.addEventListener('click', () => {
        const basePrompt = basePromptInput.value.trim();
        const enhancedPrompt = enhancedPromptElement.value; // Read .value

        // Create prompt title (first 30 chars of base prompt)
        const title = basePrompt.length > 30
            ? basePrompt.substring(0, 30) + '...'
            : basePrompt;

        // Save to Chrome storage
        chrome.storage.sync.get(['savedPrompts'], function(result) {
            const savedPrompts = result.savedPrompts || [];
            savedPrompts.push({
                id: Date.now(),
                title: title,
                basePrompt: basePrompt,
                enhancedPrompt: enhancedPrompt,
                date: new Date().toISOString()
            });

            chrome.storage.sync.set({ savedPrompts: savedPrompts }, function() {
                saveButton.textContent = 'Saved!';
                setTimeout(() => {
                    saveButton.textContent = 'Save Prompt';
                }, 2000);
            });
        });
    });

    // --- New Event Listener for Save Bookmark Button --- 
    saveBookmarkButton.addEventListener('click', () => {
        const shortcutValue = shortcutPromptInput.value.trim();
        const detailedValue = detailedPromptInput.value.trim();

        if (!shortcutValue || !detailedValue) {
            alert('Please fill out both the shortcut and the detailed prompt fields.');
            return;
        }

        // Use shortcut as title, detailed as the main content
        const newPrompt = {
            id: Date.now(), // Simple unique ID
            title: shortcutValue,
            // We store the detailed prompt directly in 'enhancedPrompt' 
            // field to match the structure used by loadSavedPrompts
            enhancedPrompt: detailedValue, 
            date: new Date().toISOString() // Keep date consistency
        };

        chrome.storage.sync.get(['savedPrompts'], function(result) {
            const savedPrompts = result.savedPrompts || [];
            savedPrompts.push(newPrompt);

            chrome.storage.sync.set({ savedPrompts: savedPrompts }, function() {
                // Provide feedback and clear inputs
                saveBookmarkButton.textContent = 'Saved!';
                shortcutPromptInput.value = '';
                detailedPromptInput.value = '';
                
                // Refresh the list
                loadSavedPrompts(); 

                setTimeout(() => {
                    saveBookmarkButton.textContent = 'Save Bookmark';
                }, 2000);
            });
        });
    });

    // Load saved prompts
    function loadSavedPrompts() {
        chrome.storage.sync.get(['savedPrompts'], function(result) {
            const savedPrompts = result.savedPrompts || [];

            if (savedPrompts.length === 0) {
                savedPromptsList.innerHTML = '';
                noSavedPromptsElement.style.display = 'block';
                return;
            }

            noSavedPromptsElement.style.display = 'none';

            // Display saved prompts
            savedPromptsList.innerHTML = '';
            savedPrompts.forEach(prompt => {
                const promptElement = document.createElement('div');
                promptElement.className = 'prompt-item';
                promptElement.dataset.id = prompt.id;
                
                // Store full prompt content for later use (copy/expand)
                const fullPromptContent = prompt.enhancedPrompt;

                // Create content div
                const contentDiv = document.createElement('div');
                contentDiv.className = 'prompt-content';
                contentDiv.textContent = fullPromptContent; // Start with full text, CSS handles truncation

                // Actions (expand, copy, delete)
                const actionsDiv = document.createElement('div');
                actionsDiv.classList.add('prompt-actions');

                // Group for left-aligned buttons
                const leftActionsDiv = document.createElement('div');
                leftActionsDiv.classList.add('left-actions');

                // Expand/Collapse Button
                const expandButton = document.createElement('button');
                expandButton.textContent = 'Expand';
                expandButton.classList.add('expand-button'); // Use original class
                expandButton.title = 'Expand/Collapse Prompt';
                expandButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the item click
                    const contentDiv = promptElement.querySelector('.prompt-content');
                    // Toggle the 'expanded' class on the content div
                    contentDiv.classList.toggle('expanded');

                    // Update button text based on the presence of the 'expanded' class
                    if (contentDiv.classList.contains('expanded')) {
                        expandButton.textContent = 'Collapse'; // Change text
                    } else {
                        expandButton.textContent = 'Expand'; // Change text back
                    }
                });

                // Copy Button
                const copyButton = document.createElement('button');
                copyButton.textContent = 'Copy';
                copyButton.classList.add('copy-button'); // Use a consistent class
                copyButton.title = 'Copy Enhanced Prompt';
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the item click
                    navigator.clipboard.writeText(prompt.enhancedPrompt)
                        .then(() => {
                            const originalText = copyButton.textContent;
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => copyButton.textContent = originalText, 1500);
                        })
                        .catch(err => console.error('Failed to copy:', err));
                });

                leftActionsDiv.appendChild(expandButton);
                leftActionsDiv.appendChild(copyButton);

                // --- Delete Button ---
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete'; // Text instead of icon
                deleteButton.classList.add('delete-button'); // New class for styling
                deleteButton.title = 'Delete Prompt';
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the item click

                    // Check if button is already in confirm state
                    if (deleteButton.classList.contains('confirm-delete')) {
                        // If yes, perform the delete
                        deletePrompt(prompt.id);
                    } else {
                        // If no, change to confirm state
                        deleteButton.textContent = 'Confirm';
                        deleteButton.classList.add('confirm-delete');

                        // Optional: Revert back after a delay if not clicked
                        // setTimeout(() => {
                        //     if (deleteButton.classList.contains('confirm-delete')) {
                        //         deleteButton.textContent = 'Delete';
                        //         deleteButton.classList.remove('confirm-delete');
                        //     }
                        // }, 3000); // Revert after 3 seconds
                    }
                });
                // --- End Delete Button ---

                actionsDiv.appendChild(leftActionsDiv); // Add the group of left buttons
                actionsDiv.appendChild(deleteButton); // Add the delete button

                // XSS Fix: Create title element safely
                const titleDiv = document.createElement('div');
                titleDiv.className = 'prompt-title';
                titleDiv.textContent = prompt.title; // Use textContent to prevent XSS
                promptElement.appendChild(titleDiv); // Append the safe title

                promptElement.appendChild(contentDiv); // Add content div
                promptElement.appendChild(actionsDiv); // Add actions div

                savedPromptsList.appendChild(promptElement);
            });
        });
    }

    // --- Add Delete Prompt Function ---
    function deletePrompt(promptId) {
        chrome.storage.sync.get(['savedPrompts'], function(result) {
            let savedPrompts = result.savedPrompts || [];
            // Filter out the prompt with the given ID
            savedPrompts = savedPrompts.filter(prompt => prompt.id !== promptId);

            // Save the updated array back to storage
            chrome.storage.sync.set({ savedPrompts: savedPrompts }, function() {
                console.log('Prompt deleted successfully');
                loadSavedPrompts(); // Refresh the list
            });
        });
    }
    // --- End Add Delete Prompt Function ---
});