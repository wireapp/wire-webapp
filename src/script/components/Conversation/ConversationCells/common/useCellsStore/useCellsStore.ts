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

import {CellNode} from 'src/types/cellNode';

import {CellPagination} from '../cellPagination/cellPagination';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_PAGE_SIZE = 50;

interface CellsState {
  nodesByConversation: Record<string, CellNode[]>;
  paginationByConversation: Record<string, CellPagination | null>;
  status: Status;
  error: Error | null;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  setNodes: (params: {conversationId: string; nodes: CellNode[]}) => void;
  setPagination: (params: {conversationId: string; pagination: CellPagination | null}) => void;
  setStatus: (status: Status) => void;
  setError: (error: Error | null) => void;
  setPublicLink: (params: {conversationId: string; nodeId: string; data: CellNode['publicLink']}) => void;
  removeNode: (params: {conversationId: string; nodeId: string}) => void;
  clearAll: (params: {conversationId: string}) => void;
  getNodes: (params: {conversationId: string}) => CellNode[];
  getPagination: (params: {conversationId: string}) => CellPagination | null;
}

export const useCellsStore = create<CellsState>((set, get) => ({
  nodesByConversation: {},
  paginationByConversation: {},
  status: 'idle',
  error: null,
  pageSize: DEFAULT_PAGE_SIZE,
  setNodes: ({conversationId, nodes}) =>
    set(state => ({
      nodesByConversation: {
        ...state.nodesByConversation,
        [conversationId]: nodes,
      },
    })),
  setPageSize: pageSize => set({pageSize}),
  setPagination: ({conversationId, pagination}) =>
    set(state => ({
      paginationByConversation: {
        ...state.paginationByConversation,
        [conversationId]: pagination,
      },
    })),
  setStatus: status => set({status}),
  setError: error => set({error}),
  setPublicLink: ({conversationId, nodeId, data}) =>
    set(state => ({
      nodesByConversation: {
        ...state.nodesByConversation,
        [conversationId]:
          state.nodesByConversation[conversationId]?.map(node =>
            node.id === nodeId
              ? {
                  ...node,
                  publicLink: data,
                }
              : node,
          ) || [],
      },
    })),
  removeNode: ({conversationId, nodeId}) =>
    set(state => ({
      nodesByConversation: {
        ...state.nodesByConversation,
        [conversationId]: state.nodesByConversation[conversationId]?.filter(node => node.id !== nodeId) || [],
      },
    })),
  clearAll: ({conversationId}) => {
    const state = get();
    const updatedNodesByConversation = {...state.nodesByConversation};
    delete updatedNodesByConversation[conversationId];
    set({nodesByConversation: updatedNodesByConversation, status: 'idle', error: null});
  },
  getNodes: ({conversationId}) => {
    const state = get().nodesByConversation;
    return state[conversationId] || [];
  },
  getPagination: ({conversationId}) => {
    const state = get().paginationByConversation;
    return state[conversationId] || [];
  },
}));
