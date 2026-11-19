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

import {useEffect, useId, useRef, useState, type FunctionComponent, type ReactNode} from 'react';

import {
  actionButtonStyles,
  actionsStyles,
  contentStyles,
  headerStyles,
  loadingStyles,
  nameStyles,
  readerStyles,
} from './chatPdfPreviewModal.styles';

import {useApplicationContext} from '../../../../../../page/rootProvider';
import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import type {AssetRemoteData as AssetRemoteDataType} from '../../../../../../repositories/assets/assetRemoteData';
import {readPreviewBlob} from '../../../../../../repositories/assets/readPreviewBlob';
import {CloseIcon} from '../../../../../../uiKit/dataDisplay/icon/closeIcon';
import {DownloadIcon} from '../../../../../../uiKit/dataDisplay/icon/downloadIcon';
import {FullscreenModal} from '../../../../../fullscreenModal/fullscreenModal';

interface ChatPdfPreviewModalProps {
  id: string;
  fileName: string;
  resource: AssetRemoteDataType;
  isOpen: boolean;
  loadAsset: (resource: AssetRemoteDataType) => Promise<Blob | undefined>;
  onDownload: () => Promise<void> | void;
  onClose: () => void;
  renderPdf: (src: string) => ReactNode;
}

const pdfHeaderLength = 1024;
const pdfSignature = '%PDF-';

const createPreviewResource = (resource: AssetRemoteDataType): AssetRemoteData => {
  return new AssetRemoteData({
    ...resource.urlData,
    otrKey: resource.otrKey,
    sha256: resource.sha256,
  });
};

const hasPdfSignature = async (blob: Blob): Promise<boolean> => {
  if (blob.size === 0) {
    return false;
  }

  const header = await readPreviewBlob(blob.slice(0, pdfHeaderLength));
  return new TextDecoder().decode(header).includes(pdfSignature);
};

export const ChatPdfPreviewModal: FunctionComponent<ChatPdfPreviewModalProps> = ({
  id,
  fileName,
  resource,
  isOpen,
  loadAsset,
  onDownload,
  onClose,
  renderPdf,
}: ChatPdfPreviewModalProps) => {
  const {translate} = useApplicationContext();
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [hasLoadError, setHasLoadError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isDisposed = false;
    let isLoading = true;
    let objectUrl: string | undefined;
    const previewResource = createPreviewResource(resource);
    setPdfUrl(undefined);
    setHasLoadError(false);

    const loadPdf = async (): Promise<void> => {
      try {
        const blob = await loadAsset(previewResource);
        if (isDisposed) {
          return;
        }
        if (blob === undefined || !(await hasPdfSignature(blob)) || isDisposed) {
          setHasLoadError(true);
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([blob], {type: 'application/pdf'}));
        setPdfUrl(objectUrl);
      } catch {
        if (!isDisposed) {
          setHasLoadError(true);
        }
      } finally {
        isLoading = false;
      }
    };

    void loadPdf();

    return () => {
      isDisposed = true;
      if (isLoading) {
        previewResource.cancelDownload();
      }
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, loadAsset, resource]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    // The shared fullscreen shell does not expose an accessible-name prop.
    const observer = new MutationObserver(() => {
      const dialog = document.getElementById(id);
      if (dialog !== null) {
        dialog.setAttribute('aria-labelledby', titleId);
        closeButtonRef.current?.focus();
        observer.disconnect();
      }
    });
    observer.observe(document.body, {childList: true, subtree: true});
    const dialog = document.getElementById(id);
    if (dialog !== null) {
      dialog.setAttribute('aria-labelledby', titleId);
      closeButtonRef.current?.focus();
      observer.disconnect();
    }

    return () => {
      observer.disconnect();
    };
  }, [id, isOpen, titleId]);

  return (
    <FullscreenModal id={id} isOpen={isOpen} onClose={onClose}>
      {isOpen && (
        <div css={contentStyles}>
          <header css={headerStyles}>
            <h1 id={titleId} css={nameStyles}>
              {fileName}
            </h1>
            <div css={actionsStyles}>
              <button
                type="button"
                css={actionButtonStyles}
                aria-label={translate('conversationContextMenuDownload')}
                title={translate('conversationContextMenuDownload')}
                onClick={onDownload}
              >
                <DownloadIcon color="currentColor" />
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                css={actionButtonStyles}
                aria-label={translate('modalCloseButton')}
                title={translate('modalCloseButton')}
                onClick={onClose}
              >
                <CloseIcon color="currentColor" />
              </button>
            </div>
          </header>
          <div css={readerStyles} aria-labelledby={titleId}>
            {pdfUrl !== undefined && renderPdf(pdfUrl)}
            {pdfUrl === undefined && !hasLoadError && (
              <div css={loadingStyles} role="status" aria-live="polite">
                {translate('conversationAssetDownloading')}
              </div>
            )}
            {hasLoadError && (
              <div css={loadingStyles}>
                <p>{translate('pdfViewerErrorTitle')}</p>
                <p>{translate('pdfViewerErrorDescription')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </FullscreenModal>
  );
};
