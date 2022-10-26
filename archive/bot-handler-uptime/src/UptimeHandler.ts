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

import * as moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

import {PayloadBundle, PayloadBundleSource, PayloadBundleType} from '@wireapp/core/lib/conversation/';
import {QuotableMessage} from '@wireapp/core/lib/conversation/message/OtrMessage';
import {MessageHandler} from '@wireapp/bot-api';
import {TextContent} from '@wireapp/core/lib/conversation/content';

momentDurationFormatSetup(moment as any);

export class UptimeHandler extends MessageHandler {
  static getUptime(): string {
    const seconds = Math.floor(process.uptime());
    return (moment.duration(seconds, 'seconds') as any).format({
      precision: 0,
      template: 'y [years], w [weeks], d [days], h [hours], m [minutes], s [seconds]',
    });
  }

  async handleEvent(payload: PayloadBundle): Promise<void> {
    if (payload.source === PayloadBundleSource.NOTIFICATION_STREAM) {
      return;
    }
    switch (payload.type) {
      case PayloadBundleType.TEXT: {
        const content = payload.content as TextContent;
        if (content.text.trim() === '/uptime') {
          const upTime = UptimeHandler.getUptime();
          await this.sendReply(payload.conversation, payload as QuotableMessage, `Running since: ${upTime}`);
        }
        break;
      }
    }
  }
}
