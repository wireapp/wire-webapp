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
import {Message} from '../../../entity/message/Message';
import EphemeralTimer, {EphemeralTimerProps} from './EphemeralTimer';

class EphemeralTimerPage extends TestPage<EphemeralTimerProps> {
  constructor(props?: EphemeralTimerProps) {
    super(EphemeralTimer, props);
  }

  getCircle = () => this.get('[data-uie-name="ephemeral-timer-circle"]');
}

describe('EphemeralTimer', () => {
  it('shows the icon', () => {
    const message = new Message();
    const remaining = 600_000;
    const now = Date.now();
    message.ephemeral_started(now);
    message.ephemeral_expires(now + remaining);
    message.ephemeral_remaining(remaining);

    const ephemeralTimer = new EphemeralTimerPage({message});
    const circle = ephemeralTimer.getCircle();

    expect(circle.props().style['--offset']).toBe(1);
  });
  it('hides the icon when no ephemeral timer was started', () => {
    const message = new Message();

    const ephemeralTimer = new EphemeralTimerPage({message});
    const circle = ephemeralTimer.getCircle();

    expect(circle.props().style['--offset']).toBe(0);
  });
});
