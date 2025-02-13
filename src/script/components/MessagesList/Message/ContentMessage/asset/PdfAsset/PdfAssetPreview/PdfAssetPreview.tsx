/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Document, Page} from 'react-pdf';

import {useElementSize} from 'Hooks/useElementSize/useElementSize';

import {documentStyles, wrapperStyles} from './PdfAssetPreview.styles';

import {PdfAssetLoader} from '../common/PdfAssetLoader/PdfAssetLoader';
import {PdfAssetError} from '../PdfAssetError/PdfAssetError';

interface PdfAssetPreviewProps {
  url: string;
}

export const PdfAssetPreview = ({url}: PdfAssetPreviewProps) => {
  const {ref, width, height} = useElementSize();

  return (
    <div ref={ref} css={wrapperStyles}>
      <Document file={url} loading={<PdfAssetLoader />} noData={<PdfAssetError />} css={documentStyles}>
        <Page
          pageNumber={1}
          loading={<PdfAssetLoader />}
          width={width || undefined}
          height={height || undefined}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </Document>
    </div>
  );
};
