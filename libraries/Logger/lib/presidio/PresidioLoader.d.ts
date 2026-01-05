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
export declare class PresidioLoader {
  private recognizers;
  private version;
  private lastUpdated;
  /**
   * Load Presidio recognizers from JSON
   */
  loadFromJSON(json: PresidioRecognizerCollection): void;
  /**
   * Load Presidio recognizers from a JSON string
   */
  loadFromString(jsonString: string): void;
  /**
   * Load Presidio recognizers from a URL (browser/Node.js compatible)
   */
  loadFromURL(url: string): Promise<void>;
  /**
   * Convert loaded recognizers to SanitizationRules
   */
  toSanitizationRules(config?: PresidioLoaderConfig): SanitizationRule[];
  /**
   * Get metadata about loaded recognizers
   */
  getMetadata(): {
    version: string;
    lastUpdated: string;
    recognizerCount: number;
    entityTypes: string[];
    languages: string[];
  };
  /**
   * Get all loaded recognizers
   */
  getRecognizers(): PresidioRecognizer[];
  /**
   * Clear all loaded recognizers
   */
  clear(): void;
}
/**
 * Get or create the global Presidio loader
 * Shared across all contexts (Electron + Browser)
 */
export declare function getGlobalPresidioLoader(): PresidioLoader;
/**
 * Set the global Presidio loader (useful for testing)
 */
export declare function setGlobalPresidioLoader(loader: PresidioLoader): void;
/**
 * Helper function to create sanitization rules from Presidio JSON URL
 */
export declare function loadPresidioRulesFromURL(
  url: string,
  config?: PresidioLoaderConfig,
): Promise<SanitizationRule[]>;
/**
 * Helper function to create sanitization rules from Presidio JSON string
 */
export declare function loadPresidioRulesFromString(
  jsonString: string,
  config?: PresidioLoaderConfig,
): SanitizationRule[];
//# sourceMappingURL=PresidioLoader.d.ts.map
