import {PresidioRecognizer} from './PresidioTypes';
import {SanitizationRule} from '../types';
/**
 * Convert a collection of Presidio recognizers to SanitizationRules
 */
export declare function convertPresidioRecognizers(recognizers: PresidioRecognizer[]): SanitizationRule[];
/**
 * Filter Presidio recognizers by language
 */
export declare function filterByLanguage(recognizers: PresidioRecognizer[], language: string): PresidioRecognizer[];
/**
 * Filter Presidio recognizers by entity types
 */
export declare function filterByEntityTypes(
  recognizers: PresidioRecognizer[],
  entityTypes: string[],
): PresidioRecognizer[];
//# sourceMappingURL=PresidioConverter.d.ts.map
