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

import {updateScroll} from './scrollUpdater';

const createScrollingContainer = (scrollSize: number, scrollTop: number) => {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', {configurable: true, value: 100});
  Object.defineProperty(container, 'scrollHeight', {configurable: true, value: scrollSize});
  container.scrollTop = scrollTop;
  return container;
};

const stickToBottomThreshold = 100;

describe('updateScroll', () => {
  it('should go to the bottom when the content is first loaded', () => {
    const container = createScrollingContainer(500, 0);

    const messages = [new Message()];
    // container was empty
    const prevScrollHeight = 0;
    const prevNbMessages = 0;
    const selfUserId = 'user1';

    expect(container.scrollTop).toBe(0);

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

  it(`should stick to the bottom if we are under the ${stickToBottomThreshold}px threshold`, () => {
    const container = createScrollingContainer(500, 500 - stickToBottomThreshold - 1);

    const messages = [new Message()];
    // container was empty
    const prevScrollHeight = 0;
    const prevNbMessages = 0;
    const selfUserId = 'user1';

    expect(container.scrollTop).toBe(0);

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
});
