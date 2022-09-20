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

import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/src/main/conversation/';
import {Connection} from '@wireapp/api-client/src/connection';

export class AutoConnectHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    switch (payload.type) {
      case PayloadBundleType.CONNECTION_REQUEST:
        const content = payload.content as Connection;
        try {
          await this.sendConnectionResponse(content.to, true);
        } catch (error) {
          console.warn(
            `Failed to accept connection request from "${payload.from}": ${(error as Error).message}`,
            error,
          );
        }
        break;
    }
  }
}
