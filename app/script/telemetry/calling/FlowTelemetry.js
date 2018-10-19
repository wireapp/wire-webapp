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

'use strict';

window.z = window.z || {};
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

z.telemetry.calling.FlowTelemetry = class FlowTelemetry {
  /**
   * Construct new flow telemetry entity.
   *
   * @param {string} id - Flow ID
   * @param {string} remote_user_id - Remote user ID
   * @param {z.calling.entities.CallEntity} call_et - Call entity
   * @param {CallSetupTimings} timings - Timings of call setup steps
   */
  constructor(id, remote_user_id, call_et, timings) {
    this.id = id;
    this.remote_user_id = remote_user_id;
    this.call_et = call_et;

    const loggerId = this.id.substr(0, 8);
    const loggerTimestamp = new Date().getMilliseconds();
    const loggerName = `z.telemetry.calling.FlowTelemetry - ${loggerId} (${loggerTimestamp})`;
    this.logger = new z.util.Logger(loggerName, z.config.LOGGER.OPTIONS);
    this.is_answer = false;
    this.peer_connection = undefined;

    this.timings = $.extend(new z.telemetry.calling.CallSetupTimings(this.id), timings ? timings.get() : {});
  }

  //##############################################################################
  // External misc
  //##############################################################################

  /**
   * Create flow status report for automation.
   * @returns {Object} Report
   */
  create_automation_report() {
    const report = this.create_report();
    report.meta.remote_user_id = this.remote_user_id;
    return report;
  }

  /**
   * Create flow status report.
   * @param {Error} [passed_error] - Optional error to be added to report
   * @returns {Object} Report
   */
  create_report(passed_error) {
    const report = {
      meta: {
        browser_name: z.util.Environment.browser.name,
        browser_version: z.util.Environment.browser.version,
        flow_id: this.id,
        id: this.call_et.id,
        is_answer: this.is_answer,
        session_id: this.call_et.sessionId,
      },
      telemetry: {
        timings: this.get_timings(),
      },
    };

    if (this.peer_connection) {
      report.rtc_peer_connection = {
        ice_connection_state: this.peer_connection.iceConnectionState,
        ice_gathering_state: this.peer_connection.iceGatheringState,
        signaling_state: this.peer_connection.signalingState,
      };

      const isSignalingStateClosed = this.peer_connection.signalingState === z.calling.rtc.SIGNALING_STATE.CLOSED;
      if (!isSignalingStateClosed) {
        if (this.peer_connection.localDescription) {
          $.extend(report.rtc_peer_connection, {
            local_SDP: this.peer_connection.localDescription.sdp,
            local_SDP_type: this.peer_connection.localDescription.type,
          });
        }

        if (this.peer_connection.remoteDescription) {
          $.extend(report.rtc_peer_connection, {
            remote_SDP: this.peer_connection.remoteDescription.sdp,
            remote_SDP_type: this.peer_connection.remoteDescription.type,
          });
        }
      }
    }

    if (passed_error) {
      report.error = passed_error;
    }

    return report;
  }

  /**
   * Publish call report.
   * @returns {undefined} No return value
   */
  disconnected() {
    amplify.publish(z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, this.create_report());
  }

  /**
   * Set the PeerConnection on the telemetry.
   * @param {RTCPeerConnection} peer_connection - PeerConnection to be used for telemetry
   * @returns {undefined} No return value
   */
  set_peer_connection(peer_connection) {
    this.peer_connection = peer_connection;
    this.logger.debug('Set or updated PeerConnection for telemetry checks', this.peer_connection);
  }

  /**
   * Update 'is_answer' status of flow.
   * @param {boolean} is_answer - Is the flow an answer
   * @returns {undefined} No return value
   */
  update_is_answer(is_answer) {
    this.is_answer = is_answer;
    this.timings.is_answer = is_answer;
  }

  //##############################################################################
  // Timings
  //##############################################################################

  /**
   * Return the step timings object.
   * @returns {CallSetupTimings} Flow statistics
   */
  get_timings() {
    return this.timings.get();
  }

  /**
   * Time a call setup step.
   * @param {CallSetupSteps} step - Step to time
   * @returns {undefined} No return value
   */
  time_step(step) {
    this.timings.time_step(step);
  }

  //##############################################################################
  // Reporting & Logging
  //##############################################################################

  /**
   * Get full report.
   * @returns {Object} Full automation report
   */
  get_automation_report() {
    return {
      report: this.create_automation_report(),
    };
  }

  /**
   * Log the flow to the browser console.
   * @param {z.calling.entities.ParticipantEntity} participant_et - Call participant
   * @returns {undefined} No return value
   */
  log_status(participant_et) {
    this.logger.force_log(`-- ID: ${this.id}`);

    if (this.remote_user !== undefined) {
      this.logger.force_log(`-- Remote user: ${participant_et.user.name()} (${participant_et.user.id})`);
    }

    this.logger.force_log(`-- User is connected: ${participant_et.isConnected()}`);
    this.logger.force_log(`-- Flow is answer: ${this.is_answer}`);

    if (this.peer_connection) {
      this.logger.force_log(`-- ICE connection: ${this.peer_connection.iceConnectionState}`);
      this.logger.force_log(`-- ICE gathering: ${this.peer_connection.iceGatheringState}`);
    }
  }

  /**
   * Log call timings.
   * @returns {undefined} No return value
   */
  log_timings() {
    this.timings.log();
  }

  /**
   * Report an error to Raygun.
   *
   * @param {string} description - Error description
   * @param {Object} passed_error - Error passed into the report
   * @param {Object} payload - Additional payload for the custom data
   * @returns {undefined} No return value
   */
  report_error(description, passed_error, payload) {
    const custom_data = this.create_report();
    const raygun_error = new Error(description);

    if (passed_error) {
      custom_data.error = passed_error;
      raygun_error.stack = passed_error.stack;
    }

    if (payload) {
      custom_data.payload = payload;
    }

    this.logger.error(description, custom_data);
    Raygun.send(raygun_error, custom_data);
  }

  report_status() {
    const custom_data = this.create_report();
    this.logger.info('Created flow status for call failure report', custom_data);
    return custom_data;
  }

  report_timings() {
    const custom_data = this.timings.log();
    Raygun.send(new Error('Call setup step timings'), custom_data);
    this.logger.info(`Reported setup step timings of flow id '${this.id}' for call analysis`, custom_data);
  }
};
