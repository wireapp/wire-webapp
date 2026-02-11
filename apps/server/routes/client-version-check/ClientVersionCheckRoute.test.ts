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

  it("returns HTTP 400 if 'X-Webapp-Client-Version' header is missing", async () => {
    const sendStatus = jest.fn();
    const fakeRequest = {header: jest.fn().mockReturnValue(undefined)} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;

    const fakeRouter = {
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    } as unknown as Router;

    createClientVersionCheckRoute({router: fakeRouter});

    expect(sendStatus).toHaveBeenNthCalledWith(1, 400);
  });

  it("returns HTTP 400 if 'X-Webapp-Client-Version' header is empty", async () => {
    const sendStatus = jest.fn();
    const fakeRequest = {header: jest.fn().mockReturnValue('')} as unknown as Request;
    const fakeResponse = {sendStatus} as unknown as Response;

    const fakeRouter = {
      get: jest.fn((_routePath, routeHandler) => {
        routeHandler(fakeRequest, fakeResponse);
      }),
    } as unknown as Router;

    createClientVersionCheckRoute({router: fakeRouter});

    expect(sendStatus).toHaveBeenNthCalledWith(1, 400);
  });
});
