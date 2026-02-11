import {Router, type Response} from 'express';
import {createClientVersionCheckRoute} from './ClientVersionCheckRoute';

describe('/client-version-check', () => {
  it('listens on /client-version-check path', async () => {
    const fakeGet = jest.fn();

    const fakeRouter = {
      get: fakeGet,
    } as unknown as Router;

    createClientVersionCheckRoute({router: fakeRouter});

    expect(fakeGet).toHaveBeenNthCalledWith(1, '/client-version-check', expect.any(Function));
  });

  it('returns HTTP 200', async () => {
    const sendStatus = jest.fn();
    const fakeRequest = {header: jest.fn().mockReturnValue('1.0.0')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;

    const fakeRouter = {
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    } as unknown as Router;

    createClientVersionCheckRoute({router: fakeRouter});

    expect(sendStatus).toHaveBeenNthCalledWith(1, 200);
  });

  it.each<{headerValue: string | undefined; expectedHttpStatusCode: number}>([
    {headerValue: '', expectedHttpStatusCode: 400},
    {headerValue: undefined, expectedHttpStatusCode: 400},
  ])(
    'returns HTTP status code $expectedHttpStatusCode if header value is "$headerValue"',
    async ({headerValue, expectedHttpStatusCode}) => {
      const sendStatus = jest.fn();
      const fakeRequest = {header: jest.fn().mockReturnValue(headerValue)} as unknown as Request;
      const fakeResponse = {sendStatus} as unknown as Response;

      const fakeRouter = {
        get: jest.fn((_routePath, routeHandler) => {
          routeHandler(fakeRequest, fakeResponse);
        }),
      } as unknown as Router;

      createClientVersionCheckRoute({router: fakeRouter});

      expect(sendStatus).toHaveBeenNthCalledWith(1, expectedHttpStatusCode);
    },
  );
});
