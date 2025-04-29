// This script runs in the background

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Promptr extension installed');
});

// API endpoints
const ENHANCE_ENDPOINT = 'https://g9xrbepf9b.execute-api.us-east-2.amazonaws.com/dev/enhance';
const PARAMETERS_ENDPOINT = 'https://g9xrbepf9b.execute-api.us-east-2.amazonaws.com/dev/parameters';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background: Received message:', message.action, message);

    // --- Get Parameters Handler ---
    if (message.action === 'getParameters') {
        const basePrompt = message.basePrompt;
        console.log('Background: Received getParameters request for:', basePrompt);

        if (!basePrompt) {
            console.error('Background: getParameters request received with empty prompt.');
            sendResponse({ error: 'Base prompt cannot be empty.' });
            return false; // No async response needed
        }

        fetch(PARAMETERS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ basePrompt: basePrompt })
        })
        .then(response => {
            console.log('Background: /parameters response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`API Error (${PARAMETERS_ENDPOINT}): ${response.status} ${response.statusText} - ${text || 'No details'}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Background: Raw /parameters response data:', data);
            if (data.error) {
                console.error('Background: /parameters API returned an error:', data.error);
                throw new Error(data.error);
            }
            if (!data.parameters) {
                console.error('Background: No parameters array found in /parameters response:', data);
                throw new Error('No parameters returned from API');
            }
            console.log('Background: Successfully retrieved parameters:', data.parameters);
            sendResponse({ parameters: data.parameters });
        })
        .catch(error => {
            console.error('Background: Error during /parameters API call:', error);
            sendResponse({ error: error.message || 'Unknown error fetching parameters.' });
        });

        return true; // Indicates async response
    }

    // --- Enhance Prompt Handler (Modified) ---
    if (message.action === 'enhancePrompt') {
        const basePrompt = message.text; // Original prompt
        const parameters = message.parameters; // Parameters collected from user
        console.log('Background: Received enhancePrompt request for:', basePrompt, 'with params:', parameters);

        if (!basePrompt) {
            console.error('Background: Enhance request received with empty prompt.');
            sendResponse({ error: 'Prompt text cannot be empty.' });
            return false; // No async response needed
        }

        const payload = {
            prompt: basePrompt,
            parameters: parameters
        };

        fetch(ENHANCE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: JSON.stringify(payload)
            })
        })
        .then(response => {
            console.log('Background: /enhance response status:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`API Error (${ENHANCE_ENDPOINT}): ${response.status} ${response.statusText} - ${text || 'No details'}`);
                });
            }
            return response.json();
        })
        .then(rawData => {
            console.log('Background: Raw /enhance API response data:', rawData);

            let data;
            if (rawData.body && typeof rawData.body === 'string') {
                try {
                    data = JSON.parse(rawData.body);
                } catch (e) {
                    console.error('Background: Error parsing nested JSON body:', e);
                    throw new Error('Failed to parse API response body.');
                }
            } else {
                data = rawData; // Assume direct JSON if body isn't a string
            }

            if (data.error) {
                console.error('Background: /enhance API returned an error:', data.error);
                throw new Error(data.error);
            }

            const enhancedPrompt = data.enhancedPrompt;

            if (!enhancedPrompt) {
                console.error('Background: No enhanced prompt found in /enhance API response:', data);
                throw new Error('No enhanced prompt returned from API');
            }

            console.log('Background: Successfully enhanced prompt:', enhancedPrompt);
            sendResponse({ enhancedPrompt: enhancedPrompt });

        })
        .catch(error => {
            console.error('Background: Error during /enhance API call:', error);
            sendResponse({ error: error.message || 'Unknown error during enhancement.' });
        });

        return true; // Indicates that sendResponse will be called asynchronously
    }

    // Handle other message types if needed in the future
    console.log('Background: No handler for action:', message.action);
    return false; // Default: no async response
});

// You can add more background functionality here if needed