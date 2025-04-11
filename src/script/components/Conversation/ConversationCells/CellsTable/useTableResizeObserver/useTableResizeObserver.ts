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

import {useEffect, useRef, useState, useCallback} from 'react';

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
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const columnObservers = useRef<Map<number, ResizeObserver>>(new Map());

  const handleColumnResize = useCallback((index: number, width: number) => {
    setColumnWidths(prev => {
      const updated = [...prev];
      updated[index] = width;
      return updated;
    });
  }, []);

  const columnRefCallback = useCallback(
    (index: number) => (element: HTMLTableHeaderCellElement | null) => {
      // Clean up previous observer if it exists
      const previousObserver = columnObservers.current.get(index);
      if (previousObserver) {
        previousObserver.disconnect();
        columnObservers.current.delete(index);
      }

      if (element) {
        const observer = new ResizeObserver(() => {
          if (files && files.length) {
            handleColumnResize(index, element.offsetWidth);
          }
        });
        observer.observe(element);
        columnObservers.current.set(index, observer);
      }
    },
    [files, handleColumnResize],
  );

  useEffect(() => {
    const updateHeight = () => {
      if (tableBodyRef.current && onUpdateBodyHeight) {
        onUpdateBodyHeight(tableBodyRef.current.clientHeight);
      }
    };
    updateHeight();
  }, [onUpdateBodyHeight]);

  useEffect(() => {
    onUpdateColumnWidths(columnWidths);
  }, [onUpdateColumnWidths, columnWidths]);

  useEffect(() => {
    return () => {
      // Clean up all observers on unmount
      columnObservers.current.forEach(observer => observer.disconnect());
      columnObservers.current.clear();
    };
  }, []);

  return {tableBodyRef, columnRefCallback};
};
