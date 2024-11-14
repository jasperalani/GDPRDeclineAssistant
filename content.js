// Button text patterns to match
const PREFERENCE_PATTERNS = [
    'preferences',
    'options',
    'customize',
    'personalise',
    'settings'
];

const REJECT_PATTERNS = [
    'reject',
    'decline',
    'refuse',
    'deny',
    'deny all',
    'disable all',
    'decline optional cookies',
    'essential cookies only'
];

const SAVE_PATTERNS = [
    'save',
    'save changes',
    'confirm',
    'confirm choices',
    'apply',
    'submit'
];

// Function to check if an element is visible
const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.offsetParent !== null;
};

// Function to find and handle radio buttons for reject options
const findAndHandleRadioButtons = () => {
    console.log('Looking for reject radio buttons...');
    let foundAny = false;

    // Find all label elements
    const labels = document.querySelectorAll('label');

    labels.forEach(label => {
        if (!isVisible(label)) return;

        const labelText = label.textContent.toLowerCase().trim();

        // Check if label contains "reject" or related terms
        if (REJECT_PATTERNS.some(pattern => labelText.includes(pattern.toLowerCase()))) {
            console.log('Found label with reject text:', labelText);

            // Try different methods to find the associated radio button
            let radioButton = null;

            // Method 1: Check if label has a 'for' attribute
            if (label.htmlFor) {
                radioButton = document.getElementById(label.htmlFor);
            }

            // Method 2: Look for radio button within the label
            if (!radioButton) {
                radioButton = label.querySelector('input[type="radio"]');
            }

            // Method 3: Look for closest radio button near the label
            if (!radioButton) {
                // Look in parent container
                const container = label.parentElement;
                if (container) {
                    radioButton = container.querySelector('input[type="radio"]');
                }
            }

            // Method 4: Look for preceding or following radio button
            if (!radioButton) {
                const prevRadio = label.previousElementSibling;
                if (prevRadio && prevRadio.type === 'radio') {
                    radioButton = prevRadio;
                }
            }

            if (!radioButton) {
                const nextRadio = label.nextElementSibling;
                if (nextRadio && nextRadio.type === 'radio') {
                    radioButton = nextRadio;
                }
            }

            // If we found a radio button, select it
            if (radioButton && isVisible(radioButton)) {
                console.log('Found associated radio button:', radioButton);
                radioButton.checked = true;
                radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                // Also dispatch click event as some sites require it
                radioButton.dispatchEvent(new Event('click', { bubbles: true }));
                foundAny = true;
            }
        }
    });

    return foundAny;
};

// Function to find button by different text matching strategies
const findButtonByText = (patterns, searchInIframes = true) => {
    // Helper functions for different text matching strategies
    const containsExactWord = (text, word) => {
        const normalizedText = text.toLowerCase().trim();
        const wordRegex = new RegExp(`\\b${word.toLowerCase()}\\b`);
        return wordRegex.test(normalizedText);
    };

    const containsPattern = (text) => {
        const normalizedText = text.toLowerCase().trim();
        return patterns.some(pattern => normalizedText.includes(pattern.toLowerCase()));
    };

    // Search in main document with both strategies
    const elements = document.querySelectorAll('button, a, div[role="button"]');

    // First try exact word match
    const exactWord = patterns === PREFERENCE_PATTERNS ? "preferences" :
        patterns === REJECT_PATTERNS ? "reject" : "save";
    for (const element of elements) {
        if (isVisible(element) && containsExactWord(element.textContent, exactWord)) {
            console.log('Found button with exact word match:', element.textContent);
            return element;
        }
    }

    // Then try pattern matching
    for (const element of elements) {
        if (isVisible(element) && containsPattern(element.textContent)) {
            console.log('Found button with pattern match:', element.textContent);
            return element;
        }
    }

    // Search in iframes if enabled
    if (searchInIframes) {
        const iframes = document.getElementsByTagName('iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const iframeElements = iframeDoc.querySelectorAll('button, a, div[role="button"]');

                // First try exact word match in iframes
                for (const element of iframeElements) {
                    if (isVisible(element) && containsExactWord(element.textContent, exactWord)) {
                        console.log('Found button with exact word match in iframe:', element.textContent);
                        return element;
                    }
                }

                // Then try pattern matching in iframes
                for (const element of iframeElements) {
                    if (isVisible(element) && containsPattern(element.textContent)) {
                        console.log('Found button with pattern match in iframe:', element.textContent);
                        return element;
                    }
                }
            } catch (e) {
                continue;
            }
        }
    }

    return null;
};

// Function to handle the complete flow
const handleCookieConsent = async () => {
    console.log('Starting cookie consent handling...');

    // Find and click the preferences button
    const prefButton = findButtonByText(PREFERENCE_PATTERNS);
    if (prefButton) {
        console.log('Found preferences button:', prefButton.textContent);
        prefButton.click();

        // Wait for the modal/panel to appear
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Handle radio buttons and look for buttons
        const findAndHandleButtons = async () => {
            // Find and handle radio buttons
            const radioButtonsHandled = findAndHandleRadioButtons();

            // Look for reject button first
            const rejectButton = findButtonByText(REJECT_PATTERNS);
            if (rejectButton) {
                console.log('Found reject button:', rejectButton.textContent);
                rejectButton.click();
                return true;
            }

            // If radio buttons were handled and no reject button found, look for save button
            if (radioButtonsHandled) {
                const saveButton = findButtonByText(SAVE_PATTERNS);
                if (saveButton) {
                    console.log('Found save button:', saveButton.textContent);
                    saveButton.click();
                    return true;
                }
            }

            return false;
        };

        // Try finding and handling buttons multiple times
        let attempts = 0;
        const maxAttempts = 5;
        const tryHandlingButtons = async () => {
            if (attempts >= maxAttempts) {
                console.log('Max attempts reached');
                return;
            }

            if (!await findAndHandleButtons()) {
                attempts++;
                console.log(`Attempt ${attempts} failed, trying again...`);
                setTimeout(tryHandlingButtons, 700);
            }
        };

        await tryHandlingButtons();
    } else {
        // If no preferences button is found, try looking for a direct reject button
        console.log('No preferences button found, looking for direct reject button...');
        const rejectButton = findButtonByText(REJECT_PATTERNS);
        if (rejectButton) {
            console.log('Found direct reject button:', rejectButton.textContent);
            rejectButton.click();
        } else {
            console.log('No reject button found');
        }
    }
};

// Run on page load with a slight delay to ensure everything is loaded
setTimeout(handleCookieConsent, 1000);

// Watch for DOM changes that might indicate a popup
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            setTimeout(handleCookieConsent, 500);
            break;
        }
    }
});

// Start observing the document
observer.observe(document.body, {
    childList: true,
    subtree: true
});