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

    // API endpoint - replace with your actual API Gateway URL
    const API_ENDPOINT = 'https://g9xrbepf9b.execute-api.us-east-2.amazonaws.com/dev/enhance';

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

    // Enhance button click handler
    enhanceButton.addEventListener('click', async () => {
        const basePrompt = basePromptInput.value.trim();

        if (!basePrompt) {
            alert('Please enter a prompt to enhance.');
            return;
        }

        try {
            // Show loading, hide results
            loadingElement.classList.remove('hidden');
            resultContainer.classList.add('hidden');

            console.log('Sending request to API with prompt:', basePrompt);

            // Modified request format - send a string with double escaped quotes
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Adjust the body format to match what Lambda expects
                    body: JSON.stringify({ prompt: basePrompt })
                })
            });

            console.log('Response status:', response.status);
            const rawData = await response.json();
            console.log('Raw response data:', rawData);

            // Handle nested response format
            let data;
            if (rawData.body && typeof rawData.body === 'string') {
                try {
                    data = JSON.parse(rawData.body);
                } catch (e) {
                    data = rawData;
                }
            } else {
                data = rawData;
            }

            if (data.error) {
                throw new Error(data.error);
            }

            const enhancedPrompt = data.enhancedPrompt;

            if (!enhancedPrompt) {
                throw new Error('No enhanced prompt returned from API');
            }

            // Display the enhanced prompt
            enhancedPromptElement.value = enhancedPrompt; // Use .value for input elements
            resultContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Error during enhancement:', error);
            alert(`Error: ${error.message}`);
        } finally {
            loadingElement.classList.add('hidden');
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