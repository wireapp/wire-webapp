/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/* DO NOT edit this file by hand. It is generated by the AVS make
   system and any changes you make will be lost.
*/
/*eslint-disable sort-keys, no-shadow */

import avs_core from './avs_core.js';
import {avspc} from './avs_pc.js';

let instance;

export function getAvsInstance() {
  if (instance) {
    return Promise.resolve(instance);
  }

  return new Promise(resolve => {
    avs_core().then(em_module => {
      const wcall = {
        WCALL_VERSION_3: 3,

        WCALL_ERROR_UNKNOWN_PROTOCOL: 1000,

        WCALL_QUALITY_NORMAL: 1,
        WCALL_QUALITY_MEDIUM: 2,
        WCALL_QUALITY_POOR: 3,

        WCALL_REASON_NORMAL: 0,
        WCALL_REASON_ERROR: 1,
        WCALL_REASON_TIMEOUT: 2,
        WCALL_REASON_LOST_MEDIA: 3,
        WCALL_REASON_CANCELED: 4,
        WCALL_REASON_ANSWERED_ELSEWHERE: 5,
        WCALL_REASON_IO_ERROR: 6,
        WCALL_REASON_STILL_ONGOING: 7,
        WCALL_REASON_TIMEOUT_ECONN: 8,
        WCALL_REASON_DATACHANNEL: 9,
        WCALL_REASON_REJECTED: 10,

        WCALL_LOG_LEVEL_DEBUG: 0,
        WCALL_LOG_LEVEL_INFO: 1,
        WCALL_LOG_LEVEL_WARN: 2,
        WCALL_LOG_LEVEL_ERROR: 3,

        WCALL_VIDEO_STATE_STOPPED: 0,
        WCALL_VIDEO_STATE_STARTED: 1,
        WCALL_VIDEO_STATE_BAD_CONN: 2,
        WCALL_VIDEO_STATE_PAUSED: 3,
        WCALL_VIDEO_STATE_SCREENSHARE: 4,

        WCALL_CALL_TYPE_NORMAL: 0,
        WCALL_CALL_TYPE_VIDEO: 1,
        WCALL_CALL_TYPE_FORCED_AUDIO: 2,

        WCALL_CONV_TYPE_ONEONONE: 0,
        WCALL_CONV_TYPE_GROUP: 1,
        WCALL_CONV_TYPE_CONFERENCE: 2,

        WCALL_STATE_NONE: 0,
        WCALL_STATE_OUTGOING: 1,
        WCALL_STATE_INCOMING: 2,
        WCALL_STATE_ANSWERED: 3,
        WCALL_STATE_MEDIA_ESTAB: 4,
        WCALL_STATE_TERM_LOCAL: 6,
        WCALL_STATE_TERM_REMOTE: 7,
        WCALL_STATE_UNKNOWN: 8,

        init: function() {
          avspc.avspc_init(em_module);

          return em_module.ccall('wcall_init', 'number', [], []);
        },

        close: function() {
          em_module.ccall('wcall_close', 'null', [], []);
        },

        create: function(
          userid,
          clientid,
          readyh,
          sendh,
          incomingh,
          missedh,
          answerh,
          estabh,
          closeh,
          metricsh,
          cfg_reqh,
          acbrh,
          vstateh,
          arg
        ) {
          const fn_readyh = em_module.addFunction((version, arg) => {
            if (readyh) {
              readyh(version, arg);
            }
          }, 'vnn');

          const fn_sendh = em_module.addFunction(
            (ctx, convid, userid_self, clientid_self, userid_dest, clientid_dest, data, len, trans, arg) => {
              if (sendh) {
                return sendh(
                  ctx,
                  convid == 0 ? null : em_module.UTF8ToString(convid),
                  userid_self == 0 ? null : em_module.UTF8ToString(userid_self),
                  clientid_self == 0 ? null : em_module.UTF8ToString(clientid_self),
                  userid_dest == 0 ? null : em_module.UTF8ToString(userid_dest),
                  clientid_dest == 0 ? null : em_module.UTF8ToString(clientid_dest),
                  data == 0 ? null : em_module.UTF8ToString(data),
                  len,
                  trans,
                  arg
                );
              }
              return null;
            },
            'nnssssssnnn'
          );

          const fn_incomingh = em_module.addFunction((convid, msg_time, userid, video_call, should_ring, arg) => {
            if (incomingh) {
              incomingh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                msg_time,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                video_call,
                should_ring,
                arg
              );
            }
          }, 'vsnsnnn');

          const fn_missedh = em_module.addFunction((convid, msg_time, userid, video_call, arg) => {
            if (missedh) {
              missedh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                msg_time,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                video_call,
                arg
              );
            }
          }, 'vsnsnn');

          const fn_answerh = em_module.addFunction((convid, arg) => {
            if (answerh) {
              answerh(convid == 0 ? null : em_module.UTF8ToString(convid), arg);
            }
          }, 'vsn');

          const fn_estabh = em_module.addFunction((convid, userid, arg) => {
            if (estabh) {
              estabh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
          }, 'vssn');

          const fn_closeh = em_module.addFunction((reason, convid, msg_time, userid, arg) => {
            if (closeh) {
              closeh(
                reason,
                convid == 0 ? null : em_module.UTF8ToString(convid),
                msg_time,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
          }, 'vnsnsn');

          const fn_metricsh = em_module.addFunction((convid, metrics_json, arg) => {
            if (metricsh) {
              metricsh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                metrics_json == 0 ? null : em_module.UTF8ToString(metrics_json),
                arg
              );
            }
          }, 'vssn');

          const fn_cfg_reqh = em_module.addFunction((wuser, arg) => {
            if (cfg_reqh) {
              return cfg_reqh(wuser, arg);
            }
            return null;
          }, 'nnn');

          const fn_acbrh = em_module.addFunction((userid, enabled, arg) => {
            if (acbrh) {
              acbrh(userid == 0 ? null : em_module.UTF8ToString(userid), enabled, arg);
            }
          }, 'vsnn');

          const fn_vstateh = em_module.addFunction((userid, state, arg) => {
            if (vstateh) {
              vstateh(userid == 0 ? null : em_module.UTF8ToString(userid), state, arg);
            }
          }, 'vsnn');
          return em_module.ccall(
            'wcall_create',
            'number',
            [
              'string',
              'string',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
            ],
            [
              userid,
              clientid,
              fn_readyh,
              fn_sendh,
              fn_incomingh,
              fn_missedh,
              fn_answerh,
              fn_estabh,
              fn_closeh,
              fn_metricsh,
              fn_cfg_reqh,
              fn_acbrh,
              fn_vstateh,
              arg,
            ]
          );
        },

        create_ex: function(
          userid,
          clientid,
          use_mediamgr,
          msys_name,
          readyh,
          sendh,
          sfth,
          incomingh,
          missedh,
          answerh,
          estabh,
          closeh,
          metricsh,
          cfg_reqh,
          acbrh,
          vstateh,
          arg
        ) {
          const fn_readyh = em_module.addFunction((version, arg) => {
            if (readyh) {
              readyh(version, arg);
            }
          }, 'vnn');

          const fn_sendh = em_module.addFunction(
            (ctx, convid, userid_self, clientid_self, userid_dest, clientid_dest, data, len, trans, arg) => {
              if (sendh) {
                return sendh(
                  ctx,
                  convid == 0 ? null : em_module.UTF8ToString(convid),
                  userid_self == 0 ? null : em_module.UTF8ToString(userid_self),
                  clientid_self == 0 ? null : em_module.UTF8ToString(clientid_self),
                  userid_dest == 0 ? null : em_module.UTF8ToString(userid_dest),
                  clientid_dest == 0 ? null : em_module.UTF8ToString(clientid_dest),
                  data == 0 ? null : em_module.UTF8ToString(data),
                  len,
                  trans,
                  arg
                );
              }
              return null;
            },
            'nnssssssnnn'
          );

          const fn_sfth = em_module.addFunction((ctx, url, data, len, arg) => {
            if (sfth) {
              return sfth(
                ctx,
                url == 0 ? null : em_module.UTF8ToString(url),
                data == 0 ? null : em_module.UTF8ToString(data),
                len,
                arg
              );
            }
            return null;
          }, 'nnssnn');

          const fn_incomingh = em_module.addFunction((convid, msg_time, userid, video_call, should_ring, arg) => {
            if (incomingh) {
              incomingh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                msg_time,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                video_call,
                should_ring,
                arg
              );
            }
          }, 'vsnsnnn');

          const fn_missedh = em_module.addFunction((convid, msg_time, userid, video_call, arg) => {
            if (missedh) {
              missedh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                msg_time,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                video_call,
                arg
              );
            }
          }, 'vsnsnn');

          const fn_answerh = em_module.addFunction((convid, arg) => {
            if (answerh) {
              answerh(convid == 0 ? null : em_module.UTF8ToString(convid), arg);
            }
          }, 'vsn');

          const fn_estabh = em_module.addFunction((convid, userid, arg) => {
            if (estabh) {
              estabh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
          }, 'vssn');

          const fn_closeh = em_module.addFunction((reason, convid, msg_time, userid, arg) => {
            if (closeh) {
              closeh(
                reason,
                convid == 0 ? null : em_module.UTF8ToString(convid),
                msg_time,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
          }, 'vnsnsn');

          const fn_metricsh = em_module.addFunction((convid, metrics_json, arg) => {
            if (metricsh) {
              metricsh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                metrics_json == 0 ? null : em_module.UTF8ToString(metrics_json),
                arg
              );
            }
          }, 'vssn');

          const fn_cfg_reqh = em_module.addFunction((wuser, arg) => {
            if (cfg_reqh) {
              return cfg_reqh(wuser, arg);
            }
            return null;
          }, 'nnn');

          const fn_acbrh = em_module.addFunction((userid, enabled, arg) => {
            if (acbrh) {
              acbrh(userid == 0 ? null : em_module.UTF8ToString(userid), enabled, arg);
            }
          }, 'vsnn');

          const fn_vstateh = em_module.addFunction((userid, state, arg) => {
            if (vstateh) {
              vstateh(userid == 0 ? null : em_module.UTF8ToString(userid), state, arg);
            }
          }, 'vsnn');
          return em_module.ccall(
            'wcall_create_ex',
            'number',
            [
              'string',
              'string',
              'number',
              'string',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
              'number',
            ],
            [
              userid,
              clientid,
              use_mediamgr,
              msys_name,
              fn_readyh,
              fn_sendh,
              fn_sfth,
              fn_incomingh,
              fn_missedh,
              fn_answerh,
              fn_estabh,
              fn_closeh,
              fn_metricsh,
              fn_cfg_reqh,
              fn_acbrh,
              fn_vstateh,
              arg,
            ]
          );
        },

        set_shutdown_handler: function(wuser, shuth, arg) {
          const fn_shuth = em_module.addFunction((wuser, arg) => {
            if (shuth) {
              shuth(wuser, arg);
            }
          }, 'vnn');
          em_module.ccall('wcall_set_shutdown_handler', 'null', ['number', 'number', 'number'], [wuser, fn_shuth, arg]);
        },

        destroy: function(wuser) {
          em_module.ccall('wcall_destroy', 'null', ['number'], [wuser]);
        },

        set_trace: function(wuser, trace) {
          em_module.ccall('wcall_set_trace', 'null', ['number', 'number'], [wuser, trace]);
        },

        start: function(wuser, convid, call_type, conv_type, audio_cbr) {
          return em_module.ccall(
            'wcall_start',
            'number',
            ['number', 'string', 'number', 'number', 'number'],
            [wuser, convid, call_type, conv_type, audio_cbr]
          );
        },

        start_ex: function(wuser, convid, sft_url, sft_token, call_type, conv_type, audio_cbr, extcodec_arg) {
          return em_module.ccall(
            'wcall_start_ex',
            'number',
            ['number', 'string', 'string', 'string', 'number', 'number', 'number', 'number'],
            [wuser, convid, sft_url, sft_token, call_type, conv_type, audio_cbr, extcodec_arg]
          );
        },

        conf_start: function(wuser, convid, sft_url, sft_token, call_type, audio_cbr) {
          return em_module.ccall(
            'wcall_conf_start',
            'number',
            ['number', 'string', 'string', 'string', 'number', 'number'],
            [wuser, convid, sft_url, sft_token, call_type, audio_cbr]
          );
        },

        answer: function(wuser, convid, call_type, audio_cbr) {
          return em_module.ccall(
            'wcall_answer',
            'number',
            ['number', 'string', 'number', 'number'],
            [wuser, convid, call_type, audio_cbr]
          );
        },

        answer_ex: function(wuser, convid, sft_url, sft_token, call_type, audio_cbr, extcodec_arg) {
          return em_module.ccall(
            'wcall_answer_ex',
            'number',
            ['number', 'string', 'string', 'string', 'number', 'number', 'number'],
            [wuser, convid, sft_url, sft_token, call_type, audio_cbr, extcodec_arg]
          );
        },

        conf_answer: function(wuser, convid, sft_url, sft_token, call_type, audio_cbr) {
          return em_module.ccall(
            'wcall_conf_answer',
            'number',
            ['number', 'string', 'string', 'string', 'number', 'number'],
            [wuser, convid, sft_url, sft_token, call_type, audio_cbr]
          );
        },

        resp: function(wuser, status, reason, ctx) {
          em_module.ccall('wcall_resp', 'null', ['number', 'number', 'string', 'number'], [wuser, status, reason, ctx]);
        },

        config_update: function(wuser, err, json_str) {
          em_module.ccall('wcall_config_update', 'null', ['number', 'number', 'string'], [wuser, err, json_str]);
        },

        sft_resp: function(wuser, perr, buf, len, ctx) {
          em_module.ccall(
            'wcall_sft_resp',
            'null',
            ['number', 'number', 'string', 'number', 'number'],
            [wuser, perr, buf, len, ctx]
          );
        },

        recv_msg: function(wuser, buf, len, curr_time, msg_time, convid, userid, clientid) {
          return em_module.ccall(
            'wcall_recv_msg',
            'number',
            ['number', 'string', 'number', 'number', 'number', 'string', 'string', 'string'],
            [wuser, buf, len, curr_time, msg_time, convid, userid, clientid]
          );
        },

        end: function(wuser, convid) {
          em_module.ccall('wcall_end', 'null', ['number', 'string'], [wuser, convid]);
        },

        reject: function(wuser, convid) {
          return em_module.ccall('wcall_reject', 'number', ['number', 'string'], [wuser, convid]);
        },

        is_video_call: function(wuser, convid) {
          return em_module.ccall('wcall_is_video_call', 'number', ['number', 'string'], [wuser, convid]);
        },

        set_media_estab_handler: function(wuser, mestabh) {
          const fn_mestabh = em_module.addFunction((convid, peer, userid, arg) => {
            if (mestabh) {
              mestabh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                peer,
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
          }, 'vsnsn');
          em_module.ccall('wcall_set_media_estab_handler', 'null', ['number', 'number'], [wuser, fn_mestabh]);
        },

        set_media_stopped_handler: function(wuser, mstoph) {
          const fn_mstoph = em_module.addFunction((convid, arg) => {
            if (mstoph) {
              mstoph(convid == 0 ? null : em_module.UTF8ToString(convid), arg);
            }
          }, 'vsn');
          em_module.ccall('wcall_set_media_stopped_handler', 'null', ['number', 'number'], [wuser, fn_mstoph]);
        },

        set_data_chan_estab_handler: function(wuser, dcestabh) {
          const fn_dcestabh = em_module.addFunction((convid, userid, arg) => {
            if (dcestabh) {
              dcestabh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
          }, 'vssn');
          em_module.ccall('wcall_set_data_chan_estab_handler', 'null', ['number', 'number'], [wuser, fn_dcestabh]);
        },

        set_extcodec_arg: function(wuser, peer, convid, userid, arg) {
          em_module.ccall(
            'wcall_set_extcodec_arg',
            'null',
            ['number', 'number', 'string', 'string', 'number'],
            [wuser, peer, convid, userid, arg]
          );
        },

        dce_send: function(wuser, convid, mbuf) {
          em_module.ccall('wcall_dce_send', 'null', ['number', 'string', 'struct'], [wuser, convid, mbuf]);
        },

        set_video_send_state: function(wuser, convid, state) {
          em_module.ccall('wcall_set_video_send_state', 'null', ['number', 'string', 'number'], [wuser, convid, state]);
        },

        set_video_handlers: function(render_frame_h, size_h, arg) {
          const fn_render_frame_h = em_module.addFunction((avs_vidframe, userid, arg) => {
            if (render_frame_h) {
              return render_frame_h(
                avs_vidframe == 0 ? null : em_module.UTF8ToString(avs_vidframe),
                userid == 0 ? null : em_module.UTF8ToString(userid),
                arg
              );
            }
            return null;
          }, 'nssn');

          const fn_size_h = em_module.addFunction((w, h, userid, arg) => {
            if (size_h) {
              size_h(w, h, userid == 0 ? null : em_module.UTF8ToString(userid), arg);
            }
          }, 'vnnsn');
          em_module.ccall(
            'wcall_set_video_handlers',
            'null',
            ['number', 'number', 'number'],
            [fn_render_frame_h, fn_size_h, arg]
          );
        },

        network_changed: function(wuser) {
          em_module.ccall('wcall_network_changed', 'null', ['number'], [wuser]);
        },

        set_group_changed_handler: function(wuser, chgh, arg) {
          const fn_chgh = em_module.addFunction((convid, arg) => {
            if (chgh) {
              chgh(convid == 0 ? null : em_module.UTF8ToString(convid), arg);
            }
          }, 'vsn');
          em_module.ccall(
            'wcall_set_group_changed_handler',
            'null',
            ['number', 'number', 'number'],
            [wuser, fn_chgh, arg]
          );
        },

        set_network_quality_handler: function(wuser, netqh, interval, arg) {
          const fn_netqh = em_module.addFunction((convid, userid, quality, rtt, uploss, downloss, arg) => {
            if (netqh) {
              netqh(
                convid == 0 ? null : em_module.UTF8ToString(convid),
                userid == 0 ? null : em_module.UTF8ToString(userid),
                quality,
                rtt,
                uploss,
                downloss,
                arg
              );
            }
          }, 'vssnnnnn');
          return em_module.ccall(
            'wcall_set_network_quality_handler',
            'number',
            ['number', 'number', 'number', 'number'],
            [wuser, fn_netqh, interval, arg]
          );
        },

        set_log_handler: function(logh, arg) {
          const fn_logh = em_module.addFunction((level, msg, arg) => {
            if (logh) {
              logh(level, msg == 0 ? null : em_module.UTF8ToString(msg), arg);
            }
          }, 'vnsn');
          em_module.ccall('wcall_set_log_handler', 'null', ['number', 'number'], [fn_logh, arg]);
        },

        set_media_laddr: function(wuser, sa) {
          em_module.ccall('wcall_set_media_laddr', 'null', ['number', 'struct'], [wuser, sa]);
        },

        get_mute: function(wuser) {
          return em_module.ccall('wcall_get_mute', 'number', ['number'], [wuser]);
        },

        set_mute: function(wuser, muted) {
          em_module.ccall('wcall_set_mute', 'null', ['number', 'number'], [wuser, muted]);
        },

        debug: function(re_printf, id) {
          return em_module.ccall('wcall_debug', 'number', ['struct', 'number'], [re_printf, id]);
        },

        set_state_handler: function(wuser, stateh) {
          const fn_stateh = em_module.addFunction((convid, state, arg) => {
            if (stateh) {
              stateh(convid == 0 ? null : em_module.UTF8ToString(convid), state, arg);
            }
          }, 'vsnn');
          em_module.ccall('wcall_set_state_handler', 'null', ['number', 'number'], [wuser, fn_stateh]);
        },

        get_state: function(wuser, convid) {
          return em_module.ccall('wcall_get_state', 'number', ['number', 'string'], [wuser, convid]);
        },

        iterate_state: function(wuser, stateh, arg) {
          const fn_stateh = em_module.addFunction((convid, state, arg) => {
            if (stateh) {
              stateh(convid == 0 ? null : em_module.UTF8ToString(convid), state, arg);
            }
          }, 'vsnn');
          em_module.ccall('wcall_iterate_state', 'null', ['number', 'number', 'number'], [wuser, fn_stateh, arg]);
        },

        propsync_request: function(wuser, convid) {
          em_module.ccall('wcall_propsync_request', 'null', ['number', 'string'], [wuser, convid]);
        },

        free_members: function(wcall_members) {
          em_module.ccall('wcall_free_members', 'null', ['struct'], [wcall_members]);
        },

        enable_privacy: function(wuser, enabled) {
          em_module.ccall('wcall_enable_privacy', 'null', ['number', 'number'], [wuser, enabled]);
        },

        handle_frame: function(avs_vidframe) {
          em_module.ccall('wcall_handle_frame', 'null', ['struct'], [avs_vidframe]);
        },

        set_req_clients_handler: function(wuser, reqch) {
          const fn_reqch = em_module.addFunction((convid, arg) => {
            if (reqch) {
              reqch(convid == 0 ? null : em_module.UTF8ToString(convid), arg);
            }
          }, 'vsn');
          em_module.ccall('wcall_set_req_clients_handler', 'null', ['number', 'number'], [wuser, fn_reqch]);
        },

        set_clients_for_conv: function(wuser, convid, carray, clen) {
          return em_module.ccall(
            'wcall_set_clients_for_conv',
            'number',
            ['number', 'string', 'string', 'number'],
            [wuser, convid, carray, clen]
          );
        },

        netprobe: function(wuser, pkt_count, pkt_interval_ms, netprobeh, arg) {
          const fn_netprobeh = em_module.addFunction((err, rtt_avg, n_pkt_sent, n_pkt_recv, arg) => {
            if (netprobeh) {
              netprobeh(err, rtt_avg, n_pkt_sent, n_pkt_recv, arg);
            }
          }, 'vnnnnn');
          return em_module.ccall(
            'wcall_netprobe',
            'number',
            ['number', 'number', 'number', 'number', 'number'],
            [wuser, pkt_count, pkt_interval_ms, fn_netprobeh, arg]
          );
        },

        thread_main: function(error, initialized) {
          em_module.ccall('wcall_thread_main', 'null', ['int*', 'int*'], [error, initialized]);
        },

        run: function() {
          return em_module.ccall('wcall_run', 'number', [], []);
        },

        poll: function() {
          em_module.ccall('wcall_poll', 'null', [], []);
        },

        UTF8ToString: em_module.UTF8ToString,
      };

      instance = wcall;
      resolve(instance);
    });
  });
}
