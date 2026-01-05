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

import {convertPresidioRecognizers, filterByLanguage, filterByEntityTypes} from './PresidioConverter';
import {PresidioRecognizer, PresidioRecognizerCollection} from './PresidioTypes';

import {SanitizationRule} from '../types';

/**
 * Presidio loader configuration
 */
export interface PresidioLoaderConfig {
  /**
   * Language to filter recognizers by (e.g., 'en', 'de', 'all')
   */
  language?: string;

  /**
   * Specific entity types to load (if not provided, loads all)
   */
  entityTypes?: string[];

  /**
   * Whether to merge with existing rules or replace them
   */
  mergeWithExisting?: boolean;
}

/**
 * Presidio pattern loader class
 */
export class PresidioLoader {
  private recognizers: PresidioRecognizer[] = [];
  private version = 'unknown';
  private lastUpdated = 'unknown';

  /**
   * Load Presidio recognizers from JSON
   */
  loadFromJSON(json: PresidioRecognizerCollection): void {
    this.recognizers = json.recognizers;
    this.version = json.version;
    this.lastUpdated = json.updated;
  }

  /**
   * Load Presidio recognizers from a JSON string
   */
  loadFromString(jsonString: string): void {
    try {
      const collection: PresidioRecognizerCollection = JSON.parse(jsonString);
      this.loadFromJSON(collection);
    } catch (error) {
      throw new Error(`Failed to parse Presidio recognizers JSON: ${error}`);
    }
  }

  /**
   * Load Presidio recognizers from a URL (browser/Node.js compatible)
   */
  async loadFromURL(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      this.loadFromJSON(json);
    } catch (error) {
      throw new Error(`Failed to load Presidio recognizers from URL: ${error}`);
    }
  }

  /**
   * Convert loaded recognizers to SanitizationRules
   */
  toSanitizationRules(config: PresidioLoaderConfig = {}): SanitizationRule[] {
    let recognizers = this.recognizers;

    // Filter by language if specified
    if (config.language) {
      recognizers = filterByLanguage(recognizers, config.language);
    }

    // Filter by entity types if specified
    if (config.entityTypes && config.entityTypes.length > 0) {
      recognizers = filterByEntityTypes(recognizers, config.entityTypes);
    }

    return convertPresidioRecognizers(recognizers);
  }

  /**
   * Get metadata about loaded recognizers
   */
  getMetadata(): {
    version: string;
    lastUpdated: string;
    recognizerCount: number;
    entityTypes: string[];
    languages: string[];
  } {
    const entityTypes = new Set(this.recognizers.map(recognizer => recognizer.supported_entity));
    const languages = new Set(this.recognizers.map(recognizer => recognizer.supported_language));

    return {
      version: this.version,
      lastUpdated: this.lastUpdated,
      recognizerCount: this.recognizers.length,
      entityTypes: Array.from(entityTypes).sort(),
      languages: Array.from(languages).sort(),
    };
  }

  /**
   * Get all loaded recognizers
   */
  getRecognizers(): PresidioRecognizer[] {
    return [...this.recognizers];
  }

  /**
   * Clear all loaded recognizers
   */
  clear(): void {
    this.recognizers = [];
    this.version = 'unknown';
    this.lastUpdated = 'unknown';
  }
}

/**
 * Symbol key for storing Presidio loader on globalThis
 */
const PRESIDIO_LOADER_KEY = Symbol.for('@wireapp/logger:presidioLoader');

/**
 * Get or create the global Presidio loader
 * Shared across all contexts (Electron + Browser)
 */
export function getGlobalPresidioLoader(): PresidioLoader {
  // Check if loader already exists on globalThis
  const existingLoader = (globalThis as any)[PRESIDIO_LOADER_KEY] as PresidioLoader | undefined;

  if (existingLoader) {
    return existingLoader;
  }

  // Create new loader and store it on globalThis
  const newLoader = new PresidioLoader();
  (globalThis as any)[PRESIDIO_LOADER_KEY] = newLoader;
  return newLoader;
}

/**
 * Set the global Presidio loader (useful for testing)
 */
export function setGlobalPresidioLoader(loader: PresidioLoader): void {
  (globalThis as any)[PRESIDIO_LOADER_KEY] = loader;
}

/**
 * Helper function to create sanitization rules from Presidio JSON URL
 */
export async function loadPresidioRulesFromURL(
  url: string,
  config: PresidioLoaderConfig = {},
): Promise<SanitizationRule[]> {
  const loader = new PresidioLoader();
  await loader.loadFromURL(url);
  return loader.toSanitizationRules(config);
}

/**
 * Helper function to create sanitization rules from Presidio JSON string
 */
export function loadPresidioRulesFromString(jsonString: string, config: PresidioLoaderConfig = {}): SanitizationRule[] {
  const loader = new PresidioLoader();
  loader.loadFromString(jsonString);
  return loader.toSanitizationRules(config);
}
