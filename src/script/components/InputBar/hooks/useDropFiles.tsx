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

import {isDragEvent} from '../../../guards/Event';

const onDragOver = (event: Event) => event.preventDefault();

const useDropFiles = (selector: string, onFileDropped: (files: File[]) => void) => {
  useEffect(() => {
    const container = document.querySelector(selector);
    const handleDrop = (event: Event) => {
      event.preventDefault();

      if (isDragEvent(event)) {
        const {dataTransfer} = event;
        const eventDataTransfer: Partial<DataTransfer> = dataTransfer || {};
        const files = eventDataTransfer.files || new FileList();

        if (files.length > 0) {
          onFileDropped([files[0]]);
        }
      }
    };

    if (container) {
      container.addEventListener('drop', handleDrop);
      container.addEventListener('dragover', onDragOver);

      return () => {
        container.removeEventListener('drop', handleDrop);
        container.removeEventListener('dragover', onDragOver);
      };
    }

    return () => undefined;
  }, [onFileDropped, selector]);
};

export {useDropFiles};
