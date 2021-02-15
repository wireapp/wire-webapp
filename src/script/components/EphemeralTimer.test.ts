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
import EphemeralTimer, {EphemeralTimerProps} from './EphemeralTimer';

class EphemeralTimerPage extends TestPage<EphemeralTimerProps> {
  constructor(props?: EphemeralTimerProps) {
    super(EphemeralTimer, props);
  }

  getDesktopIcon = () => this.get('svg[data-uie-name="status-desktop-device"]');
  getMobileDeviceIcon = () => this.get('svg[data-uie-name="status-mobile-device"]');
  getDiscloseIcon = () => this.get('svg[data-uie-name="disclose-icon"]');
  getVerifiedIcon = () => this.get('svg[data-uie-name="user-device-verified"]');
  getNotVerifiedIcon = () => this.get('svg[data-uie-name="user-device-not-verified"]');
}

describe('EphemeralTimer', () => {
  it('renders desktop icon for desktop clients', async () => {});
});
