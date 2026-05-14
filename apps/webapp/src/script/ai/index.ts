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

import type {ScanRunner} from './pipeline/ScanRunner';
import type {AiStorageRepository} from './storage/AiStorageRepository';

/** Context holding all AI feature dependencies. */
export interface AiContext {
  aiStorage: AiStorageRepository;
  scanRunner: ScanRunner;
}

/** Module-level singleton for AiContext. Initialized by bootstrapAi() in Chapter 14. */
let aiContext: AiContext | null = null;

/**
 * Set the module-level AiContext singleton. Called by bootstrapAi() in Chapter 14.
 * @param context - The AI context to store.
 */
export function setAiContext(context: AiContext): void {
  aiContext = context;
}

/**
 * Get the module-level AiContext singleton. Throws if not initialized.
 * @returns The AI context.
 */
export function useAi(): AiContext {
  if (!aiContext) {
    throw new Error('AiContext not initialized. Call bootstrapAi() at app start.');
  }
  return aiContext;
}
