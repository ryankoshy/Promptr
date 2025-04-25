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
            enhancedPromptElement.textContent = enhancedPrompt;
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
        navigator.clipboard.writeText(enhancedPromptElement.textContent)
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
        const enhancedPrompt = enhancedPromptElement.textContent;

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

                // Create actions container
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'prompt-actions';

                // Create Expand/Collapse button
                const expandButton = document.createElement('button');
                expandButton.className = 'expand-button';
                expandButton.textContent = 'Expand';
                expandButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent prompt item click event
                    contentDiv.classList.toggle('expanded');
                    expandButton.textContent = contentDiv.classList.contains('expanded') ? 'Collapse' : 'Expand';
                });

                // Create Copy button
                const copyPromptBtn = document.createElement('button');
                copyPromptBtn.className = 'copy-prompt-button';
                copyPromptBtn.textContent = 'Copy';
                copyPromptBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent prompt item click event
                    navigator.clipboard.writeText(fullPromptContent)
                        .then(() => {
                            const originalText = copyPromptBtn.textContent;
                            copyPromptBtn.textContent = 'Copied!';
                            setTimeout(() => {
                                copyPromptBtn.textContent = originalText;
                            }, 1500);
                        })
                        .catch(err => {
                            console.error('Failed to copy prompt:', err);
                            alert('Failed to copy prompt.');
                        });
                });

                // Assemble the prompt item
                promptElement.innerHTML = `<div class="prompt-title">${prompt.title}</div>`; // Set title first
                promptElement.appendChild(contentDiv); // Add content div
                actionsDiv.appendChild(expandButton);
                actionsDiv.appendChild(copyPromptBtn);
                promptElement.appendChild(actionsDiv); // Add actions div

                // Click on the main item still loads it into Enhance tab
                promptElement.addEventListener('click', () => {
                    // Only load base prompt if it exists (for enhanced prompts)
                    basePromptInput.value = prompt.basePrompt || ''; 
                    enhancedPromptElement.textContent = fullPromptContent;
                    resultContainer.classList.remove('hidden');

                    // Switch to enhance tab
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    document.querySelector('[data-tab="enhance"]').classList.add('active');
                    document.getElementById('enhance-tab').classList.add('active');
                    
                    // Scroll enhance tab to top potentially
                    document.getElementById('enhance-tab').scrollTop = 0;
                });

                savedPromptsList.appendChild(promptElement);
            });
        });
    }
});