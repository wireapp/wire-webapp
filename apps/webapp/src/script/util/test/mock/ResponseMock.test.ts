import './ResponseMock';

describe('ResponseMock', () => {
  it('exposes text and json readers with response metadata', async () => {
    const response = new Response('{"connectionState":"online"}', {
      status: 201,
      statusText: 'Created',
    });

    await expect(response.text()).resolves.toBe('{"connectionState":"online"}');
    await expect(response.json()).resolves.toEqual({connectionState: 'online'});
    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    expect(response.statusText).toBe('Created');
  });

  it('marks non-success responses as not ok', () => {
    const response = new Response('', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    expect(response.ok).toBe(false);
  });
});
