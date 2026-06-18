import {type Request, type Response} from 'express';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {Maybe} from 'true-myth';

import {createJoinRedirectLocation, redirectToJoinConversation, setNonCacheHeaders} from './redirectRoutes';

type HeaderValueMap = Record<string, string>;

type ResponseWithHeaderCapture = {
  readonly headerValues: HeaderValueMap;
  readonly response: Response;
};

type JoinRedirectResponse = {
  readonly response: Response;
  readonly redirect: jest.Mock;
  readonly sendStatus: jest.Mock;
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

function createJoinRedirectResponse(): JoinRedirectResponse {
  const redirect = jest.fn();
  const sendStatus = jest.fn();
  const response = {
    redirect,
    sendStatus,
  } as unknown as Response;

  return {
    response,
    redirect,
    sendStatus,
  };
}

function createJoinRedirectRequest(query: Request['query']): Request {
  return {
    query,
  } as unknown as Request;
}

describe('RedirectRoutes join redirect', () => {
  it('creates a redirect URL with join key, join code and join conversation hash', () => {
    const redirectLocation = createJoinRedirectLocation({
      key: 'conversation-key',
      code: 'conversation-code',
    });

    expect(redirectLocation).toStrictEqual(
      Maybe.just('/auth/?join_key=conversation-key&join_code=conversation-code#/join-conversation'),
    );
  });

  it('keeps an encoded ampersand inside the join key value', () => {
    const originalJoinKey = 'safe&destination_url=https://example.invalid#/custom-env-redirect';
    const redirectLocation = createJoinRedirectLocation({
      key: originalJoinKey,
      code: 'code',
    });

    const redirectUrl = new URL(redirectLocation.unwrapOr(''), 'https://app.wire.com');

    expect(redirectUrl.searchParams.get('destination_url')).toBeNull();
    expect(redirectUrl.searchParams.get('join_key')).toBe(originalJoinKey);
    expect(redirectUrl.searchParams.get('join_code')).toBe('code');
    expect(redirectUrl.hash).toBe('#/join-conversation');
  });

  it.each([
    {key: 'safe#/custom-env-redirect', code: 'code'},
    {key: 'key', code: 'safe#/custom-env-redirect'},
  ])('keeps an encoded hash inside the join query value', query => {
    const redirectLocation = createJoinRedirectLocation(query);

    const redirectUrl = new URL(redirectLocation.unwrapOr(''), 'https://app.wire.com');

    expect(redirectUrl.searchParams.get('join_key')).toBe(query.key);
    expect(redirectUrl.searchParams.get('join_code')).toBe(query.code);
    expect(redirectUrl.hash).toBe('#/join-conversation');
  });

  it.each([
    {query: {code: 'code'}, description: 'missing key'},
    {query: {key: 'key'}, description: 'missing code'},
    {query: {key: ['first-key', 'second-key'], code: 'code'}, description: 'repeated key'},
    {query: {key: 'key', code: ['first-code', 'second-code']}, description: 'repeated code'},
  ])('returns HTTP 400 for $description', ({query}) => {
    const {response, redirect, sendStatus} = createJoinRedirectResponse();
    const request = createJoinRedirectRequest(query);

    redirectToJoinConversation(request, response);

    expect(sendStatus).toHaveBeenNthCalledWith(1, HTTP_STATUS.BAD_REQUEST);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects valid join query parameters with HTTP 302', () => {
    const {response, redirect, sendStatus} = createJoinRedirectResponse();
    const request = createJoinRedirectRequest({
      key: 'key',
      code: 'code',
    });

    redirectToJoinConversation(request, response);

    expect(redirect).toHaveBeenNthCalledWith(
      1,
      HTTP_STATUS.MOVED_TEMPORARILY,
      '/auth/?join_key=key&join_code=code#/join-conversation',
    );
    expect(sendStatus).not.toHaveBeenCalled();
  });
});

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
