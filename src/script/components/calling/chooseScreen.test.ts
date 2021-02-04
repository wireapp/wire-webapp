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

import TestPage from 'Util/test/TestPage';

import ChooseScreen, {ChooseScreenProps} from './ChooseScreen';

class ChooseScreenPage extends TestPage<ChooseScreenProps> {
  constructor(props?: ChooseScreenProps) {
    super(ChooseScreen, props);
  }
  getListItems = () => this.get('.choose-screen-list-item');
  getCancelButton = () => this.get('[data-uie-name="do-choose-screen-cancel"]');
}

describe('ChooseScreen', () => {
  const screens = [
    {id: 'screen:first', thumbnail: {toDataURL: () => 'first screen'} as HTMLCanvasElement},
    {id: 'screen:second', thumbnail: {toDataURL: () => 'second screen'} as HTMLCanvasElement},
  ];
  const windows = [
    {id: 'window:first', thumbnail: {toDataURL: () => 'first window'} as HTMLCanvasElement},
    {id: 'window:second', thumbnail: {toDataURL: () => 'second window'} as HTMLCanvasElement},
  ];
  const cancel = jasmine.createSpy();
  const choose = jasmine.createSpy();

  const props = {
    cancel,
    choose,
    screens,
    windows,
  };

  it('shows the available screens', () => {
    const chooseScreen = new ChooseScreenPage(props);
    expect(chooseScreen.getListItems().length).toBe(screens.length + windows.length);
  });

  it('calls cancel on escape', () => {
    new ChooseScreenPage(props);
    const event = new KeyboardEvent('keydown', {key: 'Escape'});
    document.dispatchEvent(event);
    expect(props.cancel).toHaveBeenCalled();
  });

  it('calls cancel on cancel button click', () => {
    const chooseScreen = new ChooseScreenPage(props);
    chooseScreen.getCancelButton().simulate('click');
    expect(props.cancel).toHaveBeenCalled();
  });

  it('chooses the correct screens on click', () => {
    const chooseScreen = new ChooseScreenPage(props);
    const ids = [...screens, ...windows].map(({id}) => id);
    chooseScreen.getListItems().forEach((listItem, index) => {
      listItem.simulate('click');
      expect(props.choose).toHaveBeenCalledWith(ids[index]);
    });
  });
});
