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

import type {DexieDatabase} from 'Repositories/storage/dexieDatabase';

import type {OllamaModelInfo} from '../ollama/OllamaTypes';
import {DEFAULTS} from './defaults';

const KEYS = {
  OLLAMA_URL: 'ollama_url',
  OLLAMA_MODEL: 'ollama_model',
  MANUAL_CONTEXT_SIZE: 'manual_context_size',
  PER_MESSAGE_TOKEN_CAP: 'per_message_token_cap',
  SAFETY_MARGIN_PCT: 'safety_margin_pct',
  JOB_DESCRIPTION: 'job_description',
  KNOWN_MODELS: 'known_models',
  JIRA_EMAIL: 'jira_email',
  JIRA_PAT: 'jira_pat',
} as const;

/** Wraps the ai_settings KV Dexie table behind typed getters/setters. Reads return defaults if the key is missing. */
export class AiSettingsService {
  constructor(private readonly db: DexieDatabase) {}

  private get ai_settings() {
    return (this.db as unknown as {ai_settings: {get: (k: string) => Promise<{value: unknown} | undefined>; put: (row: {key: string; value: unknown; updated_at: string}) => Promise<unknown>}}).ai_settings;
  }

  private async getRaw<T>(key: string, fallback: T): Promise<T> {
    const row = await this.ai_settings.get(key);
    if (!row) {
      return fallback;
    }
    return row.value as T;
  }

  private async setRaw(key: string, value: unknown): Promise<void> {
    const updated_at = new Date().toISOString();
    await this.ai_settings.put({key, value, updated_at});
  }

  getOllamaUrl(): Promise<string> {
    return this.getRaw(KEYS.OLLAMA_URL, DEFAULTS.ollamaUrl);
  }

  setOllamaUrl(v: string): Promise<void> {
    return this.setRaw(KEYS.OLLAMA_URL, v);
  }

  getOllamaModel(): Promise<string> {
    return this.getRaw(KEYS.OLLAMA_MODEL, DEFAULTS.ollamaModel);
  }

  setOllamaModel(v: string): Promise<void> {
    return this.setRaw(KEYS.OLLAMA_MODEL, v);
  }

  getManualContextSize(): Promise<number> {
    return this.getRaw(KEYS.MANUAL_CONTEXT_SIZE, DEFAULTS.manualContextSize);
  }

  setManualContextSize(v: number): Promise<void> {
    return this.setRaw(KEYS.MANUAL_CONTEXT_SIZE, v);
  }

  getPerMessageTokenCap(): Promise<number> {
    return this.getRaw(KEYS.PER_MESSAGE_TOKEN_CAP, DEFAULTS.perMessageTokenCap);
  }

  setPerMessageTokenCap(v: number): Promise<void> {
    return this.setRaw(KEYS.PER_MESSAGE_TOKEN_CAP, v);
  }

  getSafetyMarginPct(): Promise<number> {
    return this.getRaw(KEYS.SAFETY_MARGIN_PCT, DEFAULTS.safetyMarginPct);
  }

  setSafetyMarginPct(v: number): Promise<void> {
    return this.setRaw(KEYS.SAFETY_MARGIN_PCT, v);
  }

  getJobDescription(): Promise<string> {
    return this.getRaw(KEYS.JOB_DESCRIPTION, DEFAULTS.jobDescription);
  }

  setJobDescription(v: string): Promise<void> {
    return this.setRaw(KEYS.JOB_DESCRIPTION, v);
  }

  /** Returns the cached list of models with rich metadata. Migrates old string[] format on read. */
  async getKnownModels(): Promise<OllamaModelInfo[]> {
    const raw = await this.getRaw<OllamaModelInfo[] | string[]>(KEYS.KNOWN_MODELS, []);
    if (raw.length > 0 && typeof raw[0] === 'string') {
      // Migrate from the old string[] format — synthesise minimal OllamaModelInfo objects.
      return (raw as string[]).map(name => ({
        name,
        sizeBytes: 0,
        parameterSize: '',
        quantization: '',
        contextLength: null,
        maxOutputTokens: null,
        supportsTools: null,
        supportsThinking: null,
      }));
    }
    return raw as OllamaModelInfo[];
  }

  /** Persists rich model metadata so the dropdown survives page reloads. */
  setKnownModels(v: OllamaModelInfo[]): Promise<void> {
    return this.setRaw(KEYS.KNOWN_MODELS, v);
  }

  getJiraEmail(): Promise<string> {
    return this.getRaw(KEYS.JIRA_EMAIL, '');
  }

  setJiraEmail(v: string): Promise<void> {
    return this.setRaw(KEYS.JIRA_EMAIL, v);
  }

  getJiraPat(): Promise<string> {
    return this.getRaw(KEYS.JIRA_PAT, '');
  }

  setJiraPat(v: string): Promise<void> {
    return this.setRaw(KEYS.JIRA_PAT, v);
  }

  /** Returns all settings at once, applying defaults for any missing keys. */
  async getAll(): Promise<{
    ollamaUrl: string;
    ollamaModel: string;
    manualContextSize: number;
    perMessageTokenCap: number;
    safetyMarginPct: number;
    jobDescription: string;
  }> {
    const [ollamaUrl, ollamaModel, manualContextSize, perMessageTokenCap, safetyMarginPct, jobDescription] =
      await Promise.all([
        this.getOllamaUrl(),
        this.getOllamaModel(),
        this.getManualContextSize(),
        this.getPerMessageTokenCap(),
        this.getSafetyMarginPct(),
        this.getJobDescription(),
      ]);
    return {ollamaUrl, ollamaModel, manualContextSize, perMessageTokenCap, safetyMarginPct, jobDescription};
  }
}
