// This script runs in the background

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Promptr extension installed');
});

// API endpoint - replace with your actual API Gateway URL (same as in popup.js)
const API_ENDPOINT = 'https://g9xrbepf9b.execute-api.us-east-2.amazonaws.com/dev/enhance';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enhancePrompt') {
        const basePrompt = message.text;
        console.log('Background: Received enhancePrompt request for:', basePrompt);

        if (!basePrompt) {
            console.error('Background: Enhance request received with empty prompt.');
            sendResponse({ error: 'Prompt text cannot be empty.' });
            return false; // No async response needed
        }

        // Perform the API call asynchronously
        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Match the body structure expected by the Lambda (same as popup.js)
            body: JSON.stringify({
                body: JSON.stringify({ prompt: basePrompt })
            })
        })
        .then(response => {
            console.log('Background: API response status:', response.status);
            if (!response.ok) {
                // Attempt to get error details from response body
                return response.text().then(text => {
                    throw new Error(`API Error: ${response.status} ${response.statusText} - ${text || 'No details'}`);
                });
            }
            return response.json();
        })
        .then(rawData => {
            console.log('Background: Raw API response data:', rawData);

            // Handle potentially nested response body (same as popup.js)
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
                console.error('Background: API returned an error:', data.error);
                throw new Error(data.error);
            }

            const enhancedPrompt = data.enhancedPrompt;

            if (!enhancedPrompt) {
                console.error('Background: No enhanced prompt found in API response:', data);
                throw new Error('No enhanced prompt returned from API');
            }

            console.log('Background: Successfully enhanced prompt:', enhancedPrompt);
            sendResponse({ enhancedPrompt: enhancedPrompt });

        })
        .catch(error => {
            console.error('Background: Error during enhancement API call:', error);
            sendResponse({ error: error.message || 'Unknown error during enhancement.' });
        });

        return true; // Indicates that sendResponse will be called asynchronously
    }

    // Handle other message types if needed in the future
    return false; // Default: no async response
});

// You can add more background functionality here if needed