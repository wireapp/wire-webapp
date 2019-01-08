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
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

z.telemetry.calling.CallSetupTimings = class CallSetupTimings {
  constructor(call_id) {
    this.get = this.get.bind(this);
    this.log = this.log.bind(this);
    this.call_id = call_id;

    this.logger = new z.util.Logger('z.telemetry.calling.CallSetupTimings', z.config.LOGGER.OPTIONS);

    this.is_answer = false;
    this.flowId = undefined;

    this.started = window.performance.now();
    this.stream_requested = 0;
    this.stream_received = 0;
    this.state_put = 0;
    this.flow_received = 0;
    this.peer_connection_created = 0;
    this.remote_sdp_received = 0;
    this.remote_sdp_set = 0;
    this.local_sdp_created = 0;
    this.local_sdp_send = 0;
    this.local_sdp_set = 0;
    this.ice_gathering_started = 0;
    this.ice_gathering_completed = 0;
    this.ice_connection_checking = 0;
    this.ice_connection_connected = 0;
    this.ice_connection_completed = 0;
  }

  get() {
    const timings = {};

    this._steps_order().forEach(step => {
      timings[step] = this[step];
    });

    return timings;
  }

  time_step(step) {
    if (this[step] === 0) {
      this[step] = window.parseInt(window.performance.now() - this.started);
    }
  }

  log() {
    this.logger.info(`Call setup duration for flow ID '${this.flowId}' of call ID '${this.call_id}'`);

    this._steps_order().forEach(step => {
      if (this.hasOwnProperty(step)) {
        const placeholder_key = Array.from(Math.max(26 - step.length, 1)).join(' ');
        const placeholder_value = Array.from(Math.max(6 - this[step].toString().length, 1)).join(' ');

        this.logger.info(`Step${placeholder_key}'${step}':${placeholder_value}${this[step]}ms`);
      }
    });
  }

  _steps_order() {
    return this.is_answer
      ? z.telemetry.calling.CallSetupStepsOrder.ANSWER
      : z.telemetry.calling.CallSetupStepsOrder.OFFER;
  }
};
