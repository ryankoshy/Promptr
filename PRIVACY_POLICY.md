# Privacy Policy for Promptr Chrome Extension

**Last Updated:** April 26, 2025

Thank you for using Promptr! This Privacy Policy explains how the Promptr Chrome Extension ("the Extension") handles your information.

## Information We Handle

The Extension primarily works with text prompts that you, the user, provide.

1.  **Prompts You Enter/Select:** We handle the text you type into the Extension's popup or select on specific web pages when using the Extension's features (like the floating icon menu).
2.  **Saved Prompts:** If you use the "Save Prompt" or "Save Bookmark" feature, the text of your prompts (including titles/shortcuts and detailed content) is stored.

We do **not** collect personally identifiable information like your name, email address, or browsing history, other than the text content of the prompts you choose to save or enhance.

## How We Use Your Information

Your information is used solely to provide the Extension's functionality:

*   **Saving and Managing Prompts:** To store and retrieve prompts you save using the Extension's bookmark/save features.
*   **Enhancing Prompts:** When you use the "Enhance Prompt" feature, the text you have selected or entered is sent to our secure external API endpoint (`https://g9xrbepf9b.execute-api.us-east-2.amazonaws.com/dev/enhance`) for processing by an AI model. The enhanced prompt text is then returned to you.
*   **Inserting Prompts:** To allow you to insert saved prompts or enhanced prompts into text fields on specific websites.

## Data Storage

*   **Local Storage:** Saved prompts are stored locally in your browser using `chrome.storage.sync`. This allows your prompts to be available across devices where you are signed into Chrome and have syncing enabled. This data remains within your browser's storage unless you clear it or uninstall the Extension.

## Data Sharing and External Services

*   **Enhancement API:** As mentioned above, the text of prompts you choose to enhance is sent securely (via HTTPS) to our external API endpoint for processing. We do not log or store the content of these prompts on our API servers beyond what is necessary for the immediate processing and return of the enhanced result. The API provider is AWS (Amazon Web Services).
*   **No Other Sharing:** We do not share your saved prompts or any other data handled by the Extension with any other third parties.

## Permissions and Website Access

To function correctly, the Extension requires certain permissions:

*   **`storage`:** To save and load your prompts.
*   **`activeTab`:** To allow the popup interface to interact with the currently active, matched web page (e.g., inserting prompts).
*   **`clipboardWrite`:** To enable the "Copy" functionality for prompts.
*   **Specific Host Permissions (`chat.openai.com`, `claude.ai`, `gemini.google.com`, `grok.x.com`):** The Extension injects a content script *only* into these specific websites. This script enables the floating icon menu for selecting text and interacting with input fields directly on these sites. The Extension does **not** run on or access any other websites.

## Security

We take reasonable measures to protect the information handled by the Extension. Communication with our external API is encrypted using HTTPS. Local storage relies on the security features of your browser.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the "Last Updated" date at the top of this policy.

## Contact Us

If you have any questions about this Privacy Policy, please contact me at koshyryan@gmail.com.