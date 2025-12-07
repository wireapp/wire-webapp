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
import {ReactionMap} from 'Repositories/storage';
import {t} from 'Util/LocalizerUtil';

import {Message} from './Message';

import {SuperType} from '../../../message/SuperType';

export class PingMessage extends Message {
  public readonly caption: ko.PureComputed<string>;
  public readonly iconClasses: ko.PureComputed<string>;
  readonly reactions = ko.observable<ReactionMap>([]);

  constructor() {
    super();
    this.super_type = SuperType.PING;

    this.caption = ko.pureComputed(() => (this.user().isMe ? t('conversationPingYou') : t('conversationPing')));

    this.iconClasses = ko.pureComputed(() => {
      const showPingAnimation = Date.now() - this.timestamp() < 2000;
      const cssClasses = this.accent_color();
      return showPingAnimation ? `${cssClasses} ping-animation ping-animation-soft` : cssClasses;
    });
  }
}
