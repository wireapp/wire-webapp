/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useEffect} from 'react';

export const useFilePaste = (onFilePasted: (files: FileList) => void) => {
  useEffect(() => {
    const handleFilePasting = (event: ClipboardEvent) => {
      if (event.clipboardData?.types.includes('text/plain')) {
        return;
      }
      // Avoid copying the filename into the input field
      event.preventDefault();
      const files = event.clipboardData?.files;
      if (files) {
        onFilePasted(files);
      }
    };
    document.addEventListener('paste', handleFilePasting);
    return () => document.removeEventListener('paste', handleFilePasting);
  }, [onFilePasted]);
};
