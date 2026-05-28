/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {OllamaModelInfo} from '../ollama/OllamaTypes';

/** Unsaved edits on the AI Preferences page. Cleared when the user navigates away or saves. */
interface AiSettingsDraftState {
  ollamaUrl: string;
  ollamaModel: string;
  manualContextSize: number;
  perMessageTokenCap: number;
  safetyMarginPct: number;
  jobDescription: string;
  subReportTemplate: string;
  finalReportTemplate: string;
  /** Cached model list with rich metadata. Persisted to IndexedDB so the dropdown survives reloads. */
  knownModels: OllamaModelInfo[];
  jiraEmail: string;
  jiraPat: string;
  isDirty: boolean;
  /** True once the first reset() has been called with real data from storage. Used to gate Monaco
   *  editor mounting — we never let editors mount with the empty-string placeholder values because
   *  @monaco-editor/react is not reliably controlled when value transitions from '' to content. */
  isReady: boolean;
  setField: <K extends keyof Omit<AiSettingsDraftState, 'setField' | 'reset' | 'isDirty' | 'isReady'>>(
    key: K,
    value: AiSettingsDraftState[K],
  ) => void;
  reset: (values: Omit<AiSettingsDraftState, 'setField' | 'reset' | 'isDirty' | 'isReady'>) => void;
}

/** Zustand store for unsaved AI Preferences page edits. */
export const useAiSettingsDraftStore = create<AiSettingsDraftState>()(set => ({
  ollamaUrl: '',
  ollamaModel: '',
  manualContextSize: 0,
  perMessageTokenCap: 0,
  safetyMarginPct: 0,
  jobDescription: '',
  subReportTemplate: '',
  finalReportTemplate: '',
  knownModels: [],
  jiraEmail: '',
  jiraPat: '',
  isDirty: false,
  isReady: false,
  setField: (key, value) => set(state => ({...state, [key]: value, isDirty: true})),
  reset: values => set({...values, isDirty: false, isReady: true}),
}));
