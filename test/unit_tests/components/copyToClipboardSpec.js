/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import 'src/script/components/copyToClipboard';

import {instantiateComponent} from '../../helper/knockoutHelpers';

describe('copy-to-clipboard', () => {
  const params = {text: () => 'Text goes here'};

  it('displays the given text', () => {
    return instantiateComponent('copy-to-clipboard', params).then(domContainer => {
      const element = domContainer.querySelector('.copy-to-clipboard');

      expect(element.innerText).toBe(params.text());
    });
  });

  it('selects the whole text when clicked', () => {
    const selectionMock = window.getSelection();
    spyOn(selectionMock, 'removeAllRanges').and.returnValue();
    spyOn(selectionMock, 'addRange').and.returnValue();
    spyOn(window, 'getSelection').and.returnValue(selectionMock);

    return instantiateComponent('copy-to-clipboard', params).then(domContainer => {
      const element = domContainer.querySelector('.copy-to-clipboard');

      element.click();

      expect(selectionMock.removeAllRanges).toHaveBeenCalled();
      expect(selectionMock.addRange).toHaveBeenCalled();
    });
  });
});
