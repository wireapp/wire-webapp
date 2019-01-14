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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.ChooseScreen = class ChooseScreen {
  constructor(params) {
    this.on_cancel = params.cancel;
    this.on_choose = params.choose;
    this.screens = params.screens || [];
  }
};

ko.components.register('choose-screen', {
  template: `
    <div class="choose-screen-list" data-bind="foreach: screens">
      <div  class="choose-screen-list-item" data-bind="click: $parent.on_choose">
        <image class="choose-screen-list-image" data-bind="attr: {src: $data.thumbnail.toDataURL()}">
      </div>
    </div>
    <div class="label-xs text-white" data-bind="text: t('callChooseSharedScreen')"></div>
    <div id="choose-screen-controls" class="choose-screen-controls">
      <div class="choose-screen-controls-button button-round button-round-dark button-round-md icon-close"
           data-uie-name="do-choose-screen-cancel"
           data-bind="click: on_cancel"></div>
    </div>
  `,
  viewModel: z.components.ChooseScreen,
});
