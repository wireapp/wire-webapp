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

interface Screen {
  id: string;
  thumbnail: HTMLCanvasElement;
}

interface ChooseScreenParams {
  cancel: () => void;
  choose: (screenId: string) => void;
  screens: ko.Observable<Screen[]>;
  windows: ko.Observable<Screen[]>;
}

ko.components.register('choose-screen', {
  template: `
    <div class="label-xs text-white" data-bind="text: t('callChooseSharedScreen')"></div>
    <div class="choose-screen-list" data-bind="foreach: {data: screens, as: 'screen', noChildContext: true}">
      <div class="choose-screen-list-item" data-uie-name="item-screen" data-bind="click: () => onChoose(screen.id)">
        <image class="choose-screen-list-image" data-bind="attr: {src: screen.thumbnail.toDataURL()}">
      </div>
    </div>
    <!-- ko if: windows().length > 0 -->
      <div class="label-xs text-white" data-bind="text: t('callChooseSharedWindow')"></div>
      <div class="choose-screen-list" data-bind="foreach: {data: windows, as: 'window', noChildContext: true}">
        <div class="choose-screen-list-item" data-uie-name="item-window" data-bind="click: () => onChoose(window.id)">
          <image class="choose-screen-list-image" data-bind="attr: {src: window.thumbnail.toDataURL()}">
        </div>
      </div>
    <!-- /ko -->
    <div id="choose-screen-controls" class="choose-screen-controls">
      <div class="choose-screen-controls-button button-round button-round-dark button-round-md icon-close"
           data-uie-name="do-choose-screen-cancel"
           data-bind="click: onCancel"></div>
    </div>
  `,
  viewModel: class ChooseScreen {
    onCancel: () => void;
    onChoose: (screenId: string) => void;
    screens: Screen[] | ko.Observable<Screen[]>;
    windows: Screen[] | ko.Observable<Screen[]>;

    constructor({cancel, choose, screens, windows}: ChooseScreenParams) {
      this.onCancel = cancel;
      this.onChoose = choose;
      this.screens = screens || [];
      this.windows = windows || [];
      document.addEventListener('keydown', this.closeOnEsc);
    }

    closeOnEsc = ({key}: KeyboardEvent): void => {
      if (key === 'Escape') {
        this.onCancel();
      }
    };

    dispose = (): void => {
      document.removeEventListener('keydown', this.closeOnEsc);
    };
  },
});
