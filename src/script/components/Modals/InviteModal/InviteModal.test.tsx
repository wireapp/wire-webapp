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

import {render, screen, waitFor} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import {t} from 'Util/LocalizerUtil';

import {InviteModal} from './InviteModal';

import {Config} from '../../../Config';

const {BRAND_NAME: brandName} = Config.getConfig();

test('proper render invite modal text', async () => {
  const userName = 'janek';
  const user = new User();

  user.username(userName);

  const inviteText = t('inviteMessage', {brandName: brandName, username: `@${userName}`});

  render(<InviteModal selfUser={user} />);

  const textarea = await screen.getByTestId('invite-modal-message');
  await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(inviteText));
});
