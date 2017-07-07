/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.PromiseQueue = class PromiseQueue {
  static get CONFIG() {
    return {
      UNBLOCK_INTERVAL: 60 * 1000,
    };
  }

  /**
   * Construct a new Promise Queue.
   *
   * @param {Object} [options={}] - Initialization options
   * @param {string} options.name - Name for Promise queue
   * @param {boolean} [options.paused=false] - Initial paused state
   * @param {number} [options.timeout=PromiseQueue.CONFIG.UNBLOCK_INTERVAL] - Timeout in ms
   * @returns {PromiseQueue} Process Promises sequentially
   */
  constructor(options = {}) {
    const {name, paused = false, timeout = PromiseQueue.CONFIG.UNBLOCK_INTERVAL} = options;

    this.logger = new z.util.Logger((name ? `z.util.PromiseQueue (${name})` : 'z.util.PromiseQueue'), z.config.LOGGER.OPTIONS);

    this._blocked = false;
    this._interval = undefined;
    this._paused = paused;
    this._queue = [];
    this._timeout = timeout;
    return this;
  }

  /**
   * Executes first function in the queue.
   * @returns {undefined} No return value
   */
  execute() {
    if (this._paused || this._blocked) return;

    const queue_entry = this._queue[0];
    if (queue_entry) {
      this._blocked = true;
      this._clear_interval();

      this._interval = window.setInterval(() => {
        if (!this._paused) {
          this.logger.error('Promise queue failed, unblocking queue', this._queue);
          this.resume();
        }
      }, this._timeout);

      queue_entry.fn()
        .catch((error) => {
          queue_entry.resolve_fn = undefined;
          queue_entry.reject_fn(error);
        })
        .then((response) => {
          if (queue_entry.resolve_fn) {
            queue_entry.resolve_fn(response);
          }

          this._clear_interval();
          this._blocked = false;

          this._queue.shift();
          window.setTimeout(() => this.execute(), 0);
        });
    }
  }

  /**
   * Get the number of queued functions.
   * @returns {number} Number of queued functions
   */
  get_length() {
    return this._queue.length;
  }

  /**
   * Pause or resume the execution.
   * @param {boolean} [should_pause=true] - Pause queue
   * @returns {undefined} No return value
   */
  pause(should_pause = true) {
    this._paused = should_pause;
    if (this._paused === false) {
      this.execute();
    }
  }

  /**
   * Queued function is executed when queue is empty or previous functions are executed.
   * @param {Function} fn - Function to be executed in queue order
   * @returns {Promise} Resolves when function was executed
   */
  push(fn) {
    return new Promise((resolve, reject) => {
      const queue_entry = {
        fn: fn,
        reject_fn: reject,
        resolve_fn: resolve,
      };

      this._queue.push(queue_entry);
      this.execute();
    });
  }

  /**
   * Resume execution of queue.
   * @returns {undefined} No return value
   */
  resume() {
    this._clear_interval();
    this._blocked = false;
    this.pause(false);
  }

  _clear_interval() {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }
};
