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

import {useEffect, useRef, useState} from 'react';

/**
 * It's used to detect if the user is dragging a file over the dropzone.
 * Instead of using status from useDropzone, we use the native drag and drop events, which are more reliable.
 */
export const useIsDragging = () => {
  const [isDragging, setIsDragging] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = wrapperRef.current;

    if (!element) {
      return undefined;
    }

    element.addEventListener('dragenter', () => setIsDragging(true));
    element.addEventListener('dragover', () => setIsDragging(true));
    element.addEventListener('dragleave', () => setIsDragging(false));

    return () => {
      element.removeEventListener('dragenter', () => setIsDragging(false));
      element.removeEventListener('dragover', () => setIsDragging(false));
      element.removeEventListener('dragleave', () => setIsDragging(false));
    };
  }, []);

  return {isDragging, wrapperRef};
};
