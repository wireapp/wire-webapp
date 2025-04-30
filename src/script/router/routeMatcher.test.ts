/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {matchRoute} from './routeMatcher';

describe('matchRoute', () => {
  describe('basic path matching', () => {
    it('matches exact paths', () => {
      expect(matchRoute({path: '/users', pattern: '/users'})).toEqual({match: true, params: {}});
      expect(matchRoute({path: '/users/profile', pattern: '/users/profile'})).toEqual({
        match: true,
        params: {},
      });
    });

    it('does not match different paths', () => {
      expect(matchRoute({path: '/users', pattern: '/posts'})).toEqual({match: false, params: {}});
      expect(matchRoute({path: '/users/profile', pattern: '/users/settings'})).toEqual({
        match: false,
        params: {},
      });
    });

    it('handles trailing slashes', () => {
      expect(matchRoute({path: '/users/', pattern: '/users'})).toEqual({match: true, params: {}});
      expect(matchRoute({path: '/users', pattern: '/users/'})).toEqual({match: true, params: {}});
      expect(matchRoute({path: '/users///', pattern: '/users'})).toEqual({match: true, params: {}});
    });
  });

  describe('required parameters', () => {
    it('matches paths with required parameters', () => {
      expect(matchRoute({path: '/users/123', pattern: '/users/:id'})).toEqual({
        match: true,
        params: {id: '123'},
      });
      expect(matchRoute({path: '/users/123/posts/456', pattern: '/users/:userId/posts/:postId'})).toEqual({
        match: true,
        params: {userId: '123', postId: '456'},
      });
    });

    it('fails when required parameter is missing', () => {
      expect(matchRoute({path: '/users', pattern: '/users/:id'})).toEqual({match: false, params: {}});
      expect(matchRoute({path: '/users/123', pattern: '/users/:id/posts'})).toEqual({
        match: false,
        params: {},
      });
    });
  });

  describe('optional parameters', () => {
    it('matches paths with optional parameters', () => {
      expect(matchRoute({path: '/users/123', pattern: '/users/(:id)'})).toEqual({
        match: true,
        params: {id: '123'},
      });
      expect(matchRoute({path: '/users', pattern: '/users/(:id)'})).toEqual({
        match: true,
        params: {},
      });
    });

    it('matches paths with multiple optional parameters', () => {
      expect(matchRoute({path: '/users/123/posts/456', pattern: '/users/(:userId)/posts/(:postId)'})).toEqual({
        match: true,
        params: {userId: '123', postId: '456'},
      });
      expect(matchRoute({path: '/users/posts', pattern: '/users/(:userId)/posts/(:postId)'})).toEqual({
        match: true,
        params: {},
      });
    });
  });

  describe('wildcard segments', () => {
    it('matches paths with wildcard segments', () => {
      expect(matchRoute({path: '/users/123/posts/456', pattern: '/users/*'})).toEqual({
        match: true,
        params: {'*': '123/posts/456'},
      });
      expect(matchRoute({path: '/users/123/posts/456', pattern: '/users/:id/*'})).toEqual({
        match: true,
        params: {id: '123', '*': 'posts/456'},
      });
    });

    it('handles empty wildcard segments', () => {
      expect(matchRoute({path: '/users', pattern: '/users/*'})).toEqual({
        match: true,
        params: {'*': ''},
      });
    });
  });

  it('handles empty paths', () => {
    expect(matchRoute({path: '', pattern: ''})).toEqual({match: true, params: {}});
    expect(matchRoute({path: '/', pattern: ''})).toEqual({match: true, params: {}});
    expect(matchRoute({path: '', pattern: '/'})).toEqual({match: true, params: {}});
  });

  it('handles root path', () => {
    expect(matchRoute({path: '/', pattern: '/'})).toEqual({match: true, params: {}});
  });

  it('handles multiple consecutive slashes', () => {
    expect(matchRoute({path: '//users///123//', pattern: '/users/:id'})).toEqual({
      match: true,
      params: {id: '123'},
    });
  });
});
