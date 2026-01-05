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

import {LogEntry} from '../types';

const DEFAULT_MAX_SIZE = 5000; // Keep last 5000 logs (~1-2MB)

/**
 * In-memory ring buffer for storing logs
 */
export class InMemoryLogBuffer {
  private buffer: LogEntry[] = [];
  private maxSize = DEFAULT_MAX_SIZE;

  /**
   * Add a log entry to the buffer
   */
  add(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift(); // Remove oldest
    }
  }

  /**
   * Export all logs as JSON string
   */
  export(): string {
    const JSON_INDENT = 2;
    return JSON.stringify(this.buffer, null, JSON_INDENT);
  }

  /**
   * Get all log entries
   */
  getAll(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Get the number of log entries in the buffer
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Clear all logs from the buffer
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get Datadog session ID for correlation
   */
  getDatadogSessionId(): string | null {
    // Extract from Datadog RUM for correlation
    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      return (window as any).DD_RUM.getInternalContext?.()?.session_id || null;
    }
    return null;
  }

  /**
   * Get Datadog RUM status
   */
  getDatadogRumEnabled(): boolean {
    return typeof window !== 'undefined' && (window as any).DD_RUM !== undefined;
  }

  /**
   * Set the maximum buffer size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    // Trim buffer if necessary
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get the maximum buffer size
   */
  getMaxSize(): number {
    return this.maxSize;
  }
}

/**
 * Symbol key for storing log buffer on globalThis
 */
const LOG_BUFFER_KEY = Symbol.for('@wireapp/logger:logBuffer');

/**
 * Get or create the global log buffer
 * Shared across all contexts (Electron + Browser)
 */
export function getGlobalLogBuffer(): InMemoryLogBuffer {
  // Check if buffer already exists on globalThis
  const existingBuffer = (globalThis as any)[LOG_BUFFER_KEY] as InMemoryLogBuffer | undefined;

  if (existingBuffer) {
    return existingBuffer;
  }

  // Create new buffer and store it on globalThis
  const newBuffer = new InMemoryLogBuffer();
  (globalThis as any)[LOG_BUFFER_KEY] = newBuffer;
  return newBuffer;
}

/**
 * Set the global log buffer (for testing)
 */
export function setGlobalLogBuffer(buffer: InMemoryLogBuffer): void {
  (globalThis as any)[LOG_BUFFER_KEY] = buffer;
}

/**
 * Clear the global log buffer
 */
export function clearGlobalLogBuffer(): void {
  const buffer = (globalThis as any)[LOG_BUFFER_KEY] as InMemoryLogBuffer | undefined;
  buffer?.clear();
}
