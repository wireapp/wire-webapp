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

import {pushToTalk} from './PushToTalk';

describe('PushToTalk', () => {
  it('unmutes if key was pressed when muted', async () => {
    const mockToggleMute = jest.fn();
    const mockIsMuted = jest.fn();

    const key = 'a';
    pushToTalk.subscribe(key, mockToggleMute, mockIsMuted);

    mockIsMuted.mockReturnValueOnce(true);

    const event = new KeyboardEvent('keydown', {key});
    window.dispatchEvent(event);

    expect(mockToggleMute).toHaveBeenCalledTimes(1);
    expect(mockToggleMute).toHaveBeenCalledWith(false);
  });

  it('does not unmute if key was pressed when muted', async () => {
    const mockToggleMute = jest.fn();
    const mockIsMuted = jest.fn();

    const key = 'a';
    pushToTalk.subscribe(key, mockToggleMute, mockIsMuted);

    mockIsMuted.mockReturnValueOnce(false);

    const event = new KeyboardEvent('keydown', {key});
    window.dispatchEvent(event);

    expect(mockToggleMute).not.toHaveBeenCalled();
  });

  it('mute if key was pressed and then released', async () => {
    const mockToggleMute = jest.fn();
    const mockIsMuted = jest.fn();

    const key = 'a';
    pushToTalk.subscribe(key, mockToggleMute, mockIsMuted);

    mockIsMuted.mockReturnValueOnce(true);
    window.dispatchEvent(new KeyboardEvent('keydown', {key}));
    expect(mockToggleMute).toHaveBeenCalledTimes(1);
    expect(mockToggleMute).toHaveBeenCalledWith(false);

    mockIsMuted.mockReturnValueOnce(false);
    window.dispatchEvent(new KeyboardEvent('keyup', {key}));
    expect(mockToggleMute).toHaveBeenCalledTimes(2);
    expect(mockToggleMute).toHaveBeenCalledWith(true);
  });

  it('does not mute if unmuted with some other method', async () => {
    const mockToggleMute = jest.fn();
    const mockIsMuted = jest.fn();

    const key = 'a';
    pushToTalk.subscribe(key, mockToggleMute, mockIsMuted);

    mockIsMuted.mockReturnValueOnce(false);
    window.dispatchEvent(new KeyboardEvent('keyup', {key}));
    expect(mockToggleMute).not.toHaveBeenCalled();
  });

  it('tries to unmute only once even if event is spammed', async () => {
    const mockToggleMute = jest.fn();
    const mockIsMuted = jest.fn();

    const key = 'a';
    pushToTalk.subscribe(key, mockToggleMute, mockIsMuted);

    mockIsMuted.mockReturnValue(true);

    window.dispatchEvent(new KeyboardEvent('keydown', {key}));
    window.dispatchEvent(new KeyboardEvent('keydown', {key}));
    window.dispatchEvent(new KeyboardEvent('keydown', {key}));

    expect(mockToggleMute).toHaveBeenCalledTimes(1);
  });
});
