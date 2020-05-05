/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {MessageSender} from 'src/script/message/MessageSender';

describe('MessageSender', () => {
  it('is in a paused state by default', done => {
    const messageSender = new MessageSender();
    const testData = {sendMessageFunction: () => Promise.resolve()};
    spyOn(testData, 'sendMessageFunction').and.callThrough();

    messageSender.queueMessage(testData.sendMessageFunction);
    window.setTimeout(() => {
      expect(testData.sendMessageFunction).not.toHaveBeenCalled();
      done();
    });
  });

  it('execute the sending queue when set to an active state', () => {
    const messageSender = new MessageSender();
    const testData = {sendMessageFunction: () => Promise.resolve()};
    spyOn(testData, 'sendMessageFunction').and.callThrough();

    const promises = [
      messageSender.queueMessage(testData.sendMessageFunction),
      messageSender.queueMessage(testData.sendMessageFunction),
      messageSender.queueMessage(testData.sendMessageFunction),
    ];

    expect(testData.sendMessageFunction).not.toHaveBeenCalled();

    messageSender.pauseQueue(false);

    return Promise.all(promises).then(() => {
      expect(testData.sendMessageFunction).toHaveBeenCalledTimes(3);
    });
  });
});
