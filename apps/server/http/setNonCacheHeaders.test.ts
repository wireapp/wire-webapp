import type {Response} from 'express';

import {setNonCacheHeaders} from './setNonCacheHeaders';

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

describe('setNonCacheHeaders', () => {
  it('sets the non-cache response headers and returns the response', () => {
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
