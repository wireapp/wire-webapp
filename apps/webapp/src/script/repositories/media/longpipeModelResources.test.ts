import {MODEL_WEIGHTS_BASE_URL, preloadLongpipeModels} from './longpipeModelResources';

describe('preloadLongpipeModels', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retries after failure, consumes all model variants and shares repeated preload requests', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ok: false, status: 503});
    globalThis.fetch = fetchMock;
    await expect(preloadLongpipeModels()).rejects.toThrow('503');

    const arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
    fetchMock.mockReset().mockResolvedValue({ok: true, arrayBuffer});
    const first = preloadLongpipeModels();
    expect(preloadLongpipeModels()).toBe(first);
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(arrayBuffer).toHaveBeenCalledTimes(8);
    for (const preset of ['xs', 'small', 'medium', 'large']) {
      for (const suffix of ['.bin', '.f16.bin']) {
        expect(fetchMock).toHaveBeenCalledWith(`${MODEL_WEIGHTS_BASE_URL}/model_${preset}${suffix}`, {
          cache: 'force-cache',
        });
      }
    }
    await preloadLongpipeModels();
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
