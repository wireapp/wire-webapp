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

import {useState, useCallback, useEffect, useRef} from 'react';

import {Document, Page, Thumbnail} from 'react-pdf';

interface PDFViewerProps {
  src?: string;
}

export const PDFViewer = ({src}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const lastNavigationMethod = useRef<'keyboard' | 'mouse' | null>(null);

  const onDocumentLoadSuccess = useCallback(({numPages}: {numPages: number}) => {
    setNumPages(numPages);
  }, []);

  const handleThumbnailClick = useCallback((pageNumber: number) => {
    lastNavigationMethod.current = 'mouse';
    setPageNumber(pageNumber);
  }, []);

  const scrollThumbnailIntoView = useCallback(() => {
    if (thumbnailsRef.current && lastNavigationMethod.current === 'keyboard') {
      const activeThumbnail = thumbnailsRef.current.querySelector(`[data-page="${pageNumber}"]`);
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({block: 'end'});
      }
    }
  }, [pageNumber]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && pageNumber < numPages) {
        lastNavigationMethod.current = 'keyboard';
        setPageNumber(prev => prev + 1);
      } else if (event.key === 'ArrowLeft' && pageNumber > 1) {
        lastNavigationMethod.current = 'keyboard';
        setPageNumber(prev => prev - 1);
      }
    },
    [pageNumber, numPages],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    scrollThumbnailIntoView();
    // Reset navigation method after scroll
    lastNavigationMethod.current = null;
  }, [pageNumber, scrollThumbnailIntoView]);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.1, 2.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  if (!src) {
    return null;
  }

  return (
    <div style={{height: 'calc(100% - 45px)', width: '100%'}}>
      <Document file={src} onLoadSuccess={onDocumentLoadSuccess}>
        {/* Thumbnails sidebar */}
        <div
          ref={thumbnailsRef}
          style={{
            width: '120px',
            overflowY: 'auto',
            borderRight: '1px solid #ccc',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px',
            height: 'calc(100% - 45px)',
          }}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div
              key={`thumbnail_${index + 1}`}
              data-page={index + 1}
              style={{
                cursor: 'pointer',
                border: pageNumber === index + 1 ? '2px solid #007bff' : '2px solid #ddd',
                padding: '2px',
                backgroundColor: pageNumber === index + 1 ? '#e6f2ff' : 'white',
                width: '100%',
                marginBottom: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{fontSize: '11px', color: '#666', marginBottom: '2px'}}>{index + 1}</div>
              <Thumbnail onItemClick={() => handleThumbnailClick(index + 1)} pageNumber={index + 1} width={100} />
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', height: '100%'}}>
          {/* Controls */}
          <div
            style={{
              padding: '8px',
              borderBottom: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              onClick={() => {
                lastNavigationMethod.current = 'mouse';
                setPageNumber(prev => Math.max(prev - 1, 1));
              }}
              disabled={pageNumber === 1}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: pageNumber === 1 ? 'not-allowed' : 'pointer',
                opacity: pageNumber === 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <button
              onClick={() => {
                lastNavigationMethod.current = 'mouse';
                setPageNumber(prev => Math.min(prev + 1, numPages));
              }}
              disabled={pageNumber === numPages}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: pageNumber === numPages ? 'not-allowed' : 'pointer',
                opacity: pageNumber === numPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
            <button
              onClick={zoomIn}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Zoom In
            </button>
            <button
              onClick={zoomOut}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Zoom Out
            </button>
            <span style={{marginLeft: 'auto'}}>
              Page {pageNumber} of {numPages}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Page pageNumber={pageNumber} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
          </div>
        </div>
      </Document>
    </div>
  );
};
