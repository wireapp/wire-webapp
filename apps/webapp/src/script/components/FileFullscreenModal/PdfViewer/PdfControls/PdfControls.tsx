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

import {
  ButtonsGroup,
  ChevronDownIcon,
  ChevronUpIcon,
  IconButton,
  SidebarActiveIcon,
  SidebarInactiveIcon,
} from '@wireapp/react-ui-kit';

import {ZoomInIcon, ZoomOutIcon} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {buttonStyles, pageNumberStyles, wrapperStyles} from './PdfControls.styles';

interface PdfControlsProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  currentPage: number;
  pagesCount: number;
}

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 2;

export const PdfControls = ({
  sidebarOpen,
  onToggleSidebar,
  scale,
  onZoomIn,
  onZoomOut,
  onPreviousPage,
  onNextPage,
  currentPage,
  pagesCount,
}: PdfControlsProps) => {
  const {translate} = useApplicationContext();

  return (
    <nav css={wrapperStyles}>
      <IconButton
        onClick={onToggleSidebar}
        aria-label={translate(sidebarOpen ? 'pdfViewerCloseSidebar' : 'pdfViewerOpenSidebar')}
        css={buttonStyles}
      >
        {sidebarOpen ? <SidebarActiveIcon /> : <SidebarInactiveIcon />}
      </IconButton>
      <span css={pageNumberStyles}>{translate('pdfViewerPageNumber', {page: currentPage, total: pagesCount})}</span>
      <ButtonsGroup>
        <ButtonsGroup.IconButton
          onClick={onPreviousPage}
          aria-label={translate('pdfViewerPreviousPage')}
          disabled={currentPage === 1}
          css={buttonStyles}
        >
          <ChevronUpIcon />
        </ButtonsGroup.IconButton>
        <ButtonsGroup.IconButton
          onClick={onNextPage}
          aria-label={translate('pdfViewerNextPage')}
          disabled={currentPage === pagesCount}
          css={buttonStyles}
        >
          <ChevronDownIcon />
        </ButtonsGroup.IconButton>
      </ButtonsGroup>
      <ButtonsGroup>
        <ButtonsGroup.IconButton
          onClick={onZoomOut}
          aria-label={translate('pdfViewerZoomOut')}
          disabled={scale === MIN_ZOOM_SCALE}
          css={buttonStyles}
        >
          <ZoomOutIcon />
        </ButtonsGroup.IconButton>
        <ButtonsGroup.IconButton
          onClick={onZoomIn}
          aria-label={translate('pdfViewerZoomIn')}
          disabled={scale === MAX_ZOOM_SCALE}
          css={buttonStyles}
        >
          <ZoomInIcon />
        </ButtonsGroup.IconButton>
      </ButtonsGroup>
    </nav>
  );
};
