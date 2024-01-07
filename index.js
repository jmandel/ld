import { parse } from 'node-html-parser';

async function extractJsonLD(url) {
    try {
        // Fetch the content from the URL
        const response = await fetch(url);
        const html = await response.text();

        // Parse the HTML content
        const root = parse(html);

        const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
        if (jsonLdScripts.length === 0) {
            const textContent = extractVisibleText(root);
            return { fallback: true, data: textContent.trim() };
        }

        const jsonLdContents = jsonLdScripts.map(script => JSON.parse(script.textContent));

        // Return the array of parsed JSON-LD objects
        return { fallback: false, data: jsonLdContents };
    } catch (error) {
        console.error('Error extracting content:', error);
        return { fallback: true, data: 'Error occurred while fetching or parsing content. You may wish to run a web search to find this content.' };
    }
}


function extractVisibleText(node) {
    let text = '';
    node.childNodes.forEach(child => {
        if (child.nodeType === 1 && child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') { // Element node
            // Exclude certain elements that do not contribute to visible text
            if (!['SCRIPT', 'STYLE', 'NOSCRIPT', 'IMG', 'SVG', 'VIDEO', 'AUDIO'].includes(child.tagName)) {
                text += extractVisibleText(child);
            }
        } else if (child.nodeType === 3) { // Text node
            text += child.text;
        }
    });
    const collapsedText = text.trim().replace(/\n{2,}/g, '\n\n');

    return collapsedText;
}

Bun.serve({
    fetch(request) {
        // Extract the URL parameter from the request
        const urlParams = new URL(request.url).searchParams;
        const targetUrl = urlParams.get('url');

        // Check if the URL parameter is provided
        if (!targetUrl) {
            return new Response("Error: No 'url' query parameter provided.", { status: 400 });
        }

        // Process the URL and return the response
        return extractJsonLD(targetUrl).then(result => {
            if (result.fallback) {
                return new Response(result.data, { status: 200, headers: { 'Content-Type': 'text/plain' } });
            } else {
                return new Response(JSON.stringify(result.data), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
        }).catch(error => {
            return new Response("Server error occurred: " + error.message, { status: 500 });
        });
    }
});
