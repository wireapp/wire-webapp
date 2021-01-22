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

import LoadingBar, {LoadingBarProps} from './LoadingBar';

class LoadingBarPage extends TestPage<LoadingBarProps> {
  constructor(props?: LoadingBarProps) {
    super(LoadingBar, props);
  }

  getProgressElement = () => this.get('div[data-uie-name="loading-bar-progress"]');
}

describe('LoadingBar', () => {
  it('renders correct progress', async () => {
    const LoadingBar = new LoadingBarPage({message: 'example', progress: 30});
    expect(LoadingBar.getProgressElement().getDOMNode().getAttribute('style')).toBe('width: 30%;');
  });
});
