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

import {CellNode} from 'src/script/types/cellNode';
import {create} from 'zustand';

import {CellPagination} from '../cellPagination/cellPagination';

export type Status = 'idle' | 'loading' | 'fetchingMore' | 'success' | 'error';

interface FiltersState {
  tags: string[];
  setTags: (tags: string[]) => void;
  clearAll: () => void;
  getActiveCount: () => number;
}

interface CellsState {
  nodes: CellNode[];
  status: Status;
  pagination: CellPagination | null;
  error: Error | null;
  filters: FiltersState;
  setNodes: (nodes: CellNode[]) => void;
  setStatus: (status: Status) => void;
  setError: (error: Error | null) => void;
  setPagination: (pagination: CellPagination | null) => void;
  setPublicLink: (nodeId: string, data: CellNode['publicLink']) => void;
  removeNode: (nodeId: string) => void;
  clearAll: () => void;
}

export const useCellsStore = create<CellsState>((set, get) => ({
  nodes: [],
  status: 'idle',
  error: null,
  pagination: null,
  filters: {
    tags: [],
    setTags: tags =>
      set(state => ({
        filters: {
          ...state.filters,
          tags,
        },
      })),
    clearAll: () =>
      set(state => ({
        filters: {
          ...state.filters,
          tags: [],
        },
      })),
    getActiveCount: () => {
      const {filters} = get();
      let count = 0;

      if (filters.tags.length > 0) {
        count += 1;
      }

      return count;
    },
  },
  setNodes: nodes => set({nodes}),
  setStatus: status => set({status}),
  setError: error => set({error}),
  setPagination: pagination => set({pagination}),
  setPublicLink: (nodeId, updates) =>
    set(state => ({
      nodes: state.nodes.map(node => (node.id === nodeId ? {...node, publicLink: updates} : node)),
    })),
  removeNode: nodeId =>
    set(state => ({
      nodes: state.nodes.filter(node => node.id !== nodeId),
    })),
  clearAll: () => set({nodes: [], error: null}),
}));
