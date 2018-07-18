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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.CopyToClipboard = class CopyToClipboard {
  constructor({text, trigger}) {
    this.text = text;

    trigger(() => z.util.ClipboardUtil.copyText(document.getElementById('copy-to-clipboard__source').innerText));
  }

  onClick() {
    if (window.getSelection) {
      const selectionRange = document.createRange();
      selectionRange.selectNode(document.getElementById('copy-to-clipboard__source'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(selectionRange);
    }
  }
};

ko.components.register('copy-to-clipboard', {
  template: `
    <div id="copy-to-clipboard__source" data-bind="click: onClick, text: text()"></div>
  `,
  viewModel: z.components.CopyToClipboard,
});
