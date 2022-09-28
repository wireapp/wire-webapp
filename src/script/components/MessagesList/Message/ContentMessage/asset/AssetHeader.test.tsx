/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import AssetHeader from './AssetHeader';
import {render} from '@testing-library/react';
import {createRandomUuid} from 'Util/util';
import * as TimeUtil from 'Util/TimeUtil';

import {Message} from '../../../../../entity/message/Message';
import {User} from '../../../../../entity/User';

describe('AssetHeader', () => {
  it('displays the expected username and time', async () => {
    const timestamp = new Date('2021-01-21T15:08:14.225Z').getTime();
    const userName = 'John Doe';
    jest.spyOn(TimeUtil, 'formatTimeShort').mockReturnValue('3:08 PM');
    jest.spyOn(TimeUtil, 'formatDateShort').mockReturnValue('01/21');

    const user = new User(createRandomUuid());
    user.name(userName);

    const message = new Message(createRandomUuid());
    message.timestamp(timestamp);
    message.user(user);

    const {container} = render(<AssetHeader message={message} />);

    const userNameElement = container.querySelector('span[data-uie-name="asset-header-user-name"]');
    expect(userNameElement).not.toBeNull();

    expect(userNameElement!.textContent).toBe(userName);

    const timeElement = container.querySelector('span[data-uie-name="asset-header-time"]');
    expect(timeElement).not.toBeNull();

    expect(timeElement!.textContent).toBe('01/21 3:08 PM');
  });
});
