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

import {CellsRepository} from 'src/script/cells/CellsRepository';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'retrying';

interface UseGetMultipartAssetPreviewProps {
  uuid: string;
  cellsRepository: CellsRepository;
  isEnabled: boolean;
  retryUntilSuccess?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_RETRY_DELAY = 500;

/**
 * Hook for fetching asset previews.
 * Retries when asset url is missing, waiting retryDelay ms between attempts.
 *
 * When enabled, fetches the asset and checks for PreSignedGET.Url.
 * If URL is missing and retries are enabled, schedules next attempt after retryDelay.
 * Stops retrying after maxRetries attempts or on success.
 */
export const useGetMultipartAssetPreview = ({
  uuid,
  cellsRepository,
  isEnabled,
  retryUntilSuccess = false,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelay = DEFAULT_RETRY_DELAY,
}: UseGetMultipartAssetPreviewProps) => {
  const uuidRef = useRef(uuid);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<number>();
  const isMounted = useRef(true);
  const attemptRef = useRef(1);
  const hasStartedFetchRef = useRef(false);

  if (uuidRef.current !== uuid) {
    uuidRef.current = uuid;
  }

  const handleError = useCallback((err: unknown) => {
    setStatus('error');
    setError(err instanceof Error ? err : new Error('Failed to fetch asset'));
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMounted.current || status === 'success') {
      return;
    }

    try {
      setStatus('loading');
      const asset = await cellsRepository.getFile({uuid});

      if (!isMounted.current) {
        return;
      }

      if (!asset.PreSignedGET?.Url) {
        if (retryUntilSuccess && attemptRef.current < maxRetries) {
          attemptRef.current += 1;
          setStatus('retrying');
          return;
        }
        handleError(new Error('No URL available'));
        return;
      }

      setSrc(asset.PreSignedGET.Url);
      setStatus('success');
      setError(null);
    } catch (err) {
      if (!isMounted.current) {
        return;
      }
      handleError(err);
    }
  }, [status, retryUntilSuccess, maxRetries, handleError, cellsRepository, uuid]);

  const refetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    attemptRef.current = 1;
    hasStartedFetchRef.current = false;
    setError(null);
    void fetchData();
  }, [fetchData]);

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
      return;
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
    status,
    error,
    refetch,
    retryCount: attemptRef.current - 1,
  };
};
