/**
 * Presidio pattern definition for regex-based recognizers
 */
export interface PresidioPattern {
  name: string;
  regex: string;
  score: number;
}
/**
 * Presidio regex-based recognizer
 */
export interface PresidioRegexRecognizer {
  name: string;
  supported_language: string;
  patterns: PresidioPattern[];
  context?: string[];
  supported_entity: string;
}
/**
 * Presidio deny-list based recognizer
 */
export interface PresidioDenyListRecognizer {
  name: string;
  supported_language: string;
  deny_list: string[];
  supported_entity: string;
}
/**
 * Union type for all Presidio recognizers
 */
export type PresidioRecognizer = PresidioRegexRecognizer | PresidioDenyListRecognizer;
/**
 * Presidio recognizer collection (downloaded from Presidio repository)
 */
export interface PresidioRecognizerCollection {
  version: string;
  updated: string;
  recognizers: PresidioRecognizer[];
}
/**
 * Type guard to check if recognizer is regex-based
 */
export declare function isRegexRecognizer(recognizer: PresidioRecognizer): recognizer is PresidioRegexRecognizer;
/**
 * Type guard to check if recognizer is deny-list based
 */
export declare function isDenyListRecognizer(recognizer: PresidioRecognizer): recognizer is PresidioDenyListRecognizer;
//# sourceMappingURL=PresidioTypes.d.ts.map
