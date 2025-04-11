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

import {useCallback, useState, useEffect} from 'react';

import {CellFile} from '../common/cellFile/cellFile';

interface UseCellsTableDimensionsProps {
  files: CellFile[];
}

export const useCellsTableDimensions = ({files}: UseCellsTableDimensionsProps) => {
  const [tableHeight, setTableHeight] = useState(-1);
  const [loaderHeight, setLoaderHeight] = useState<number | undefined>(-1);
  const [tableColumnsWidths, setTableColumnsWidth] = useState<number[]>([]);
  const [fixedColumnsWidths, setFixedColumnsWidth] = useState<number[] | undefined>([]);

  useEffect(() => {
    if (files) {
      setFixedColumnsWidth(undefined);
      setLoaderHeight(undefined);
    }
  }, [files]);

  const handleHeight = useCallback((height: number) => {
    setTableHeight(height);
  }, []);

  const handleWidths = useCallback((widths: number[]) => {
    setTableColumnsWidth(widths);
  }, []);

  const updateDimensions = useCallback(() => {
    setLoaderHeight(tableHeight);
    setFixedColumnsWidth(tableColumnsWidths);
  }, [tableHeight, tableColumnsWidths]);

  return {
    loaderHeight,
    fixedColumnsWidths,
    handleHeight,
    handleWidths,
    updateDimensions,
  };
};
