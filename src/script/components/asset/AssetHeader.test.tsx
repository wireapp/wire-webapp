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

import TestPage from 'Util/test/TestPage';
import {createRandomUuid} from 'Util/util';

import {Message} from '../../entity/message/Message';
import {User} from '../../entity/User';
import AssetHeader, {AssetHeaderProps} from './AssetHeader';

class AssetHeaderPage extends TestPage<AssetHeaderProps> {
  constructor(props?: AssetHeaderProps) {
    super(AssetHeader, props);
  }

  getUserName = () => this.get('span[data-uie-name="user-name"]').text();
  getTime = () => this.get('span[data-uie-name="header-time"]').text();
}

describe('AssetHeader', () => {
  it('displays the expected username and time', async () => {
    const timestamp = new Date('2021-01-21T15:08:14.225Z').getTime();
    const userName = 'John Doe';

    const user = new User(createRandomUuid());
    user.name(userName);

    const message = new Message(createRandomUuid());
    message.timestamp(timestamp);
    message.user(user);

    const assetHeader = new AssetHeaderPage({message});

    expect(assetHeader.getUserName()).toBe(userName);

    // TODO: Mock `formatTimeShort` to test this
    // expect(assetHeader.getTime()).toBe('01/21 4:08 PM');
  });
});
