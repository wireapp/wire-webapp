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

import logdown from 'logdown';

import * as fs from 'fs';
import * as path from 'path';

import {Transport, LogEntry, LogLevel, FileTransportConfig} from '../types';
import {isAllowedAVSLog} from '../utils/avsFilter';

// Internal logger for transport warnings (always enabled to catch I/O issues)
const logger = logdown('@wireapp/logger/FileTransport');
logger.state.isEnabled = true;

/**
 * File transport implementation with log rotation
 *
 * Security: Only writes production-safe logs (isProductionSafe: true) to files.
 * Development logs (logger.development.*) are never persisted to disk.
 */
export class FileTransport implements Transport {
  private config: FileTransportConfig;
  private currentSize = 0;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(config: FileTransportConfig) {
    this.config = config;
    this.initializeLogFile();
  }

  /**
   * Check if running in Node.js or Electron environment
   */
  private isNodeEnvironment(): boolean {
    return this.config.runtimeEnvironment.platform === 'node' || this.config.runtimeEnvironment.platform === 'electron';
  }

  /**
   * Initialize log file and directory
   */
  private initializeLogFile(): void {
    if (!this.isNodeEnvironment() || !this.config.enabled) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.config.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
      }

      // Get current file size if file exists
      if (fs.existsSync(this.config.path)) {
        const stats = fs.statSync(this.config.path);
        this.currentSize = stats.size;
      }
    } catch (error) {
      logger.warn('Failed to initialize log file:', error);
    }
  }

  /**
   * Check if this transport should write the log entry
   */
  shouldWrite(entry: LogEntry): boolean {
    // Only write production-safe logs to files
    // Development logs should only go to console, never to persistent storage
    if (
      !this.config.enabled ||
      !this.isNodeEnvironment() ||
      !entry.isProductionSafe ||
      entry.level < this.config.level
    ) {
      return false;
    }

    // Filter AVS logs (they are very verbose)
    if (entry.metadata.logger.includes('@wireapp/webapp/avs') && !isAllowedAVSLog(entry.message)) {
      return false;
    }

    return true;
  }

  /**
   * Write the log entry to file
   */
  async write(entry: LogEntry): Promise<void> {
    if (!this.isNodeEnvironment() || !this.shouldWrite(entry)) {
      return;
    }

    // Queue writes to prevent race conditions
    this.writeQueue = this.writeQueue.then(() => this.writeToFile(entry));
    return this.writeQueue;
  }

  /**
   * Write entry to file (internal)
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      // Check if rotation is needed
      if (this.currentSize >= this.config.maxSize) {
        await this.rotateLogFile();
      }

      // Format log entry
      const logLine = this.formatLogEntry(entry);
      const data = `${logLine}\n`;

      // Write to file
      await fs.promises.appendFile(this.config.path, data, 'utf8');
      this.currentSize += Buffer.byteLength(data, 'utf8');
    } catch (error) {
      logger.warn('Failed to write log:', error);
    }
  }

  /**
   * Format the log entry for file output
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp: entry.metadata.timestamp,
        level: LogLevel[entry.level],
        message: entry.message,
        context: entry.context,
        error: entry.error
          ? {
              message: entry.error.message,
              stack: entry.error.stack,
              name: entry.error.name,
            }
          : undefined,
        metadata: entry.metadata,
      });
    }

    // Text format
    const LEVEL_PAD = 5;
    const LOGGER_PAD = 20;
    const timestamp = entry.metadata.timestamp;
    const level = LogLevel[entry.level].padEnd(LEVEL_PAD);
    const logger = entry.metadata.logger.padEnd(LOGGER_PAD);

    let text = `[${timestamp}] [${level}] [${logger}] ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      text += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      text += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        text += `\n${entry.error.stack}`;
      }
    }

    return text;
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateLogFile(): Promise<void> {
    if (!this.isNodeEnvironment()) {
      return;
    }

    try {
      // Generate timestamp for rotated file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(this.config.path);
      const base = this.config.path.slice(0, -ext.length);
      const rotatedFile = `${base}.${timestamp}${ext}`;

      // Rename current file
      if (fs.existsSync(this.config.path)) {
        await fs.promises.rename(this.config.path, rotatedFile);
      }

      // Reset current size
      this.currentSize = 0;

      // Cleanup old log files
      await this.cleanupOldLogs();
    } catch (error) {
      logger.warn('Failed to rotate log file:', error);
    }
  }

  /**
   * Get all log files sorted by modification time
   */
  private async getLogFiles(): Promise<string[]> {
    if (!this.isNodeEnvironment()) {
      return [];
    }

    try {
      const dir = path.dirname(this.config.path);
      const base = path.basename(this.config.path);
      const ext = path.extname(base);
      const name = base.slice(0, -ext.length);

      // List all files in directory
      const files = await fs.promises.readdir(dir);

      // Filter log files (current + rotated)
      const logFiles = files
        .filter(file => file.startsWith(name) && file.endsWith(ext))
        .filter(file => file !== base) // Exclude current log file
        .map(file => path.join(dir, file));

      // Sort by modification time (oldest first)
      const filesWithStats = await Promise.all(
        logFiles.map(async file => ({
          file,
          mtime: (await fs.promises.stat(file)).mtime.getTime(),
        })),
      );

      return filesWithStats.sort((fileA, fileB) => fileA.mtime - fileB.mtime).map(fileInfo => fileInfo.file);
    } catch (error) {
      logger.warn('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * Clean up old log files beyond maxFiles limit
   */
  private async cleanupOldLogs(): Promise<void> {
    if (!this.isNodeEnvironment()) {
      return;
    }

    try {
      const logFiles = await this.getLogFiles();

      // Delete oldest files if we exceed maxFiles limit
      const filesToDelete = logFiles.slice(0, Math.max(0, logFiles.length - this.config.maxFiles + 1));

      for (const file of filesToDelete) {
        try {
          await fs.promises.unlink(file);
        } catch (error) {
          logger.warn(`Failed to delete log file ${file}:`, error);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Check if transport is initialized
   */
  isInitialized(): boolean {
    return this.isNodeEnvironment() && this.config.enabled;
  }

  /**
   * Get current log file size
   */
  getCurrentSize(): number {
    return this.currentSize;
  }

  /**
   * Flush pending writes (useful for testing)
   */
  async flush(): Promise<void> {
    return this.writeQueue;
  }
}
