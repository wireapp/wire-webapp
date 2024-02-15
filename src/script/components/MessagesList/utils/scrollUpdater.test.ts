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

import {Message} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {StatusType} from 'src/script/message/StatusType';

import {updateScroll} from './scrollUpdater';

const createScrollingContainer = (height: number, contentHeight: number, scrollTop: number) => {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', {configurable: true, value: height});
  Object.defineProperty(container, 'scrollHeight', {configurable: true, value: contentHeight});
  container.scrollTop = scrollTop;
  container.scrollTo = jest.fn();
  return container;
};

const stickToBottomThreshold = 100;

describe('updateScroll', () => {
  it('should go to the bottom when the content is first loaded', () => {
    const messages = [new Message()];
    // container was empty
    const prevScrollHeight = 0;
    const prevNbMessages = 0;
    const selfUserId = 'user1';

    const container = createScrollingContainer(100, 500, 0);

    updateScroll(container, {
      focusedElement: null,
      prevScrollHeight,
      prevNbMessages,
      messages,
      selfUserId,
    });

    // container should be scrolled to the bottom
    expect(container.scrollTop).toBe(500);
  });

  it(`should smoothly stick to the bottom if we are under the ${stickToBottomThreshold}px threshold`, () => {
    // container was empty
    const prevScrollHeight = 0;
    const prevNbMessages = 0;
    const selfUserId = 'user1';

    const container = createScrollingContainer(100, 500, 500 - stickToBottomThreshold + 1);

    updateScroll(container, {
      focusedElement: null,
      prevScrollHeight,
      prevNbMessages,
      messages: [new Message()],
      selfUserId,
    });

    // container should be scrolled to the bottom
    expect(container.scrollTo).toHaveBeenCalledWith({behavior: 'smooth', top: 500});
  });

  it(`should stick to the bottom without animation if we are under the ${stickToBottomThreshold}px threshold and no new messages arrive`, () => {
    // container was empty
    const prevScrollHeight = 0;
    const prevNbMessages = 0;
    const selfUserId = 'user1';

    const container = createScrollingContainer(100, 500, 500 - stickToBottomThreshold + 1);

    updateScroll(container, {
      focusedElement: null,
      prevScrollHeight,
      prevNbMessages,
      messages: [],
      selfUserId,
    });

    // container should be scrolled to the bottom
    expect(container.scrollTo).toHaveBeenCalledWith({behavior: 'auto', top: 500});
  });

  it(`should not stick to the bottom if we are over the ${stickToBottomThreshold}px threshold`, () => {
    const prevScrollHeight = 500 - stickToBottomThreshold - 1;
    const prevNbMessages = 0;
    const selfUserId = 'user1';

    const container = createScrollingContainer(100, 500, 100);

    updateScroll(container, {
      focusedElement: null,
      prevScrollHeight,
      prevNbMessages,
      messages: [],
      selfUserId,
    });

    // container should be scrolled to the bottom
    expect(container.scrollTo).not.toHaveBeenCalled();
    expect(container.scrollTop).toBe(100);
  });

  it('should keep the scroll untouched if we loaded new messages when hitting the top', () => {
    const prevScrollHeight = 500;
    const prevNbMessages = 0;
    const selfUserId = 'user1';
    const newMessageHeight = 200;

    const container = createScrollingContainer(100, prevScrollHeight + newMessageHeight, 0);

    updateScroll(container, {
      focusedElement: null,
      prevScrollHeight,
      prevNbMessages,
      messages: [new Message()],
      selfUserId,
    });

    // container should be scrolled to the bottom
    expect(container.scrollTo).not.toHaveBeenCalled();
    expect(container.scrollTop).toBe(newMessageHeight);
  });

  it('should smoothly scroll to the last sent message from the self user', () => {
    const prevScrollHeight = 500;
    const prevNbMessages = 0;
    const selfUserId = 'user1';
    const newMessageHeight = 200;

    const container = createScrollingContainer(100, prevScrollHeight + newMessageHeight, 10);

    const newMessage = new Message();
    newMessage.user(new User(selfUserId));
    newMessage.status(StatusType.SENDING);

    updateScroll(container, {
      focusedElement: null,
      prevScrollHeight,
      prevNbMessages,
      messages: [newMessage],
      selfUserId,
    });

    // container should be scrolled to the bottom
    expect(container.scrollTo).toHaveBeenCalledWith({behavior: 'smooth', top: container.scrollHeight});
  });
});
