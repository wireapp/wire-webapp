/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import ko from 'knockout';

import {withAutoReadGuard} from './autoReadGuard';

describe('withAutoReadGuard', () => {
  it('runs the callback with its arguments while auto-read is not suppressed', () => {
    const callback = jest.fn();
    const conversation = {isAutoReadSuppressed: ko.observable(false)};

    withAutoReadGuard(conversation, callback)('a', 1);

    expect(callback).toHaveBeenCalledWith('a', 1);
  });

  it('skips the callback while auto-read is suppressed', () => {
    const callback = jest.fn();
    const conversation = {isAutoReadSuppressed: ko.observable(true)};

    withAutoReadGuard(conversation, callback)();

    expect(callback).not.toHaveBeenCalled();
  });

  it('evaluates suppression when the wrapped callback runs, not when it is created', () => {
    const callback = jest.fn();
    const conversation = {isAutoReadSuppressed: ko.observable(false)};
    const guarded = withAutoReadGuard(conversation, callback);

    conversation.isAutoReadSuppressed(true);
    guarded();

    expect(callback).not.toHaveBeenCalled();
  });
});
