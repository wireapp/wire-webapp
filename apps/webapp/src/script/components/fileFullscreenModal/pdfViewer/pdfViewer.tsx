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

import {useState} from 'react';

import {Document, Page} from 'react-pdf';

import {PdfLoader} from './common/pdfloader/pdfloader';
import {PdfControls} from './pdfcontrols/pdfcontrols';
import {PdfError} from './pdferror/pdferror';
import {PdfSidebar} from './pdfsidebar/pdfsidebar';
import {mainContentStyles, pageWrapperStyles, wrapperStyles} from './pdfviewer.styles';
import {usePageControls} from './usepagecontrols/usepagecontrols';
import {useZoomControls} from './usezoomcontrols/usezoomcontrols';

interface PDFViewerProps {
  src?: string;
}

export const PDFViewer = ({src}: PDFViewerProps) => {
  const [pagesCount, setPagesCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {scale, zoomIn, zoomOut} = useZoomControls();

  const {currentPage, thumbnailsRef, handleNextPage, handlePreviousPage, handlePageChange} = usePageControls();

  if (src === undefined || src.length === 0) {
    return <PdfError />;
  }

  return (
    <div css={wrapperStyles}>
      <Document
        file={src}
        onLoadSuccess={({numPages}) => setPagesCount(numPages)}
        loading={<PdfLoader />}
        error={<PdfError />}
        noData={<PdfError />}
      >
        <PdfSidebar
          ref={thumbnailsRef}
          sidebarOpen={sidebarOpen}
          pagesCount={pagesCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
        />

        <div css={mainContentStyles}>
          <div css={pageWrapperStyles}>
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={null}
            />
            <PdfControls
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(prev => !prev)}
              scale={scale}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              currentPage={currentPage}
              pagesCount={pagesCount}
            />
          </div>
        </div>
      </Document>
    </div>
  );
};
