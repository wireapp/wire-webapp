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

import {Thumbnail} from 'react-pdf';

import {containerStyles, pageNumberStyle, thumbnailWrapperStyles} from './PdfPageThumbnail.styles';

import {PdfLoader} from '../../common/PdfLoader/PdfLoader';

interface PdfPageThumbnailProps {
  index: number;
  sidebarOpen: boolean;
  pageNumber: number;
  isActive: boolean;
  onClick: () => void;
}

export const PdfPageThumbnail = ({index, sidebarOpen, isActive, onClick}: PdfPageThumbnailProps) => {
  return (
    <div data-page={index + 1} css={containerStyles(sidebarOpen)}>
      <div css={thumbnailWrapperStyles(isActive)}>
        <Thumbnail onItemClick={onClick} pageNumber={index + 1} width={100} loading={<PdfLoader />} />
      </div>
      <div css={pageNumberStyle}>{index + 1}</div>
    </div>
  );
};
