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

import {loadingStyles, wrapperStyles} from './FileCardLoading.styles';

interface FileCardLoadingProps {
  /**
   * Progress of the file card loading
   * @default 100
   */
  progress?: number;
}

export const FileCardLoading = ({progress = 100}: FileCardLoadingProps) => {
  return (
    <div css={wrapperStyles}>
      <div css={loadingStyles} style={{'--progress': `${progress}%`} as CSSProperties} />
    </div>
  );
};
