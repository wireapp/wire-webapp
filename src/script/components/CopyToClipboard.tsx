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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';

import {handleKeyDown} from 'Util/KeyboardUtil';

export interface CopyToClipboardProps {
  text: string;
  className?: string;
  dataUieName?: string;
}

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({text, className = '', dataUieName = 'copy-to-clipboard'}) => {
  const onClick = ({currentTarget}: React.UIEvent) => {
    if (window.getSelection) {
      const selectionRange = document.createRange();
      selectionRange.selectNode(currentTarget);
      const selection = window.getSelection();

      if (selection) {
        selection.removeAllRanges();
        selection.addRange(selectionRange);
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={TabIndex.FOCUSABLE}
      data-uie-name={dataUieName}
      className={cx('copy-to-clipboard', className)}
      onClick={onClick}
      onKeyDown={event => handleKeyDown(event, () => onClick(event))}
    >
      {text}
    </div>
  );
};

export {CopyToClipboard};
