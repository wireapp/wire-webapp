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

import {create} from 'zustand';

import {CellNode} from 'src/script/types/cellNode';

import {CellPagination} from '../cellPagination/cellPagination';

export type Status = 'idle' | 'loading' | 'fetchingMore' | 'success' | 'error';

interface CellsState {
  nodes: CellNode[];
  status: Status;
  pagination: CellPagination | null;
  error: Error | null;
  setNodes: (nodes: CellNode[]) => void;
  setStatus: (status: Status) => void;
  setError: (error: Error | null) => void;
  setPagination: (pagination: CellPagination | null) => void;
  setPublicLink: (nodeId: string, data: CellNode['publicLink']) => void;
  removeNode: (nodeId: string) => void;
  clearAll: () => void;
}

export const useCellsStore = create<CellsState>(set => {
  return {
    nodes: [],
    status: 'idle',
    error: null,
    pagination: null,
    setNodes: nodes => {
      return set({nodes});
    },
    setStatus: status => {
      return set({status});
    },
    setError: error => {
      return set({error});
    },
    setPagination: pagination => {
      return set({pagination});
    },
    setPublicLink: (nodeId, updates) => {
      return set(state => {
        return {
          nodes: state.nodes.map(node => {
            return node.id === nodeId ? {...node, publicLink: updates} : node;
          }),
        };
      });
    },
    removeNode: nodeId => {
      return set(state => {
        return {
          nodes: state.nodes.filter(node => {
            return node.id !== nodeId;
          }),
        };
      });
    },
    clearAll: () => {
      return set({nodes: [], error: null});
    },
  };
});
