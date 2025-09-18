/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {CSSProperties} from 'react';

import {primaryStyles, secondaryStyles, textStyles} from './FileCardName.styles';

import {useFileCardContext} from '../common/FileCardContext/FileCardContext';

interface FileCardNameProps {
  /**
   * Number of lines to truncate (adds '...' at the end) the file name after
   * @default 1
   */
  truncateAfterLines?: number;
  variant?: 'primary' | 'secondary';
}

export const FileCardName = ({truncateAfterLines = 1, variant = 'primary'}: FileCardNameProps) => {
  const {name} = useFileCardContext();

  return (
    <p
      css={[textStyles, variant === 'primary' ? primaryStyles : secondaryStyles]}
      style={
        {
          '--truncate-after-lines': truncateAfterLines,
        } as CSSProperties
      }
    >
      {name}
    </p>
  );
};
