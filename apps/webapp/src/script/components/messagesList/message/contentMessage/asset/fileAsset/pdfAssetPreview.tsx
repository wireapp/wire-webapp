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

import {useEffect, useRef, useState, type ReactElement} from 'react';

import {
  closeButtonStyles,
  overlayStyles,
  previewImageStyles,
  previewScrollStyles,
  previewStatusStyles,
} from './pdfAssetPreview.styles';

import {useInView} from '../../../../../../hooks/useInView/useInView';
import type {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {readPreviewBlob} from '../../../../../../repositories/assets/readPreviewBlob';
import {CloseIcon} from '../../../../../../uiKit/dataDisplay/icon/closeIcon';
import {FileCardPreview} from '../../../../../fileCard/fileCardPreview/fileCardPreview';
import {FullscreenModal} from '../../../../../fullscreenModal/fullscreenModal';

interface PdfAssetPreviewProps {
  id: string;
  resource: AssetRemoteData;
  label: string;
  fileName: string;
  closeLabel: string;
  loadingLabel: string;
  errorLabel: string;
  isOpen: boolean;
  onOpenPreview: (trigger: HTMLElement) => void;
  onClose: () => void;
  tabIndex: number;
  loadAsset: (resource: AssetRemoteData) => Promise<Blob | undefined>;
}

const keyLength = 32;
const maxPreviewSize = 1_048_576;
const pngSignature = '\x89PNG\r\n\x1a\n';
const jpegSignature = '\xff\xd8\xff';

export const PdfAssetPreview = ({
  id,
  resource,
  label,
  fileName,
  closeLabel,
  loadingLabel,
  errorLabel,
  isOpen,
  onOpenPreview,
  onClose,
  tabIndex,
  loadAsset,
}: PdfAssetPreviewProps): ReactElement => {
  const {elementRef, hasBeenInView} = useInView<HTMLDivElement>();
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const [preview, setPreview] = useState<{resource: AssetRemoteData; url: string}>();
  const [failedUrl, setFailedUrl] = useState<string>();
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasBeenInView || isOpen) {
      setShouldLoadPreview(true);
    }
  }, [hasBeenInView, isOpen]);

  useEffect(() => {
    if (!shouldLoadPreview) {
      return undefined;
    }

    let disposed = false;
    let objectUrl: string | undefined;
    setPreviewLoadFailed(false);

    const load = async (): Promise<void> => {
      try {
        if (resource.otrKey?.length !== keyLength || resource.sha256?.length !== keyLength) {
          setPreviewLoadFailed(true);
          return;
        }

        const blob = await loadAsset(resource);
        if (disposed) {
          return;
        }
        if (blob === undefined || blob.size > maxPreviewSize) {
          setPreviewLoadFailed(true);
          return;
        }

        // Asset transport MIME describes ciphertext. Accept raster bytes only, never SVG/HTML.
        const bytes = new Uint8Array(await readPreviewBlob(blob.slice(0, pngSignature.length)));
        if (disposed) {
          return;
        }

        const matchesSignature = (signature: string): boolean => {
          return Array.from(signature).every((character, index) => {
            return bytes[index] === character.charCodeAt(0);
          });
        };
        const isPng = matchesSignature(pngSignature);
        const isJpeg = matchesSignature(jpegSignature);
        if (!isPng && !isJpeg) {
          setPreviewLoadFailed(true);
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([blob], {type: isPng ? 'image/png' : 'image/jpeg'}));
        setPreview({resource, url: objectUrl});
      } catch {
        if (!disposed) {
          setPreviewLoadFailed(true);
        }
      }
    };
    void load();

    return () => {
      disposed = true;
      resource.cancelDownload();
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [shouldLoadPreview, resource, loadAsset]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const attachDialogLabelAndFocus = (): boolean => {
      const dialog = document.getElementById(id);
      if (dialog === null) {
        return false;
      }
      dialog.setAttribute('aria-label', label);
      closeButtonRef.current?.focus();
      return true;
    };

    if (attachDialogLabelAndFocus()) {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      if (attachDialogLabelAndFocus()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, {childList: true, subtree: true});
    return () => {
      observer.disconnect();
    };
  }, [id, isOpen, label]);

  const url = preview?.resource === resource ? preview.url : undefined;
  const isPreviewUnavailable = previewLoadFailed || (url !== undefined && url === failedUrl);
  const onPreviewImageError = (): void => {
    if (url !== undefined) {
      setFailedUrl(url);
    }
  };

  return (
    <div ref={elementRef} css={{width: '100%'}}>
      {url !== undefined && url !== failedUrl && (
        <div css={{marginTop: '12px'}}>
          <FileCardPreview
            src={url}
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={id}
            tabIndex={tabIndex}
            onClick={event => {
              return onOpenPreview(event.currentTarget);
            }}
            onImageError={onPreviewImageError}
          />
        </div>
      )}
      {isOpen && (
        <FullscreenModal id={id} isOpen={isOpen} onClose={onClose}>
          <div css={overlayStyles}>
            <button
              ref={closeButtonRef}
              type="button"
              css={closeButtonStyles}
              aria-label={closeLabel}
              title={closeLabel}
              onClick={onClose}
            >
              <CloseIcon color="currentColor" />
            </button>
            <div css={previewScrollStyles}>
              {url !== undefined && !isPreviewUnavailable ? (
                <img src={url} alt={fileName} css={previewImageStyles} onError={onPreviewImageError} />
              ) : (
                <p css={previewStatusStyles} role={isPreviewUnavailable ? 'alert' : 'status'}>
                  {isPreviewUnavailable ? errorLabel : loadingLabel}
                </p>
              )}
            </div>
          </div>
        </FullscreenModal>
      )}
    </div>
  );
};
