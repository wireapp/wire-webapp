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

import {useInView} from '../../../../../../hooks/useInView/useInView';
import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {AssetRepository} from '../../../../../../repositories/assets/assetRepository';
import {loadFileBuffer} from '../../../../../../util/util';

interface PdfAssetPreviewProps {
  resource: AssetRemoteData;
  label: string;
  tabIndex: number;
  onDownload: () => Promise<void> | void;
  loadAsset?: (resource: AssetRemoteData) => Promise<Blob | undefined>;
}

const keyLength = 32;
const maxPreviewSize = 1_048_576;
const pngSignature = '\x89PNG\r\n\x1a\n';
const jpegSignature = '\xff\xd8\xff';

const loadPreview = (resource: AssetRemoteData): Promise<Blob | undefined> => {
  return container.resolve(AssetRepository).load(resource);
};

export const PdfAssetPreview = ({
  resource,
  label,
  tabIndex,
  onDownload,
  loadAsset = loadPreview,
}: PdfAssetPreviewProps): ReactElement => {
  const {elementRef, hasBeenInView} = useInView<HTMLDivElement>();
  const [preview, setPreview] = useState<{resource: AssetRemoteData; url: string}>();
  const [failedUrl, setFailedUrl] = useState<string>();

  useEffect(() => {
    if (!hasBeenInView || resource.otrKey?.length !== keyLength || resource.sha256?.length !== keyLength) {
      return undefined;
    }

    let disposed = false;
    let objectUrl: string | undefined;
    const load = async (): Promise<void> => {
      try {
        const blob = await loadAsset(resource);
        if (disposed || blob === undefined || blob.size > maxPreviewSize) {
          return;
        }
        // Asset transport MIME describes ciphertext. Accept raster bytes only, never SVG/HTML.
        const bytes = new Uint8Array(await loadFileBuffer(blob.slice(0, pngSignature.length)));
        const matchesSignature = (signature: string): boolean => {
          return Array.from(signature).every((character, index) => {
            return bytes[index] === character.charCodeAt(0);
          });
        };
        const isPng = matchesSignature(pngSignature);
        const isJpeg = matchesSignature(jpegSignature);
        if (disposed || (!isPng && !isJpeg)) {
          return;
        }
        objectUrl = URL.createObjectURL(new Blob([blob], {type: isPng ? 'image/png' : 'image/jpeg'}));
        setPreview({resource, url: objectUrl});
      } catch {
        // Keep the ordinary file/download card when the preview is unavailable.
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
  }, [hasBeenInView, resource, loadAsset]);

  const url = preview?.resource === resource ? preview.url : undefined;
  return (
    <div ref={elementRef} css={{width: '100%'}}>
      {url !== undefined && url !== failedUrl && (
        <button
          type="button"
          aria-label={label}
          tabIndex={tabIndex}
          onClick={onDownload}
          css={{
            display: 'block',
            width: '100%',
            marginTop: '12px',
            padding: 0,
            aspectRatio: '16/9',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            backgroundColor: 'var(--foreground-fade-8)',
            cursor: 'pointer',
          }}
        >
          <img
            src={url}
            alt=""
            css={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top'}}
            onError={() => {
              return setFailedUrl(url);
            }}
          />
        </button>
      )}
    </div>
  );
};
