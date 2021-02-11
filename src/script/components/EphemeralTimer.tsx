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
import React from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import type {Message} from '../entity/message/Message';

export interface EphemeralTimerProps {
  message: Message;
}

const EphemeralTimer: React.FC<EphemeralTimerProps> = ({message}) => {
  const started = message.ephemeral_started();
  const expires = message.ephemeral_expires() as number;
  const duration = expires - started;
  const delay = started - Date.now();

  return (
    <svg className="ephemeral-timer" viewBox="0 0 8 8" width="8" height="8">
      <circle className="ephemeral-timer__background" cx="4" cy="4" r="3.5" />
      <circle
        className="ephemeral-timer__dial"
        cx="4"
        cy="4"
        r="2"
        transform="rotate(-90 4 4)"
        style={{
          animationDelay: `${delay}ms`,
          animationDuration: `${duration}ms`,
        }}
      />
    </svg>
  );
};

export default EphemeralTimer;

registerReactComponent('ephemeral-timer', {
  component: EphemeralTimer,
  template: '<span data-bind="react: {message}"></span>',
});
