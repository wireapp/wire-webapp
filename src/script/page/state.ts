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

import create from 'zustand';
import {User} from '../entity/User';
import {PanelEntity, PanelState} from './RightSidebar/RightSidebar';

type RightSidebarParams = {
  entity: PanelEntity | null;
  showLikes?: boolean;
  highlighted?: User[];
};

type AppMainState = {
  rightSidebar: {
    clearHistory: () => void;
    entity: RightSidebarParams['entity'];
    goBack: (entity: RightSidebarParams['entity']) => void;
    goTo: (panel: PanelState, params: RightSidebarParams) => void;
    goToRoot: (entity: RightSidebarParams['entity']) => void;
    highlightedUsers: RightSidebarParams['highlighted'];
    history: PanelState[];
    showLikes: RightSidebarParams['showLikes'];
    updateEntity: (entity: RightSidebarParams['entity']) => void;
  };
};

const useAppMainState = create<AppMainState>((set, get) => ({
  rightSidebar: {
    clearHistory: () =>
      set(state => ({
        ...state,
        rightSidebar: {
          ...state.rightSidebar,
          currentState: null,
          entity: null,
          highlightedUsers: [],
          history: [],
          showLikes: false,
        },
      })),
    entity: null,
    goBack: (entity: RightSidebarParams['entity']) =>
      set(state => ({
        ...state,
        rightSidebar: {...state.rightSidebar, entity, history: state.rightSidebar.history.slice(0, -1)},
      })),
    goTo: (panel: PanelState, params: RightSidebarParams) =>
      set(state => ({
        ...state,
        rightSidebar: {
          ...state.rightSidebar,
          entity: params?.entity || null,
          highlightedUsers: params?.highlighted || [],
          history: [...state.rightSidebar.history, panel],
          showLikes: !!params?.showLikes,
        },
      })),
    goToRoot: (entity: RightSidebarParams['entity']) =>
      set(state => ({
        ...state,
        rightSidebar: {...state.rightSidebar, entity, history: [PanelState.CONVERSATION_DETAILS]},
      })),
    highlightedUsers: [],
    history: [],
    showLikes: false,
    updateEntity: (entity: RightSidebarParams['entity']) =>
      set(state => ({...state, rightSidebar: {...state.rightSidebar, entity}})),
  },
}));

export {useAppMainState};
