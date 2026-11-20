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

import {useEffect, useState, type ReactElement} from 'react';

import {container} from 'tsyringe';

import {ChatPdfModalToken, type ChatPdfModalComponent} from './chatPdfModal';

import {useInView} from '../../../../../../hooks/useInView/useInView';
import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import type {AssetRemoteData as AssetRemoteDataType} from '../../../../../../repositories/assets/assetRemoteData';
import {readPreviewBlob} from '../../../../../../repositories/assets/readPreviewBlob';
import {FileCardPreview} from '../../../../../fileCard/fileCardPreview/fileCardPreview';

interface PdfAssetPreviewProps {
  FullscreenModalComponent?: ChatPdfModalComponent;
  id: string;
  thumbnailResource: AssetRemoteDataType;
  originalResource: AssetRemoteDataType;
  label: string;
  fileName: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
  isOpen: boolean;
  onOpenPreview: (trigger: HTMLElement) => void;
  onClose: () => void;
  onDownload: () => Promise<void> | void;
  tabIndex: number;
  loadAsset: (resource: AssetRemoteDataType) => Promise<Blob | undefined>;
}

const keyLength = 32;
const maxPreviewSize = 1_048_576;
const pdfHeaderLength = 1024;
const pngSignature = '\x89PNG\r\n\x1a\n';
const jpegSignature = '\xff\xd8\xff';
const pdfSignature = '%PDF-';

type PreviewStatus = 'loading' | 'unavailable' | 'success';

const createPreviewResource = (resource: AssetRemoteDataType): AssetRemoteData => {
  return new AssetRemoteData({
    ...resource.urlData,
    otrKey: resource.otrKey,
    sha256: resource.sha256,
  });
};

const matchesSignature = (bytes: Uint8Array, signature: string): boolean => {
  return Array.from(signature).every((character, index) => {
    return bytes[index] === character.charCodeAt(0);
  });
};

const hasPdfSignature = async (blob: Blob): Promise<boolean> => {
  if (blob.size === 0) {
    return false;
  }

  const header = new Uint8Array(await readPreviewBlob(blob.slice(0, pdfHeaderLength)));
  return new TextDecoder().decode(header).includes(pdfSignature);
};

export const PdfAssetPreview = ({
  FullscreenModalComponent,
  id,
  thumbnailResource,
  originalResource,
  label,
  fileName,
  fileExtension,
  senderName,
  timestamp,
  isOpen,
  onOpenPreview,
  onClose,
  onDownload,
  tabIndex,
  loadAsset,
}: PdfAssetPreviewProps): ReactElement => {
  const ModalComponent = FullscreenModalComponent ?? container.resolve<ChatPdfModalComponent>(ChatPdfModalToken);
  const {elementRef, hasBeenInView} = useInView<HTMLDivElement>();
  const [shouldLoadThumbnail, setShouldLoadThumbnail] = useState(false);
  const [thumbnail, setThumbnail] = useState<{resource: AssetRemoteDataType; url: string}>();
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string>();
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [pdfStatus, setPdfStatus] = useState<PreviewStatus>('loading');

  useEffect(() => {
    if (hasBeenInView || isOpen) {
      setShouldLoadThumbnail(true);
    }
  }, [hasBeenInView, isOpen]);

  useEffect(() => {
    if (!shouldLoadThumbnail) {
      return undefined;
    }

    let disposed = false;
    let objectUrl: string | undefined;
    setThumbnailLoadFailed(false);

    const load = async (): Promise<void> => {
      try {
        if (thumbnailResource.otrKey?.length !== keyLength || thumbnailResource.sha256?.length !== keyLength) {
          setThumbnailLoadFailed(true);
          return;
        }

        const blob = await loadAsset(thumbnailResource);
        if (disposed) {
          return;
        }
        if (blob === undefined || blob.size > maxPreviewSize) {
          setThumbnailLoadFailed(true);
          return;
        }

        // Asset transport MIME describes ciphertext. Accept raster bytes only, never SVG/HTML.
        const bytes = new Uint8Array(await readPreviewBlob(blob.slice(0, pngSignature.length)));
        if (disposed) {
          return;
        }

        const isPng = matchesSignature(bytes, pngSignature);
        const isJpeg = matchesSignature(bytes, jpegSignature);
        if (!isPng && !isJpeg) {
          setThumbnailLoadFailed(true);
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([blob], {type: isPng ? 'image/png' : 'image/jpeg'}));
        setThumbnail({resource: thumbnailResource, url: objectUrl});
      } catch {
        if (!disposed) {
          setThumbnailLoadFailed(true);
        }
      }
    };
    void load();

    return () => {
      disposed = true;
      thumbnailResource.cancelDownload();
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [shouldLoadThumbnail, thumbnailResource, loadAsset]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let disposed = false;
    let isLoading = true;
    let objectUrl: string | undefined;
    const pdfResource = createPreviewResource(originalResource);
    setPdfUrl(undefined);
    setPdfStatus('loading');

    const loadPdf = async (): Promise<void> => {
      try {
        if (pdfResource.otrKey?.length !== keyLength || pdfResource.sha256?.length !== keyLength) {
          setPdfStatus('unavailable');
          return;
        }

        const blob = await loadAsset(pdfResource);
        if (disposed) {
          return;
        }
        if (blob === undefined) {
          setPdfStatus('unavailable');
          return;
        }

        const isPdf = await hasPdfSignature(blob);
        if (disposed) {
          return;
        }
        if (!isPdf) {
          setPdfStatus('unavailable');
          return;
        }

        objectUrl = URL.createObjectURL(new Blob([blob], {type: 'application/pdf'}));
        setPdfUrl(objectUrl);
        setPdfStatus('success');
      } catch {
        if (!disposed) {
          setPdfStatus('unavailable');
        }
      } finally {
        isLoading = false;
      }
    };
    void loadPdf();

    return () => {
      disposed = true;
      if (isLoading) {
        pdfResource.cancelDownload();
      }
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, originalResource, loadAsset]);

  const thumbnailUrl = thumbnail?.resource === thumbnailResource ? thumbnail.url : undefined;
  const isThumbnailUnavailable =
    thumbnailLoadFailed || (thumbnailUrl !== undefined && thumbnailUrl === failedThumbnailUrl);
  const onThumbnailError = (): void => {
    if (thumbnailUrl !== undefined) {
      setFailedThumbnailUrl(thumbnailUrl);
    }
  };
  const closePreview = (): void => {
    setPdfUrl(undefined);
    setPdfStatus('loading');
    onClose();
  };

  return (
    <div ref={elementRef} css={{width: '100%'}}>
      {thumbnailUrl !== undefined && thumbnailUrl !== failedThumbnailUrl && !isThumbnailUnavailable && (
        <div css={{marginTop: '12px'}}>
          <FileCardPreview
            src={thumbnailUrl}
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={id}
            tabIndex={tabIndex}
            onClick={event => {
              return onOpenPreview(event.currentTarget);
            }}
            onImageError={onThumbnailError}
          />
        </div>
      )}
      <ModalComponent
        id={id}
        dialogId={id}
        isOpen={isOpen}
        onClose={closePreview}
        filePreviewUrl={pdfUrl}
        fileName={fileName}
        fileExtension={fileExtension}
        senderName={senderName}
        timestamp={timestamp}
        status={pdfStatus}
        previewType="pdf"
        context="chat"
        onDownload={onDownload}
      />
    </div>
  );
};
