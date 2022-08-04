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

const useDropFiles = (selector: string, onDropOrPastedFile: (files: File[]) => void) => {
  useEffect(() => {
    const container = document.querySelector(selector);

    const onDragOver = (event: Event) => event.preventDefault();

    const onDropFiles = (event: Event) => {
      event.preventDefault();

      const {dataTransfer} = event as DragEvent;
      const eventDataTransfer = dataTransfer || {};
      const files = (eventDataTransfer as DataTransfer).files || new FileList();

      if (files.length > 0) {
        onDropOrPastedFile([files[0]]);
      }
    };

    if (container) {
      container.addEventListener('drop', onDropFiles);
      container.addEventListener('dragover', onDragOver);

      return () => {
        container.removeEventListener('drop', onDropFiles);
        container.removeEventListener('dragover', onDragOver);
      };
    }

    return () => undefined;
  }, []);
};

export default useDropFiles;
