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

import React from 'react';
import {registerReactComponent} from '../util/ComponentUtil';

export interface CopyToClipboardProps {
  text: string;
}

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({text}) => {
  const onClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
    if (window.getSelection) {
      const selectionRange = document.createRange();
      selectionRange.selectNode(event.currentTarget);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(selectionRange);
    }
  };

  return (
    <div className="copy-to-clipboard" onClick={onClick}>
      {text}
    </div>
  );
};

export default CopyToClipboard;

registerReactComponent('copy-to-clipboard', {
  component: CopyToClipboard,
  template: '<div class="copy-to-clipboard" data-bind="react: {click: onClick, text: text()}"></div>',
});
