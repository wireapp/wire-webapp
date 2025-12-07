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

import {render} from '@testing-library/react';

import {Message} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import * as TimeUtil from 'Util/TimeUtil';
import {createUuid} from 'Util/uuid';

import {AssetHeader} from './AssetHeader';

describe('AssetHeader', () => {
  it('displays the expected username and time', () => {
    const timestamp = new Date('2021-01-21T15:08:14.225Z').getTime();
    const userName = 'John Doe';
    jest.spyOn(TimeUtil, 'formatTimeShort').mockReturnValue('3:08 PM');
    jest.spyOn(TimeUtil, 'formatDateShort').mockReturnValue('01/21');

    const user = new User(createUuid());
    user.name(userName);

    const message = new Message(createUuid());
    message.timestamp(timestamp);
    message.user(user);

    const {queryByText} = render(<AssetHeader message={message} />);

    expect(queryByText(userName)).not.toBeNull();
    expect(queryByText('01/21 3:08 PM')).not.toBeNull();
  });
});
