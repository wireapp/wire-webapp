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
export function isRegexRecognizer(recognizer: PresidioRecognizer): recognizer is PresidioRegexRecognizer {
  return 'patterns' in recognizer;
}

/**
 * Type guard to check if recognizer is deny-list based
 */
export function isDenyListRecognizer(recognizer: PresidioRecognizer): recognizer is PresidioDenyListRecognizer {
  return 'deny_list' in recognizer;
}
