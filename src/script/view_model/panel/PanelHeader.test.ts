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

import PanelHeader, {PanelHeaderProps} from './PanelHeader';

import TestPage from 'Util/test/TestPage';

const goBackUie = 'back-button';
const closeUie = 'close-button';

class PanelHeaderPage extends TestPage<PanelHeaderProps> {
  constructor(props?: PanelHeaderProps) {
    super(PanelHeader, props);
  }

  getGoBackButton = () => this.get(`div[data-uie-name="${goBackUie}"]`);
  getCloseButton = () => this.get(`div[data-uie-name="${closeUie}"]`);
  clickGoBackButton = () => this.click(this.getGoBackButton());
  clickCloseButton = () => this.click(this.getCloseButton());
}

describe('PanelHeader', () => {
  it('calls the correct callbacks for back and close', () => {
    const onGoBack = jest.fn();
    const onClose = jest.fn();
    const panelHeader = new PanelHeaderPage({
      closeUie,
      goBackUie,
      onClose,
      onGoBack,
    });
    panelHeader.clickCloseButton();
    expect(onClose).toHaveBeenCalled();

    panelHeader.clickGoBackButton();
    expect(onGoBack).toHaveBeenCalled();
  });
});
