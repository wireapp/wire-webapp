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

import {forwardRef, ReactNode, useCallback, HTMLAttributes} from 'react';

interface DropFileAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onFileDropped: (files: File[]) => void;
}

const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();

export const DropFileArea = forwardRef<HTMLDivElement, DropFileAreaProps>(
  ({children, onFileDropped, ...props}, ref) => {
    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const {dataTransfer} = event;
        const eventDataTransfer: Partial<DataTransfer> = dataTransfer || {};
        const files = eventDataTransfer.files || new FileList();

        if (files.length > 0) {
          onFileDropped(Array.from(files));
        }
      },
      [onFileDropped],
    );

    return (
      <div {...props} ref={ref} onDrop={handleDrop} onDragOver={handleDragOver}>
        {children}
      </div>
    );
  },
);

DropFileArea.displayName = 'DropFileArea';
