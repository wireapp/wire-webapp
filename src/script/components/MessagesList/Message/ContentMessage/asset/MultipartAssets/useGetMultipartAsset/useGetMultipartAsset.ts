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

import {useCallback, useEffect, useRef, useState} from 'react';

import {CellsRepository} from 'Repositories/cells/CellsRepository';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'retrying';

interface UseGetMultipartAssetPreviewProps {
  uuid: string;
  cellsRepository: CellsRepository;
  isEnabled: boolean;
  retryPreviewUntilSuccess?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Fetching and managing multipart asset previews with optional retry logic.
 *
 * This hook fetches an asset and looks for an image preview in its Previews array.
 *
 * When retryPreviewUntilSuccess is false, it returns the asset data immediately regardless of the preview state.
 *
 * When retryPreviewUntilSuccess is true, it will retry fetching the asset up to maxRetries times if the preview is still processing.
 * If maxRetries is reached while the preview is still processing, it returns the current state.
 *
 * The hook only returns a success state when the preview is ready and not processing anymore.
 */
export const useGetMultipartAsset = ({
  uuid,
  cellsRepository,
  isEnabled,
  retryPreviewUntilSuccess = false,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelay = DEFAULT_RETRY_DELAY,
}: UseGetMultipartAssetPreviewProps) => {
  const uuidRef = useRef(uuid);
  const [path, setPath] = useState<string | undefined>(undefined);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>('idle');

  const timeoutRef = useRef<number>();
  const isMounted = useRef(true);
  const attemptRef = useRef(1);
  const hasStartedFetchRef = useRef(false);

  if (uuidRef.current !== uuid) {
    uuidRef.current = uuid;
  }

  const fetchData = useCallback(async () => {
    if (!isMounted.current || status === 'success') {
      return;
    }

    try {
      setStatus('loading');
      const asset = await cellsRepository.getNode({uuid});

      if (!isMounted.current) {
        return;
      }

      const imagePreview = asset.Previews?.find(preview => preview?.ContentType?.startsWith('image/'));
      const pdfPreview = asset.Previews?.find(preview => preview?.ContentType?.startsWith('application/pdf'));

      const shouldReturnImmediately =
        !retryPreviewUntilSuccess || (!imagePreview && !pdfPreview) || (imagePreview?.Error && pdfPreview?.Error);

      if (shouldReturnImmediately) {
        setSrc(asset.PreSignedGET?.Url);
        setImagePreviewUrl(imagePreview?.PreSignedGET?.Url);
        setPdfPreviewUrl(pdfPreview?.PreSignedGET?.Url);
        setPath(asset.Path);
        setStatus('success');

        return;
      }

      const shouldRetry = (imagePreview?.Processing || pdfPreview?.Processing) && attemptRef.current < maxRetries;

      if (shouldRetry) {
        attemptRef.current += 1;
        setStatus('retrying');
        return;
      }

      setSrc(asset.PreSignedGET?.Url);
      setImagePreviewUrl(imagePreview?.PreSignedGET?.Url);
      setPdfPreviewUrl(pdfPreview?.PreSignedGET?.Url);
      setPath(asset.Path);
      setStatus('success');
    } catch (err) {
      if (!isMounted.current) {
        return;
      }
      setStatus('error');
    }
  }, [status, retryPreviewUntilSuccess, maxRetries, cellsRepository, uuid]);

  useEffect(() => {
    isMounted.current = true;
    attemptRef.current = 1;
    hasStartedFetchRef.current = false;

    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isEnabled || status === 'success' || hasStartedFetchRef.current) {
      return;
    }

    hasStartedFetchRef.current = true;
    void fetchData();
  }, [isEnabled, fetchData, status]);

  useEffect(() => {
    if (status !== 'retrying') {
      return undefined;
    }

    timeoutRef.current = window.setTimeout(() => {
      void fetchData();
    }, retryDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status, fetchData, retryDelay]);

  return {
    src,
    imagePreviewUrl,
    pdfPreviewUrl,
    isLoading: ['loading', 'retrying', 'idle'].includes(status),
    isError: status === 'error',
    path,
  };
};
