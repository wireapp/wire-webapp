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

import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {EventService} from 'Repositories/event/EventService';
import type {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {OllamaClient} from './ollama/OllamaClient';
import {ScanRunner} from './pipeline/ScanRunner';
import {PromptService} from './prompts/PromptService';
import {AiSettingsService} from './settings/AiSettingsService';
import {JiraStorageRepository} from './jira/JiraStorageRepository';
import {bootstrapJiraKeysStore} from './jira/useJiraKeysStore';
import {AiStorageRepository} from './storage/AiStorageRepository';
import type {SelfUserInfo} from './transcript/buildTranscript';

export interface AiContext {
  aiStorage: AiStorageRepository;
  jiraStorage: JiraStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  scanRunner: ScanRunner;
}

let _ctx: AiContext | null = null;

export const bootstrapAi = (
  db: DexieDatabase,
  conversationState: ConversationState,
  eventService: EventService,
  selfUser: SelfUserInfo,
): AiContext => {
  const aiStorage = new AiStorageRepository(db);
  const jiraStorage = new JiraStorageRepository(db);
  const aiSettings = new AiSettingsService(db);
  const prompts = new PromptService(db);
  const buildOllama = async () => {
    const url = await aiSettings.getOllamaUrl();
    const model = await aiSettings.getOllamaModel();
    return new OllamaClient(url, model);
  };
  const scanRunner = new ScanRunner({
    aiStorage,
    aiSettings,
    prompts,
    conversationState,
    eventService,
    buildOllama,
    selfUser,
  });
  _ctx = {aiStorage, jiraStorage, aiSettings, prompts, scanRunner};
  bootstrapJiraKeysStore(jiraStorage);
  return _ctx;
};

/** Returns true if bootstrapAi() has been called. Safe to call before bootstrapping. */
export const hasAi = (): boolean => _ctx !== null;

/** Getter for the module-level AiContext singleton. Throws if not yet bootstrapped. */
export const useAi = (): AiContext => {
  if (!_ctx) {
    throw new Error('AiContext not bootstrapped — call bootstrapAi() before reading.');
  }
  return _ctx;
};
