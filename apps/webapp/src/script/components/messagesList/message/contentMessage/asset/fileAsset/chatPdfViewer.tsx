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

import {useEffect, useState, type FunctionComponent} from 'react';

import {errorStyles, viewerStyles} from './chatPdfViewer.styles';

import {useApplicationContext} from '../../../../../../page/rootProvider';

interface ChatPdfViewerProps {
  src: string;
  fileName: string;
}

// Requires CSP_EXTRA_FRAME_SRC=blob: in the experimental environment.
export const ChatPdfViewer: FunctionComponent<ChatPdfViewerProps> = ({src, fileName}: ChatPdfViewerProps) => {
  const {translate} = useApplicationContext();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleBlockedFrame = (event: SecurityPolicyViolationEvent): void => {
      if (
        event.disposition === 'enforce' &&
        event.effectiveDirective === 'frame-src' &&
        (event.blockedURI === src || event.blockedURI === 'blob')
      ) {
        setHasError(true);
      }
    };
    document.addEventListener('securitypolicyviolation', handleBlockedFrame);
    return () => {
      document.removeEventListener('securitypolicyviolation', handleBlockedFrame);
    };
  }, [src]);

  if (hasError) {
    return (
      <div css={errorStyles} role="alert">
        <p>{translate('pdfViewerErrorTitle')}</p>
        <p>{translate('pdfViewerErrorDescription')}</p>
      </div>
    );
  }

  return <iframe src={src} title={fileName} css={viewerStyles} referrerPolicy="no-referrer" />;
};
