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

import {ConsoleTransport} from './ConsoleTransport';
import {DatadogTransport} from './DatadogTransport';
import {FileTransport} from './FileTransport';

import {Transport, LogEntry, TransportConfig} from '../types';

/**
 * Transport Manager - manages all transports and routes logs
 */
export class TransportManager {
  private transports: Transport[] = [];
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    this.config = config;
    this.initializeTransports();
  }

  /**
   * Initialize all configured transports
   */
  private initializeTransports(): void {
    // Console transport (NEVER forwards to Datadog by default)
    if (this.config.console?.enabled) {
      this.transports.push(new ConsoleTransport(this.config.console));
    }

    // File transport
    if (this.config.file?.enabled) {
      this.transports.push(new FileTransport(this.config.file));
    }

    // Datadog transport (ONLY receives explicitly marked production logs)
    if (this.config.datadog?.enabled) {
      this.transports.push(new DatadogTransport(this.config.datadog));
    }
  }

  /**
   * Write log entry to all applicable transports
   */
  async write(entry: LogEntry): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const transport of this.transports) {
      if (transport.shouldWrite(entry)) {
        const result = transport.write(entry);
        if (result instanceof Promise) {
          promises.push(result);
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Get all transports
   */
  getTransports(): Transport[] {
    return [...this.transports];
  }

  /**
   * Add a custom transport
   */
  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  /**
   * Remove a transport
   */
  removeTransport(transport: Transport): void {
    const index = this.transports.indexOf(transport);
    if (index > -1) {
      this.transports.splice(index, 1);
    }
  }

  /**
   * Clear all transports
   */
  clearTransports(): void {
    this.transports = [];
  }

  /**
   * Check if Datadog transport is enabled and initialized
   */
  isDatadogEnabled(): boolean {
    const datadogTransport = this.transports.find(transport => transport instanceof DatadogTransport);
    return datadogTransport !== undefined && datadogTransport.isInitialized();
  }
}
