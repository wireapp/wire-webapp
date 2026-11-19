/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useState, type FunctionComponent} from 'react';

import {Document, Page} from 'react-pdf';

import {controlsStyles, pageStyles, pageStatusStyles, viewerStyles} from './chatPdfViewer.styles';

import {useElementSize} from '../../../../../../hooks/useElementSize/useElementSize';
import {useApplicationContext} from '../../../../../../page/rootProvider';

interface ChatPdfViewerProps {
  src: string;
}

// Keep untrusted PDFs from enabling PDF.js's JavaScript evaluator. This local
// reader relies on system-font fallback and does not load standard-font assets.
const pdfOptions = {isEvalSupported: false, useSystemFonts: true};

export const ChatPdfViewer: FunctionComponent<ChatPdfViewerProps> = ({src}: ChatPdfViewerProps) => {
  const {translate} = useApplicationContext();
  const [pagesCount, setPagesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageNaturalWidth, setPageNaturalWidth] = useState<number>();
  const {ref: viewerRef, width: viewerWidth} = useElementSize<HTMLDivElement>();
  const availableWidth = viewerWidth - 32;
  const pageWidth =
    pageNaturalWidth === undefined || availableWidth <= 0 ? undefined : Math.min(pageNaturalWidth, availableWidth);

  return (
    <div ref={viewerRef} css={viewerStyles}>
      <Document
        file={src}
        options={pdfOptions}
        onLoadSuccess={({numPages}) => {
          setPagesCount(numPages);
          setCurrentPage(1);
        }}
        loading={
          <div css={pageStatusStyles} role="status">
            {translate('conversationAssetDownloading')}
          </div>
        }
        error={
          <div css={pageStatusStyles}>
            <p>{translate('pdfViewerErrorTitle')}</p>
            <p>{translate('pdfViewerErrorDescription')}</p>
          </div>
        }
        noData={
          <div css={pageStatusStyles}>
            <p>{translate('pdfViewerErrorTitle')}</p>
            <p>{translate('pdfViewerErrorDescription')}</p>
          </div>
        }
      >
        <div css={pageStyles}>
          <Page
            pageNumber={currentPage}
            width={pageWidth}
            loading={null}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={page => {
              setPageNaturalWidth(page.getViewport({scale: 1}).width);
            }}
          />
        </div>
        <div css={controlsStyles}>
          <button
            type="button"
            aria-label={translate('pdfViewerPreviousPage')}
            disabled={currentPage <= 1}
            onClick={() => {
              return setCurrentPage(page => {
                return Math.max(1, page - 1);
              });
            }}
          >
            {translate('pdfViewerPreviousPage')}
          </button>
          <span aria-live="polite">{translate('pdfViewerPageNumber', {page: currentPage, total: pagesCount})}</span>
          <button
            type="button"
            aria-label={translate('pdfViewerNextPage')}
            disabled={currentPage >= pagesCount}
            onClick={() => {
              return setCurrentPage(page => {
                return Math.min(pagesCount, page + 1);
              });
            }}
          >
            {translate('pdfViewerNextPage')}
          </button>
        </div>
      </Document>
    </div>
  );
};
