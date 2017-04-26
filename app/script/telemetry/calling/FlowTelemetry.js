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
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

z.telemetry.calling.FlowTelemetry = class FlowTelemetry {
  static get CONFIG() {
    return {
      MEDIA_CHECK_TIMEOUT: 5000,
      STATS_CHECK_INTERVAL: 2000,
      STATS_CHECK_TIMEOUT: 50,
    };
  }

  /**
   * Construct new flow telemetry entity.
   *
   * @param {string} id - Flow ID
   * @param {string} remote_user_id - Remote user ID
   * @param {z.calling.Call} call_et - Call entity
   * @param {z.telemetry.calling.CallSetupTimings} timings - Timings of call setup steps
   */
  constructor(id, remote_user_id, call_et, timings) {
    this.remote_user_id = remote_user_id;
    this.call_et = call_et;
    this.logger = new z.util.Logger(`z.telemetry.calling.FlowTelemetry (${id})`, z.config.LOGGER.OPTIONS);

    this.id = id;
    this.is_answer = false;
    this.peer_connection = undefined;

    this.timings = $.extend(new z.telemetry.calling.CallSetupTimings(this.id), timings ? timings.get() : {});
    this.statistics = new z.telemetry.calling.ConnectionStats();

    this.statistics_interval = undefined;
    this.stream_check_timeouts = [];
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
   * @param {Error} passed_error - Optional error to be added to report
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
        session_id: this.call_et.session_id,
      },
      telemetry: {
        statistics: this.get_statistics(),
        timings: this.get_timings(),
      },
    };

    if (this.peer_connection) {
      report.rtc_peer_connection = {
        ice_connection_state: this.peer_connection.iceConnectionState,
        ice_gathering_state: this.peer_connection.iceGatheringState,
        signaling_state: this.peer_connection.signalingState,
      };

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

    if (passed_error) {
      report.error = passed_error;
    }

    return report;
  }

  /**
   * Check stream for flowing bytes.
   *
   * @param {z.media.MediaType} media_type - Media type of stream
   * @param {number} [attempt=1] - Attempt of stream check
   * @returns {undefined} No return value
   */
  check_stream(media_type, attempt = 1) {
    if (this.statistics.hasOwnProperty(media_type)) {
      const stats = this.statistics[media_type];

      const seconds = (attempt * FlowTelemetry.CONFIG.MEDIA_CHECK_TIMEOUT) / 1000;
      if (stats.bytes_received === 0 && stats.bytes_sent === 0) {
        return this.logger.warn(`No '${media_type}' flowing in either direction on stream after ${seconds} seconds`);
      }

      if (stats.bytes_received === 0) {
        return this.logger.warn(`No incoming '${media_type}' received on stream after ${seconds} seconds`);
      }

      if (stats.bytes_sent === 0) {
        return this.logger.warn(`No outgoing '${media_type}' sent on stream after ${seconds} seconds`);
      }

      return this.logger.debug(`Stream has '${media_type}' flowing properly both ways`);
    }

    if (this.is_answer) {
      this.logger.info(`Check '${media_type}' statistics on stream delayed as we created this flow`);

      const stream_check_timeout = window.setTimeout(() => {
        this.check_stream(media_type, attempt++);
      },
      FlowTelemetry.CONFIG.MEDIA_CHECK_TIMEOUT);

      this.stream_check_timeouts.push(stream_check_timeout);
      return;
    }

    this.logger.error(`Failed to check '${media_type}' statistics on stream`);
  }

  /**
   * Schedule check of stream activity.
   * @param {z.media.MediaType} media_type - Type of checks to schedule
   * @returns {undefined} No return value
   */
  schedule_check(media_type) {
    const stream_check_timeout = window.setTimeout(() => {
      this.check_stream(z.media.MediaType.AUDIO);
      if (media_type === z.media.MediaType.VIDEO) {
        this.check_stream(z.media.MediaType.VIDEO);
      }
    },
    FlowTelemetry.CONFIG.MEDIA_CHECK_TIMEOUT);

    this.stream_check_timeouts.push(stream_check_timeout);
  }

  /**
   * Set the PeerConnection on the telemetry.
   * @param {RTCPeerConnection} peer_connection - PeerConnection to be used for telemetry
   * @returns {undefined} No return value
   */
  set_peer_connection(peer_connection) {
    this.peer_connection = peer_connection;
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
  // Statistics
  //##############################################################################

  /**
   * Flow connected.
   * @returns {undefined} No return value
   */
  connected() {
    this.statistics.connected = Date.now();
  }

  /**
   * Return the statistics object.
   * @returns {z.telemetry.calling.ConnectionStats} Flow statistics
   */
  get_statistics() {
    return this.statistics;
  }

  /**
   * Update statics for the last time and then reset them and the polling interval.
   * @returns {undefined} No return value
   */
  reset_statistics() {
    if (this.statistics_interval) {
      this._clear_statistics_interval();
      this._clear_stream_check_timeouts();

      this._update_statistics()
      .then(() => {
        this.logger.info('Network stats updated for the last time', this.statistics);
        amplify.publish(z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, this.create_report());
        this.statistics = {};
      });
    }
  }

  /**
   * Start statistics polling.
   * @returns {undefined} No return value
   */
  start_statistics() {
    if (!this.statistics_interval) {
      // Track call stats
      this.time_step(z.telemetry.calling.CallSetupSteps.ICE_CONNECTION_CONNECTED);
      $.extend(this.statistics, new z.telemetry.calling.ConnectionStats());
      this.connected();

      // Report calling stats within specified interval
      const stream_check_timeout = window.setTimeout(() => {
        this._update_statistics()
        .then(() => {
          this.logger.info('Network stats updated for the first time', this.statistics);
        })
        .catch((error) => {
          this.logger.warn(`Failed to update flow networks stats: ${error.message}`);
        });
      },
      FlowTelemetry.CONFIG.STATS_CHECK_TIMEOUT);

      this.stream_check_timeouts.push(stream_check_timeout);

      this.statistics_interval = window.setInterval(() => {
        this._update_statistics()
        .catch((error) => {
          this.logger.warn(`Networks stats not updated: ${error.message}`);
        });
      },
      FlowTelemetry.CONFIG.STATS_CHECK_INTERVAL);
    }
  }

  /**
   * Clear the statistics interval.
   * @private
   * @returns {undefined} No return value
   */
  _clear_statistics_interval() {
    if (this.statistics_interval) {
      window.clearInterval(this.statistics_interval);
      this.statistics_interval = undefined;
    }
  }

  /**
   * Clear the stream check timeouts.
   * @private
   * @returns {undefined} No return value
   */
  _clear_stream_check_timeouts() {
    if (this.stream_check_timeouts.length) {
      this.stream_check_timeouts.forEach(function(stream_check_timeout) {
        window.clearTimeout(stream_check_timeout);
      });

      this.stream_check_timeouts = [];
    }
  }

  /**
   * Get current statistics from PeerConnection.
   * @private
   * @returns {Promise} Resolves when stats are returned
   */
  _update_statistics() {
    return this.peer_connection.getStats(null)
    .then((rtc_stats_report) => {
      let connection_stats = new z.telemetry.calling.ConnectionStats();

      rtc_stats_report.forEach((report) => {
        switch (report.type) {
          case z.calling.rtc.STATS_TYPE.CANDIDATE_PAIR:
            return connection_stats = this._update_from_candidate_pair(report, rtc_stats_report, connection_stats);
          case z.calling.rtc.STATS_TYPE.GOOGLE_CANDIDATE_PAIR:
            connection_stats = this._update_peer_connection_bytes(report, connection_stats);
            return connection_stats = this._update_from_google_candidate_pair(report, rtc_stats_report, connection_stats);
          case z.calling.rtc.STATS_TYPE.INBOUND_RTP:
            connection_stats = this._update_peer_connection_bytes(report, connection_stats);
            return connection_stats = this._update_from_inbound_rtp(report, connection_stats);
          case z.calling.rtc.STATS_TYPE.OUTBOUND_RTP:
            connection_stats = this._update_peer_connection_bytes(report, connection_stats);
            return connection_stats = this._update_from_outbound_rtp(report, connection_stats);
          case z.calling.rtc.STATS_TYPE.SSRC:
            return connection_stats = this._update_from_ssrc(report, connection_stats);
          default:
            this.logger.log(this.logger.levels.OFF, `Unhandled stats report type '${report.type}'`, report);
        }
      });

      const _calc_rate = (key, timestamp, type) => {
        const bytes = (connection_stats[key][type] - this.statistics[key][type]);
        const time_span = (connection_stats.timestamp - timestamp);
        return window.parseInt((1000.0 * bytes) / time_span, 10);
      };

      // Calculate bit rate since last update
      for (const key in connection_stats) {
        if (connection_stats.hasOwnProperty(key)) {
          const value = connection_stats[key];
          if (_.isObject(value)) {
            connection_stats[key].bit_rate_mean_received = _calc_rate(key, this.statistics.connected, 'bytes_received');
            connection_stats[key].bit_rate_mean_sent = _calc_rate(key, this.statistics.connected, 'bytes_sent');
            connection_stats[key].bit_rate_current_received = _calc_rate(key, this.statistics.timestamp, 'bytes_received');
            connection_stats[key].bit_rate_current_sent = _calc_rate(key, this.statistics.timestamp, 'bytes_sent');
          }
        }
      }

      return $.extend(this.statistics, connection_stats);
    })
    .catch((error) => {
      this.logger.warn('Update of network stats for flow failed', error);
    });
  }

  /**
   * Update from z.calling.rtc.STATS_TYPE.CANDIDATE_PAIR report.
   *
   * @param {Object} report - z.calling.rtc.STATS_TYPE.CANDIDATE_PAIR report
   * @param {RTCStatsReport} rtc_stats_report - Statistics report from PeerConnection
   * @param {z.telemetry.calling.ConnectionStats} connection_stats - Parsed flow statistics
   * @returns {z.telemetry.calling.ConnectionStats} updated_stats
   */
  _update_from_candidate_pair(report, rtc_stats_report, connection_stats) {
    if (report.selected) {
      connection_stats.peer_connection.local_candidate_type = rtc_stats_report.get(report.localCandidateId).candidateType;
      connection_stats.peer_connection.remote_candidate_type = rtc_stats_report.get(report.remoteCandidateId).candidateType;
    }

    return connection_stats;
  }

  /**
   * Update from z.calling.rtc.STATS_TYPE.GOOGLE_CANDIDATE_PAIR report.
   *
   * @param {Object} report - z.calling.rtc.STATS_TYPE.GOOGLE_CANDIDATE_PAIR report
   * @param {RTCStatsReport} rtc_stats_report - Statistics report from PeerConnection
   * @param {z.telemetry.calling.ConnectionStats} connection_stats - Parsed flow statistics
   * @returns {z.telemetry.calling.ConnectionStats} updated_stats
   */
  _update_from_google_candidate_pair(report, rtc_stats_report, connection_stats) {
    if (report.googActiveConnection === 'true') {
      connection_stats.peer_connection.round_trip_time = window.parseInt(report.googRtt, 10);
      connection_stats.peer_connection.local_candidate_type = rtc_stats_report.get(report.localCandidateId).candidateType;
      connection_stats.peer_connection.remote_candidate_type = rtc_stats_report.get(report.remoteCandidateId).candidateType;
    }

    return connection_stats;
  }

  /**
   * Update from z.calling.rtc.STATS_TYPE.INBOUND_RTP report.
   *
   * @param {Object} report - z.calling.rtc.STATS_TYPE.INBOUND_RTP report
   * @param {z.telemetry.calling.ConnectionStats} connection_stats - Parsed flow statistics
   * @returns {z.telemetry.calling.ConnectionStats} updated_stats
   */
  _update_from_inbound_rtp(report, connection_stats) {
    if ([z.media.MediaType.AUDIO, z.media.MediaType.VIDEO].includes(report.mediaType)) {
      if (report.bytesReceived) {
        connection_stats[report.mediaType].bytes_received += report.bytesReceived;
      }
      if (report.framerateMean) {
        connection_stats[report.mediaType].frame_rate_received = window.parseInt(report.framerateMean, 10);
      }
    }

    return connection_stats;
  }

  /**
   * Update from z.calling.rtc.STATS_TYPE.OUTBOUND_RTP report.
   *
   * @param {Object} report - z.calling.rtc.STATS_TYPE.OUTBOUND_RTP report
   * @param {z.telemetry.calling.ConnectionStats} connection_stats - Parsed flow statistics
   * @returns {z.telemetry.calling.ConnectionStats} Updated connection stats
   */
  _update_from_outbound_rtp(report, connection_stats) {
    if ([z.media.MediaType.AUDIO, z.media.MediaType.VIDEO].includes(report.mediaType)) {
      if (report.bytesSent) {
        connection_stats[report.mediaType].bytes_sent += report.bytesSent;
      }
      if (report.framerateMean) {
        connection_stats[report.mediaType].frame_rate_sent = window.parseInt(report.framerateMean, 10);
      }
    }

    return connection_stats;
  }

  /**
   * Update from statistics report.
   *
   * @param {Object} report - Statistics report
   * @param {z.telemetry.calling.ConnectionStats} connection_stats - Parsed flow statistics
   * @returns {z.telemetry.calling.ConnectionStats} updated_stats
   */
  _update_peer_connection_bytes(report, connection_stats) {
    if (report.bytesReceived) {
      connection_stats.peer_connection.bytes_received += window.parseInt(report.bytesReceived, 10);
    }
    if (report.bytesSent) {
      connection_stats.peer_connection.bytes_sent += window.parseInt(report.bytesSent, 10);
    }

    return connection_stats;
  }

  /**
   * Update from z.calling.rtc.STATS_TYPE.SSRC report.
   *
   * @param {Object} report - z.calling.rtc.STATS_TYPE.SSRC report
   * @param {z.telemetry.calling.ConnectionStats} connection_stats - Parsed flow statistics
   * @returns {z.telemetry.calling.ConnectionStats} Update connection stats
   */
  _update_from_ssrc(report, connection_stats) {
    let codec, stream_stats;
    if (report.codecImplementationName) {
      codec = `${report.googCodecName} ${report.codecImplementationName}`;
    } else {
      codec = report.googCodecName;
    }

    if (report.audioOutputLevel) {
      stream_stats = connection_stats.audio;
      stream_stats.volume_received = window.parseInt(report.audioOutputLevel, 10);
      stream_stats.codec_received = codec;
    } else if (report.audioInputLevel) {
      stream_stats = connection_stats.audio;
      stream_stats.volume_sent = window.parseInt(report.audioInputLevel, 10);
      stream_stats.codec_sent = codec;
    } else if (this.call_et.is_remote_screen_send() || this.call_et.is_remote_video_send()) {
      stream_stats = connection_stats.video;
      if (report.googFrameHeightReceived) {
        stream_stats.frame_height_received = window.parseInt(report.googFrameHeightReceived, 10);
        stream_stats.frame_rate_received = window.parseInt(report.googFrameRateReceived, 10);
        stream_stats.frame_width_received = window.parseInt(report.googFrameWidthReceived, 10);
        stream_stats.codec_received = codec;
      } else if (report.googFrameHeightSent) {
        stream_stats.frame_height_sent = window.parseInt(report.googFrameHeightSent, 10);
        if (report.googFrameRateSent) {
          stream_stats.frame_rate_sent = window.parseInt(report.googFrameRateSent, 10);
        }
        if (report.googFrameWidthSent) {
          stream_stats.frame_width_sent = window.parseInt(report.googFrameWidthSent, 10);
        }
        stream_stats.codec_sent = codec;
      }
    }

    if (stream_stats) {
      if (report.bytesReceived) {
        stream_stats.bytes_received += window.parseInt(report.bytesReceived, 10);
      }
      if (stream_stats.bytes_received === 0) {
        stream_stats.bytes_received = connection_stats.peer_connection.bytes_received;
      }
      if (report.bytesSent) {
        stream_stats.bytes_sent += window.parseInt(report.bytesSent, 10);
      }
      if (stream_stats.bytes_sent === 0) {
        stream_stats.bytes_sent = connection_stats.peer_connection.bytes_sent;
      }
      if (report.googCurrentDelayMs) {
        stream_stats.delay = window.parseInt(report.googCurrentDelayMs, 10);
      }
      if (report.googRtt) {
        stream_stats.round_trip_time = window.parseInt(report.googRtt, 10);
      }
    }

    return connection_stats;
  }


  //##############################################################################
  // Timings
  //##############################################################################

  /**
   * Return the step timings object.
   * @returns {z.telemetry.calling.CallSetupTimings} Flow statistics
   */
  get_timings() {
    return this.timings.get();
  }

  /**
   * Time a call setup step.
   * @param {z.telemetry.calling.CallSetupSteps} step - Step to time
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
   * @param {z.calling.entities.Participant|z.calling.entities.EParticipant} participant_et - Call participant
   * @returns {undefined} No return value
   */
  log_status(participant_et) {
    this.logger.force_log(`-- ID: ${this.id}`);

    if (this.remote_user !== undefined) {
      this.logger.force_log(`-- Remote user: ${participant_et.user.name()} (${participant_et.user.id})`);
    }

    this.logger.force_log(`-- User is connected: ${participant_et.is_connected()}`);
    this.logger.force_log(`-- Flow is answer: ${this.is_answer}`);

    if (this.peer_connection) {
      this.logger.force_log(`-- ICE connection: ${this.peer_connection.iceConnectionState}`);
      this.logger.force_log(`-- ICE gathering: ${this.peer_connection.iceGatheringState}`);
    }

    const statistics = this.get_statistics();
    if (statistics) {
      // @note Types are 'none' if we cannot connect to the user (0 bytes flow)
      this.logger.force_log('PeerConnection network statistics', statistics);
      this.logger.force_log(`-- Remote ICE candidate type: ${statistics.peer_connection.remote_candidate_type}`);
      this.logger.force_log(`-- Local ICE candidate type: ${statistics.peer_connection.local_candidate_type}`);

      // PeerConnection Stats
      for (const key in statistics) {
        if (statistics.hasOwnProperty(key)) {
          const value = statistics[key];
          if (_.isObject(value)) {
            this.logger.force_log(`Statistics for '${key}':`);
            this.logger.force_log(`-- Bit rate received: ${value.bit_rate_received}`);
            this.logger.force_log(`-- Bit rate sent: ${value.bit_rate_sent}`);
            this.logger.force_log(`-- Bytes sent: ${value.bytes_sent}`);
            this.logger.force_log(`-- Bytes received: ${value.bytes_received}`);
            this.logger.force_log(`-- Rtt: ${value.rtt}`);

            if (z.util.Environment.browser.chrome && [z.media.MediaType.AUDIO, z.media.MediaType.VIDEO].includes(key)) {
              this.logger.force_log(`-- Codec received: ${value.codec_received}`);
              this.logger.force_log(`-- Codec sent: ${value.codec_sent}`);
              this.logger.force_log(`-- Delay in ms: ${value.delay}`);
            }

            if (key === z.media.MediaType.VIDEO) {
              this.logger.force_log(`-- Frame rate received: ${value.frame_rate_received}`);
              this.logger.force_log(`-- Frame rate sent: ${value.frame_rate_sent}`);

              if (!z.util.Environment.browser.chrome) {
                continue;
              }

              const received_resolution = `${value.frame_width_received}x${value.frame_height_received}`;
              const sent_resolution = `${value.frame_width_sent}x${value.frame_height_sent}`;
              this.logger.force_log(`-- Frame resolution received: ${received_resolution}`);
              this.logger.force_log(`-- Frame resolution sent: ${sent_resolution}`);
            } else if (key === z.media.MediaType.AUDIO) {
              this.logger.force_log(`-- Volume received: ${value.volume_received}`);
              this.logger.force_log(`-- Volume sent: ${value.volume_sent}`);
            }
          }
        }
      }
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
