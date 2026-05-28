import {OllamaClient} from './ollama/OllamaClient';

/**
 * Handles llm.* bridge methods.
 * Uses OllamaClient from the promoted AI code to run chat completions.
 */
export class LlmApiHandler {
    private readonly clientCache = new Map<string, OllamaClient>();

    getClient(extensionId: string, url: string, model: string): OllamaClient {
        const cacheKey = `${extensionId}:${url}:${model}`;
        if (!this.clientCache.has(cacheKey)) {
            this.clientCache.set(cacheKey, new OllamaClient(url, model));
        }
        return this.clientCache.get(cacheKey)!;
    }

    async handle(
        method: string,
        params: unknown,
        _extensionId: string,
        getSettings: () => Promise<Record<string, unknown>>,
    ): Promise<unknown> {
        if (method !== 'llm.complete') {
            throw Object.assign(new Error(`Not implemented: ${method}`), {code: 'NOT_IMPLEMENTED'});
        }

        const settings = await getSettings();
        const url = (settings.ollamaUrl as string | undefined) ?? 'http://localhost:11434';
        const defaultModel = (settings.ollamaModel as string | undefined) ?? 'llama3';

        const p = params as {
            model?: string;
            prompt?: string;
            messages?: Array<{role: 'system' | 'user' | 'assistant'; content: string}>;
            tools?: unknown[];
        };

        const client = this.getClient(_extensionId, url, p.model ?? defaultModel);
        const messages = p.messages ?? (p.prompt ? [{role: 'user' as const, content: p.prompt}] : []);

        const result = await client.chat({
            messages,
            tools: p.tools ?? [],
        });

        return {
            content: result.message?.content ?? '',
            tool_calls: result.message?.tool_calls,
            model: p.model ?? defaultModel,
            promptTokens: result.prompt_eval_count ?? 0,
            completionTokens: result.eval_count ?? 0,
        };
    }
}
