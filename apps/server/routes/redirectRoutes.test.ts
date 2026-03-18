import {type Response} from 'express';
import {setNonCacheHeaders} from './redirectRoutes';

type HeaderValueMap = Record<string, string>;

type ResponseWithHeaderCapture = {
  readonly headerValues: HeaderValueMap;
  readonly response: Response;
};

function createResponseWithHeaderCapture(): ResponseWithHeaderCapture {
  const headerValues: HeaderValueMap = {};
  const response = {
    set(name: string, value: string) {
      headerValues[name] = value;

      return this;
    },
  } as unknown as Response;

  return {
    headerValues,
    response,
  };
}

describe('RedirectRoutes response caching', () => {
  it('sets non-cache headers for version metadata responses', () => {
    const {headerValues, response} = createResponseWithHeaderCapture();

    const returnedResponse = setNonCacheHeaders(response);

    expect(returnedResponse).toBe(response);
    expect(headerValues).toEqual({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Expires: '0',
      Pragma: 'no-cache',
      'Surrogate-Control': 'no-store',
    });
  });
});
