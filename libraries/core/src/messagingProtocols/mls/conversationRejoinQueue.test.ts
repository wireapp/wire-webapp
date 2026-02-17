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

import {queueConversationRejoin} from './conversationRejoinQueue';

describe('queueConversationRejoin', () => {
  it('should queue conversation rejoin', async () => {
    const rejoinFn = jest.fn(() => Promise.resolve());
    await queueConversationRejoin('groupId', rejoinFn);
    expect(rejoinFn).toHaveBeenCalled();
  });

  it('should not queue conversation rejoin if already in queue', async () => {
    const rejoinFn = jest.fn(() => Promise.resolve());
    await Promise.all([1, 2, 3].map(() => queueConversationRejoin('groupId', rejoinFn)));
    expect(rejoinFn).toHaveBeenCalledTimes(1);
  });

  it('should run the function a second time if the task has been executed', async () => {
    const rejoinFn = jest.fn(() => Promise.resolve());
    await queueConversationRejoin('groupId', rejoinFn);
    await queueConversationRejoin('groupId', rejoinFn);
    expect(rejoinFn).toHaveBeenCalledTimes(2);
  });
});
