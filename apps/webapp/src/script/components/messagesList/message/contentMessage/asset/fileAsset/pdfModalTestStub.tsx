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

import type {ReactElement} from 'react';

import type {ChatPdfModalProps} from './chatPdfModal';

export const PdfModalTestStub = ({
  isOpen,
  dialogId,
  onClose,
  onDownload,
  filePreviewUrl,
  fileName,
  fileExtension,
  senderName,
  timestamp,
  status,
  context,
  previewType,
}: ChatPdfModalProps): ReactElement | null => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      id={dialogId}
      aria-label={`${fileName}.${fileExtension}`}
      data-preview-url={filePreviewUrl}
      data-status={status}
      data-context={context}
      data-preview-type={previewType}
      data-sender={senderName}
      data-timestamp={timestamp}
    >
      <button type="button" onClick={onDownload}>
        Download
      </button>
      <button type="button" aria-label="Close PDF preview" onClick={onClose}>
        Close
      </button>
    </div>
  );
};
