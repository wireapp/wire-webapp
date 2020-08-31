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
import type {Message} from '../entity/message/Message';

interface EphemeralTimerParams {
  message: Message;
}

class EphemeralTimer {
  started: number;
  duration: number;

  constructor({message: messageEntity}: EphemeralTimerParams) {
    this.started = messageEntity.ephemeral_started();
    this.duration = ((messageEntity.ephemeral_expires() as number) - this.started) / 1000;
  }

  setAnimationDelay(_: unknown, event: Event) {
    // every time the component gets rendered, the animation delay gets set
    // to accommodate for the passed lifetime of the timed message
    (event.target as HTMLElement).style.animationDelay = `${(this.started - Date.now()) / 1000}s`;
  }
}

ko.components.register('ephemeral-timer', {
  template: `
    <svg class="ephemeral-timer" viewBox="0 0 8 8" width="8" height="8">
      <circle class="ephemeral-timer__background" cx="4" cy="4" r="3.5"></circle>
      <circle class="ephemeral-timer__dial" cx="4" cy="4" r="2" transform="rotate(-90 4 4)" data-bind="style: {'animation-duration': duration + 's'}, event: {animationstart: setAnimationDelay}">
      </circle>
    </svg>
  `,
  viewModel: EphemeralTimer,
});
