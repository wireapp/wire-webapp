/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';

import {SuperType} from '../../message/SuperType';
import {Message} from './Message';

export class PingMessage extends Message {
  public readonly caption: ko.PureComputed<string>;
  public readonly get_icon_classes: ko.PureComputed<string>;

  constructor() {
    super();
    this.super_type = SuperType.PING;

    this.caption = ko.pureComputed(() => (this.user().isMe ? t('conversationPingYou') : t('conversationPing')));

    this.get_icon_classes = ko.pureComputed(() => {
      const show_ping_animation = Date.now() - this.timestamp() < 2000;
      let css_classes = this.accent_color();
      if (show_ping_animation) {
        css_classes += ' ping-animation ping-animation-soft';
      }
      return css_classes;
    });
  }
}
