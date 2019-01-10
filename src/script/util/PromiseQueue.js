/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

window.z = window.z || {};
window.z.util = z.util || {};

z.util.PromiseQueue = class PromiseQueue {
  static get CONFIG() {
    return {
      UNBLOCK_INTERVAL: z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE,
    };
  }

  /**
   * Construct a new Promise Queue.
   *
   * @param {Object} [options={}] - Initialization options
   * @param {boolean} [options.concurrent=1] - Concurrent promise execution
   * @param {string} options.name - Name for Promise queue
   * @param {boolean} [options.paused=false] - Initial paused state
   * @param {number} [options.timeout=PromiseQueue.CONFIG.UNBLOCK_INTERVAL] - Timeout in ms
   * @returns {PromiseQueue} Process Promises sequentially
   */
  constructor(options = {}) {
    const {concurrent = 1, name, paused = false, timeout = PromiseQueue.CONFIG.UNBLOCK_INTERVAL} = options;

    const loggerName = `z.util.PromiseQueue${name ? ` (${name})` : ''}`;
    this.logger = new z.util.Logger(loggerName, z.config.LOGGER.OPTIONS);

    this._blocked = false;
    this._concurrent = concurrent;
    this._current = 0;
    this._interval = undefined;
    this._paused = paused;
    this._queue = [];
    this._timeout = timeout;
  }

  /**
   * Executes first function in the queue.
   * @returns {undefined} No return value
   */
  execute() {
    if (this._paused || this._blocked) {
      return;
    }

    const queueEntry = this._queue.shift();
    if (queueEntry) {
      this._clearInterval();

      this._current = this._current + 1;
      if (this._current >= this._concurrent) {
        this._blocked = true;
      }

      this._interval = window.setInterval(() => {
        if (!this._paused) {
          const logObject = {pendingEntry: queueEntry, queueState: this._queue};
          this.logger.error('Promise queue failed, unblocking queue', logObject);
          this.resume();
        }
      }, this._timeout);

      queueEntry
        .fn()
        .catch(error => {
          queueEntry.resolveFn = undefined;
          queueEntry.rejectFn(error);
        })
        .then(response => {
          if (queueEntry.resolveFn) {
            queueEntry.resolveFn(response);
          }

          this._clearInterval();

          this._current = this._current - 1;
          if (this._current < this._concurrent) {
            this._blocked = false;
          }

          window.setTimeout(() => this.execute(), 0);
        });
    }
  }

  /**
   * Get the number of queued functions.
   * @returns {number} Number of queued functions
   */
  getLength() {
    return this._queue.length;
  }

  /**
   * Pause or resume the execution.
   * @param {boolean} [shouldPause=true] - Pause queue
   * @returns {z.util.PromiseQueue} PromiseQueue
   */
  pause(shouldPause = true) {
    this._paused = shouldPause;
    if (!this._paused) {
      this.execute();
    }

    return this;
  }

  /**
   * Queued function is executed when queue is empty or previous functions are executed.
   * @param {Function} fn - Function to be executed in queue order
   * @returns {Promise} Resolves when function was executed
   */
  push(fn) {
    return new Promise((resolve, reject) => {
      const queueEntry = {
        fn: fn,
        rejectFn: reject,
        resolveFn: resolve,
      };

      this._queue.push(queueEntry);
      this.execute();
    });
  }

  /**
   * Resume execution of queue.
   * @returns {undefined} No return value
   */
  resume() {
    this._clearInterval();
    this._blocked = false;
    this.pause(false);
  }

  /**
   * Queued function is executed.
   * @param {Function} fn - Function to be executed in queue order
   * @returns {Promise} Resolves when function was executed
   */
  unshift(fn) {
    return new Promise((resolve, reject) => {
      const queueEntry = {
        fn: fn,
        rejectFn: reject,
        resolveFn: resolve,
      };

      this._queue.unshift(queueEntry);
      this.execute();
    });
  }

  _clearInterval() {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }
};
