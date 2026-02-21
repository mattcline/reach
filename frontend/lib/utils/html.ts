// In-memory cache for CSS content to avoid repeated HTTP requests
const cssCache: Map<string, string> = new Map();

/** 
 * Reads the local CSS file and injects it into an HTML string.
 * Uses in-memory caching to avoid repeated HTTP requests for the same CSS file.
 * 
 * @param {string} htmlString - The HTML string to inject CSS into.
 * @param {string} cssFilePath - The path to the CSS file to inject.
 * @returns {string} - The HTML string with CSS injected.
 */
export async function injectCSSIntoHTML(
  htmlString: string,
  cssFilePath: string
): Promise<string> {
  let cssContent: string;
  
  // Check if CSS is already cached
  if (cssCache.has(cssFilePath)) {
    cssContent = cssCache.get(cssFilePath)!;
  } else {
    // Fetch CSS using simple fetch (no CSRF tokens needed for static files)
    const response = await fetch(cssFilePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSS file: ${response.status} ${response.statusText}`);
    }
    cssContent = await response.text();
    cssCache.set(cssFilePath, cssContent);
  }

  const htmlWithCSS = `
    <html>
      <head>
        <style>
          ${cssContent}
        </style>
      </head>
      <body>
        ${htmlString}
      </body>
    </html>
  `;

  return htmlWithCSS;
}