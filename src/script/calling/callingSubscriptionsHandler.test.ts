/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {callingSubscriptions} from './callingSubscriptionsHandler';

describe('callingSubscriptions', () => {
  it('keep tracks of ongoing calls', () => {
    const call1 = {conversation: {id: '1', domain: '1'}, unsubscribe: jest.fn()} as const;
    const call2 = {conversation: {id: '2', domain: '2'}, unsubscribe: jest.fn()} as const;
    const call3 = {conversation: {id: '3', domain: '3'}, unsubscribe: jest.fn()} as const;
    const calls = [call1, call2, call3] as const;

    calls.forEach(({conversation, unsubscribe}) => callingSubscriptions.addCall(conversation, unsubscribe));

    callingSubscriptions.removeCall(call1.conversation);
    expect(call1.unsubscribe).toHaveBeenCalled();

    expect(call2.unsubscribe).not.toHaveBeenCalled();
    expect(call3.unsubscribe).not.toHaveBeenCalled();

    callingSubscriptions.removeCall(call2.conversation);
    expect(call2.unsubscribe).toHaveBeenCalled();
    expect(call3.unsubscribe).not.toHaveBeenCalled();

    callingSubscriptions.removeCall(call3.conversation);
    expect(call3.unsubscribe).toHaveBeenCalled();
  });
});
