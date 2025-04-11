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

import {useRef, useState, useEffect, useCallback} from 'react';

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

import {CellFile} from 'Components/CellsGlobalView/common/cellFile/cellFile';

interface UseTableResizeObserverProps {
  files: CellFile[];
  onUpdateBodyHeight: (height: number) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
}

export const useTableResizeObserver = ({
  files,
  onUpdateBodyHeight,
  onUpdateColumnWidths,
}: UseTableResizeObserverProps) => {
  // Create refs to keep track of table height and columns widths
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  // Array of refs for each column
  const columnRefs = useRef<HTMLTableHeaderCellElement[]>([]);

  const [widths, setWidths] = useState<number[]>([]);

  useEffect(() => {
    const updateHeight = () => {
      if (tableBodyRef.current && onUpdateBodyHeight) {
        onUpdateBodyHeight(tableBodyRef.current.clientHeight);
      }
    };
    updateHeight();

    // Set up ResizeObserver for each column
    const observers = columnRefs.current.map((ref: HTMLElement, index) => {
      const observer = new ResizeObserver(() => {
        if (files && files.length && ref) {
          setWidths(prev => {
            const updated = [...prev];
            updated[index] = ref.offsetWidth;
            return updated;
          });
        }
      });
      if (ref) {
        observer.observe(ref);
      }
      return observer;
    });

    return () => observers.forEach(observer => observer.disconnect());
  }, [files, onUpdateBodyHeight]);

  useEffect(() => {
    onUpdateColumnWidths(widths);
  }, [onUpdateColumnWidths, widths]);

  const callbackRef = useCallback((element: HTMLTableHeaderCellElement | null, index: number) => {
    if (element) {
      columnRefs.current[index] = element;
    }
  }, []);

  return {tableBodyRef, callbackRef};
};
