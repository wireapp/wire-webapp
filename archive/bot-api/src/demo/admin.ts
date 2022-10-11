/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import 'dotenv-defaults/config';
import {Bot} from '../Bot';

const {CONVERSATION, EMAIL, PASSWORD, USER_ID} = process.env;

(async () => {
  const bot = new Bot({email: EMAIL!, password: PASSWORD!});
  await bot.start();
  await bot.sendText(CONVERSATION!, `Promoting user "${USER_ID}" to admin role.`);
  await bot.setAdminRole(CONVERSATION!, USER_ID!);
  process.exit(0);
})().catch(error => console.error(error));
