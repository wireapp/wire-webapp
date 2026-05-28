/**
 * Declarative proxy routing table. Each rule maps a URL pattern to the server-side
 * proxy path that handles it (for CORS). Adding support for a new external service
 * requires only a new entry here — not changes to handler logic.
 */
interface ProxyRule {
    test: RegExp;
    proxyBase: string;
}

const PROXY_RULES: ProxyRule[] = [
    {
        // Jira Cloud
        test: /\.atlassian\.net/,
        proxyBase: '/proxy/jira',
    },
    {
        // Local Ollama (http only — browser cannot reach localhost from webapp origin)
        test: /^http:\/\/(localhost|127\.0\.0\.1)/,
        proxyBase: '/proxy/ollama',
    },
];

/**
 * Resolve the fetch URL: apply proxy rules, pass same-origin and https-direct requests through.
 */
function resolveUrl(url: string): string {
    for (const rule of PROXY_RULES) {
        if (rule.test.test(url)) {
            // Replace scheme + host with the proxy base path
            return url.replace(/^https?:\/\/[^/]+/, rule.proxyBase);
        }
    }
    return url;
}

/**
 * Handles http.* bridge methods.
 * Performs fetch() from the main thread (bypasses iframe CORS restrictions).
 */
export class HttpApiHandler {

    async handle(method: string, params: unknown): Promise<unknown> {
        const p = params as {url: string; headers?: Record<string, string>; body?: unknown};
        const fetchMethod = method.replace('http.', '').toUpperCase();
        const fetchUrl = resolveUrl(p.url);

        const options: RequestInit = {
            method: fetchMethod,
            headers: {
                'Content-Type': 'application/json',
                ...(p.headers ?? {}),
            },
        };

        if (p.body !== undefined && fetchMethod !== 'GET' && fetchMethod !== 'DELETE') {
            options.body = JSON.stringify(p.body);
        }

        const response = await fetch(fetchUrl, options);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => { responseHeaders[key] = value; });

        let body: unknown;
        const contentType = response.headers.get('content-type') ?? '';
        try {
            body = contentType.includes('application/json')
                ? await response.json()
                : await response.text();
        } catch {
            body = null;
        }

        return {
            status: response.status,
            headers: responseHeaders,
            body,
        };
    }
}

/** Expose the proxy rules for testing and for any future admin UI. */
export {PROXY_RULES};
export type {ProxyRule};
