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

import type {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {DEFAULTS} from './defaults';

const KEYS = {
  OLLAMA_URL: 'ollama_url',
  OLLAMA_MODEL: 'ollama_model',
  MANUAL_CONTEXT_SIZE: 'manual_context_size',
  PER_MESSAGE_TOKEN_CAP: 'per_message_token_cap',
  SAFETY_MARGIN_PCT: 'safety_margin_pct',
  JOB_DESCRIPTION: 'job_description',
} as const;

export class AiSettingsService {
  constructor(private readonly db: DexieDatabase) {}

  private async getRaw<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db.ai_settings.get(key);
    if (!row) {
      return fallback;
    }
    return row.value as T;
  }

  private async setRaw(key: string, value: unknown): Promise<void> {
    const updated_at = new Date().toISOString();
    await this.db.ai_settings.put({key, value, updated_at});
  }

  /**
   * Returns the configured Ollama server URL, defaulting to `http://localhost:11434` when not set.
   */
  getOllamaUrl(): Promise<string> {
    return this.getRaw(KEYS.OLLAMA_URL, DEFAULTS.ollamaUrl);
  }

  /**
   * Persists the Ollama server URL to the ai_settings KV table.
   */
  setOllamaUrl(v: string): Promise<void> {
    return this.setRaw(KEYS.OLLAMA_URL, v);
  }

  /**
   * Returns the configured Ollama model, defaulting to `qwen3.6:35b` when not set.
   */
  getOllamaModel(): Promise<string> {
    return this.getRaw(KEYS.OLLAMA_MODEL, DEFAULTS.ollamaModel);
  }

  /**
   * Persists the Ollama model to the ai_settings KV table.
   */
  setOllamaModel(v: string): Promise<void> {
    return this.setRaw(KEYS.OLLAMA_MODEL, v);
  }

  /**
   * Returns the configured manual context size, defaulting to `32768` when not set.
   */
  getManualContextSize(): Promise<number> {
    return this.getRaw(KEYS.MANUAL_CONTEXT_SIZE, DEFAULTS.manualContextSize);
  }

  /**
   * Persists the manual context size to the ai_settings KV table.
   */
  setManualContextSize(v: number): Promise<void> {
    return this.setRaw(KEYS.MANUAL_CONTEXT_SIZE, v);
  }

  /**
   * Returns the configured per-message token cap, defaulting to `800` when not set.
   */
  getPerMessageTokenCap(): Promise<number> {
    return this.getRaw(KEYS.PER_MESSAGE_TOKEN_CAP, DEFAULTS.perMessageTokenCap);
  }

  /**
   * Persists the per-message token cap to the ai_settings KV table.
   */
  setPerMessageTokenCap(v: number): Promise<void> {
    return this.setRaw(KEYS.PER_MESSAGE_TOKEN_CAP, v);
  }

  /**
   * Returns the configured safety margin percentage, defaulting to `0.2` when not set.
   */
  getSafetyMarginPct(): Promise<number> {
    return this.getRaw(KEYS.SAFETY_MARGIN_PCT, DEFAULTS.safetyMarginPct);
  }

  /**
   * Persists the safety margin percentage to the ai_settings KV table.
   */
  setSafetyMarginPct(v: number): Promise<void> {
    return this.setRaw(KEYS.SAFETY_MARGIN_PCT, v);
  }

  /**
   * Returns the configured job description, defaulting to an empty string when not set.
   */
  getJobDescription(): Promise<string> {
    return this.getRaw(KEYS.JOB_DESCRIPTION, DEFAULTS.jobDescription);
  }

  /**
   * Persists the job description to the ai_settings KV table.
   */
  setJobDescription(v: string): Promise<void> {
    return this.setRaw(KEYS.JOB_DESCRIPTION, v);
  }

  /**
   * Reads all six AI settings in parallel. Missing keys resolve to their defaults without writing to the database.
   */
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
