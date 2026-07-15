import {type Request, type Response} from 'express';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {Maybe} from 'true-myth';

import {createJoinConversationRedirectUrl, redirectToJoinConversation} from './redirectRoutes';

type JoinRedirectResponse = {
  readonly response: Response;
  readonly redirect: jest.Mock;
  readonly sendStatus: jest.Mock;
};

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
    const redirectUrl = createJoinConversationRedirectUrl({
      key: 'conversation-key',
      code: 'conversation-code',
    });

    expect(redirectUrl).toStrictEqual(
      Maybe.just('/auth/?join_key=conversation-key&join_code=conversation-code#/join-conversation'),
    );
  });

  it('keeps an encoded ampersand inside the join key value', () => {
    const originalJoinKey = 'safe&destination_url=https://example.invalid#/custom-env-redirect';
    const redirectUrl = createJoinConversationRedirectUrl({
      key: originalJoinKey,
      code: 'code',
    });

    const parsedRedirectUrl = new URL(redirectUrl.unwrapOr(''), 'https://app.wire.com');

    expect(parsedRedirectUrl.searchParams.get('destination_url')).toBeNull();
    expect(parsedRedirectUrl.searchParams.get('join_key')).toBe(originalJoinKey);
    expect(parsedRedirectUrl.searchParams.get('join_code')).toBe('code');
    expect(parsedRedirectUrl.hash).toBe('#/join-conversation');
  });

  it.each([
    {key: 'safe#/custom-env-redirect', code: 'code'},
    {key: 'key', code: 'safe#/custom-env-redirect'},
  ])('keeps an encoded hash inside the join query value', query => {
    const redirectUrl = createJoinConversationRedirectUrl(query);

    const parsedRedirectUrl = new URL(redirectUrl.unwrapOr(''), 'https://app.wire.com');

    expect(parsedRedirectUrl.searchParams.get('join_key')).toBe(query.key);
    expect(parsedRedirectUrl.searchParams.get('join_code')).toBe(query.code);
    expect(parsedRedirectUrl.hash).toBe('#/join-conversation');
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
