jest.mock('Util/logger', () => ({
  getLogger: () => ({info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()}),
}));

import {OllamaClient} from '../script/ai/ollama/OllamaClient';
import {OllamaUnreachableError, OllamaModelMissingError} from '../script/ai/ollama/errors';

const BASE_URL = 'http://localhost:11434';
const MODEL = 'llama3.2:3b';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const mockFetch = (impl: () => Promise<Response>): void => {
  // jsdom does not expose fetch on globalThis, so assign the mock directly.
  (globalThis as unknown as {fetch: unknown}).fetch = jest.fn().mockImplementation(impl);
};

describe('OllamaClient', () => {
  let client: OllamaClient;

  beforeEach(() => {
    client = new OllamaClient(BASE_URL, MODEL);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).fetch;
  });

  describe('listModels()', () => {
    it('returns model names from /api/tags', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({models: [{name: 'llama3.2:3b'}, {name: 'qwen3:7b'}]})));
      const models = await client.listModels();
      expect(models).toEqual(['llama3.2:3b', 'qwen3:7b']);
    });

    it('returns an empty array when models array is missing', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({})));
      const models = await client.listModels();
      expect(models).toEqual([]);
    });

    it('throws OllamaUnreachableError on non-OK status', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({}, 500)));
      await expect(client.listModels()).rejects.toBeInstanceOf(OllamaUnreachableError);
    });

    it('throws OllamaUnreachableError when fetch rejects (network error)', async () => {
      mockFetch(() => Promise.reject(new Error('ECONNREFUSED')));
      await expect(client.listModels()).rejects.toBeInstanceOf(OllamaUnreachableError);
    });
  });

  describe('getContextLength()', () => {
    it('extracts context_length from nested model_info key', async () => {
      mockFetch(() =>
        Promise.resolve(
          jsonResponse({
            model_info: {
              'llama.context_length': {context_length: 131072},
            },
          }),
        ),
      );
      const length = await client.getContextLength();
      expect(length).toBe(131072);
    });

    it('extracts context_length from flat model_info keys', async () => {
      mockFetch(() =>
        Promise.resolve(
          jsonResponse({
            model_info: {
              'llama.context_length': 32768,
            },
          }),
        ),
      );
      const length = await client.getContextLength();
      expect(length).toBe(32768);
    });

    it('returns null when model_info is missing', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({})));
      const length = await client.getContextLength();
      expect(length).toBeNull();
    });

    it('throws OllamaModelMissingError on 404', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({}, 404)));
      await expect(client.getContextLength()).rejects.toBeInstanceOf(OllamaModelMissingError);
    });

    it('throws OllamaUnreachableError on 500', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({}, 500)));
      await expect(client.getContextLength()).rejects.toBeInstanceOf(OllamaUnreachableError);
    });
  });

  describe('chat()', () => {
    const validChatResponse = {
      message: {content: '', tool_calls: [{function: {name: 'report_completion', arguments: {}}}]},
      done: true,
    };

    it('posts to /api/chat and returns the parsed response', async () => {
      mockFetch(() => Promise.resolve(jsonResponse(validChatResponse)));
      const response = await client.chat({
        messages: [{role: 'user', content: 'test prompt'}],
        tools: [],
        signal: new AbortController().signal,
      });
      expect(response.message.tool_calls).toHaveLength(1);
    });

    it('includes num_ctx as options.num_ctx when provided', async () => {
      let capturedBody: Record<string, unknown> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = jest.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse(validChatResponse);
      });
      await client.chat({
        messages: [{role: 'user', content: 'test'}],
        tools: [],
        numCtx: 32768,
        signal: new AbortController().signal,
      });
      expect((capturedBody.options as Record<string, number>).num_ctx).toBe(32768);
    });

    it('throws OllamaUnreachableError on network error', async () => {
      mockFetch(() => Promise.reject(new Error('Network failure')));
      await expect(
        client.chat({messages: [{role: 'user', content: 'test'}], tools: [], signal: new AbortController().signal}),
      ).rejects.toBeInstanceOf(OllamaUnreachableError);
    });

    it('throws OllamaModelMissingError on 404', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({}, 404)));
      await expect(
        client.chat({messages: [{role: 'user', content: 'test'}], tools: [], signal: new AbortController().signal}),
      ).rejects.toBeInstanceOf(OllamaModelMissingError);
    });

    it('throws OllamaUnreachableError on 500', async () => {
      mockFetch(() => Promise.resolve(jsonResponse({}, 500)));
      await expect(
        client.chat({messages: [{role: 'user', content: 'test'}], tools: [], signal: new AbortController().signal}),
      ).rejects.toBeInstanceOf(OllamaUnreachableError);
    });
  });
});
