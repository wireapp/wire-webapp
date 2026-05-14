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

import {encode} from 'gpt-tokenizer';

/**
 * Tokenizes text using the gpt-tokenizer BPE encoder.
 * @param text The input text to tokenize.
 * @returns Array of token IDs produced by gpt-tokenizer's BPE encoder.
 * @note Results are approximate for non-GPT tokenizers (e.g., Qwen uses its own BPE vocabulary).
 * However, the approximation is acceptable given the 20% safety margin applied at the budget layer.
 */
export const tokenize = (text: string): number[] => encode(text);

/**
 * Counts the number of tokens in text using gpt-tokenizer.
 * @param text The input text to count tokens for.
 * @returns The number of tokens produced by gpt-tokenizer for the given text.
 * @note This is a convenience wrapper equivalent to `tokenize(text).length`.
 * Used by the truncation layer to measure per-line token cost.
 * @note Results are approximate for non-GPT tokenizers (e.g., Qwen).
 * The approximation is acceptable given the 20% safety margin applied at the budget layer.
 */
export const countTokens = (text: string): number => encode(text).length;
