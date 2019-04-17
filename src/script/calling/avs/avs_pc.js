/*eslint-disable sort-keys, no-console */
let em_module;
const pcArray = new Array();
pcArray.push(null); // so 0 means invalid

const dcArray = new Array();
dcArray.push(null); // so 0 means invalid

const DC_STATE_CONNECTING = 0;
const DC_STATE_OPEN = 1;
const DC_STATE_CLOSING = 2;
const DC_STATE_CLOSED = 3;
const DC_STATE_ERROR = 4;

function pc2hnd(pc) {
  // Handle any addtion of MAGIC here
  const hnd = pcArray.push(pc);

  return hnd - 1;
}

function hnd2pc(hnd) {
  // Handle any MAGIC here...
  return pcArray[hnd];
}

function hnd2dc(hnd) {
  // Handle any MAGIC here...
  return dcArray[hnd];
}

function dc2hnd(dc) {
  // Handle any addtion of MAGIC here
  const hnd = dcArray.push(dc);

  return hnd - 1;
}

function ccallLocalSdpHandler(pc, err, type, sdp) {
  const config = pc.getConfiguration();

  console.log(`bundlePolicy=${config.bundlePolicy}`);

  em_module.ccall(
    'pc_local_sdp_handler',
    null,
    ['number', 'number', 'string', 'string', 'string'],
    [pc.self, err, 'avs', type, sdp]
  );
}

function ccallGatheringHandler(pc, type, sdp) {
  em_module.ccall('pc_gather_handler', null, ['number', 'string', 'string'], [pc.self, type, sdp]);
}

function ccallConnectionHandler(pc, state) {
  em_module.ccall('pc_connection_handler', null, ['number', 'string'], [pc.self, state]);
}

/* Data-channel hepers */

function ccallDcStateChangeHandler(pc, state) {
  em_module.ccall('dc_state_handler', null, ['number', 'number'], [pc.self, state]);
}

function ccallDcDataHandler(pc, data) {
  em_module.ccall('dc_data_handler', null, ['number', 'string', 'number'], [pc.self, data, data.length]);
}

function gatheringHandler(pc) {
  console.log(`ice gathering state=${pc.iceGatheringState}`);

  switch (pc.iceGatheringState) {
    case 'new':
      break;

    case 'gathering':
      break;

    case 'complete':
      const sdp = pc.localDescription;
      ccallGatheringHandler(pc, sdp.type.toString(), sdp.sdp.toString());
      break;
  }
}

function connectionHandler(pc, event) {
  const state = pc.connectionState;
  console.log(`connectionHandler: event: ${event.toString()} state: ${state}`);

  ccallConnectionHandler(pc, state);

  const streams = pc.getLocalStreams();
  console.log(`nstreams=${streams.length}`);
  for (const stream of streams) {
    console.log(`Local stream: ${stream.id}`);
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      console.log(`BlahUsing Audio device: ${audioTracks[0].label}`);
    }
    for (const track of audioTracks) {
      track.enabled = true;
    }
  }
}

/* DataChannel events */

function pc_New(self) {
  console.log('pc_New');
  const config = {bundlePolicy: 'max-bundle'};
  const pc = new RTCPeerConnection(config);
  const hnd = pc2hnd(pc);
  pc.self = self;

  pc.onicegatheringstatechange = function() {
    gatheringHandler(pc);
  };

  pc.onconnectionstatechange = function(event) {
    connectionHandler(pc, event);
  };

  return hnd;
}

function pc_Close(hnd) {
  console.log(`pc_Close: hnd=${hnd}`);

  const pc = hnd2pc(hnd);
  if (pc == null) {
    return;
  }

  pc.close();
}

function pc_AddTurnServer(hnd, urlPtr, usernamePtr, passwordPtr) {
  console.log(`pc_AddTurnServer: hnd=${hnd}`);

  const pc = hnd2pc(hnd);
  if (pc == null) {
    return;
  }

  const url = em_module.UTF8ToString(urlPtr);
  const username = em_module.UTF8ToString(usernamePtr);
  const credential = em_module.UTF8ToString(passwordPtr);

  const config = pc.getConfiguration();
  const server = {
    urls: url,
    username: username,
    credential: credential,
  };

  config.iceServers.push(server);
  pc.setConfiguration(config);
}

function pc_CreateOffer(hnd) {
  const pc = hnd2pc(hnd);
  console.log(`pc_CreateOffer: hnd=${hnd} self=${pc.self.toString(16)}`);
  if (pc == null) {
    return;
  }

  const constraints = {
    video: false,
    audio: true,
  };

  console.log('getting user media ');
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => {
      console.log('getUserMedia success');
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      pc.createOffer(
        sdp => {
          const typeStr = sdp.type.toString();
          const sdpStr = sdp.sdp.toString();

          ccallLocalSdpHandler(pc, 0, typeStr, sdpStr);
        },
        err => {
          ccallLocalSdpHandler(pc, 1, 'sdp-error', err.toString());
        }
      );
    })
    .catch(err => {
      ccallLocalSdpHandler(pc, 1, 'media-error', err.toString());
    });
}

function pc_CreateAnswer(hnd) {
  console.log(`pc_CreateOffer: ${hnd}`);
  const pc = hnd2pc(hnd);
  if (pc == null) {
    return;
  }

  const constraints = {
    video: false,
    audio: true,
  };

  console.log('getting user media ');
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => {
      console.log('getUserMedia success');
      pc.addStream(stream);
      pc.createAnswer(
        sdp => {
          const typeStr = sdp.type.toString();
          const sdpStr = sdp.sdp.toString();
          console.log(`create-${typeStr} SDP=${sdpStr}`);

          ccallLocalSdpHandler(pc, 0, typeStr, sdpStr);
        },
        err => {
          ccallLocalSdpHandler(pc, 1, 'sdp-error', err.toString());
        }
      );
    })
    .catch(err => {
      ccallLocalSdpHandler(pc, 1, 'media-error', err.toString());
    });
}

function pc_SetRemoteDescription(hnd, typeStr, sdpStr) {
  console.log(`pc_SetRemoteDescription: hnd=${hnd}`);

  const pc = hnd2pc(hnd);
  if (pc == null) {
    return;
  }

  const type = em_module.UTF8ToString(typeStr);
  const sdp = em_module.UTF8ToString(sdpStr);

  pc.setRemoteDescription({type: type, sdp: sdp});
}

function pc_SetLocalDescription(hnd, typeStr, sdpStr) {
  console.log(`pc_SetLocalDescription: hnd=${hnd}`);

  const pc = hnd2pc(hnd);
  if (pc == null) {
    return;
  }

  const type = em_module.UTF8ToString(typeStr);
  const sdp = em_module.UTF8ToString(sdpStr);

  pc.setLocalDescription({type: type, sdp: sdp})
    .then(() => {})
    .catch(err => {
      console.log(`setLocalDescription failed: ${err}`);
    });
}

function pc_LocalDescription(hnd, typePtr) {
  console.log(`pc_LocalDescription: hnd=${hnd}`);

  const pc = hnd2pc(hnd);

  const type = em_module.UTF8ToString(typePtr);
  const sdpDesc = pc.localDescription;

  if (type != sdpDesc.type) {
    console.log('localdesc wrong type');
    return null;
  }

  const sdp = sdpDesc.sdp.toString();
  const sdpLen = em_module.lengthBytesUTF8(sdp);
  const ptr = em_module._malloc(sdpLen);

  em_module.stringToUTF8(sdp, ptr, sdpLen);

  return ptr;
}

function pc_IceGatheringState(hnd) {
  console.log(`pc_IceGatheringState: hnd=${hnd}`);
  const pc = hnd2pc(hnd);
  if (!pc) {
    return 0;
  }

  /* Does this need mapping to an int, if it comes as a string,
   * or we return a string???
   */
  const state = pc.iceGatheringState;

  return state;
}

function pc_SignallingState(hnd) {
  console.log(`pc_SignallingState: hnd=${hnd}`);
  const pc = hnd2pc(hnd);
  if (!pc) {
    return 0;
  }

  /* Does this need mapping to an int, if it comes as a string,
   * or we return a string???
   */
  const state = pc.signallingState;

  return state;
}

function pc_ConnectionState(hnd) {
  console.log(`pc_ConnectionState: hnd=${hnd}`);
  const pc = hnd2pc(hnd);
  if (!pc) {
    return 0;
  }

  /* Does this need mapping to an int, if it comes as a string,
   * or we return a string???
   */
  const state = pc.connectionState;

  return state;
}

/* Data Channel related */
function pc_CreateDataChannel(hnd, labelPtr) {
  console.log(`pc_CreateDataChannel: hnd=${hnd}`);
  const pc = hnd2pc(hnd);
  if (pc == null) {
    return;
  }

  const label = em_module.UTF8ToString(labelPtr);
  const dc = pc.createDataChannel(label);
  let dcHnd = null;
  if (dc != null) {
    dcHnd = dc2hnd(dc);
    dc.onopen = function() {
      console.log('dc-opened');
      ccallDcStateChangeHandler(pc, DC_STATE_OPEN);
    };
    dc.onclose = function() {
      console.log('dc-closed');
      ccallDcStateChangeHandler(pc, DC_STATE_CLOSED);
    };
    dc.onerror = function() {
      console.log('dc-error');
      ccallDcStateChangeHandler(pc, DC_STATE_ERROR);
    };
    dc.onmessage = function(event) {
      console.log(`dc-onmessage: data=${event.data.length}`);
      ccallDcDataHandler(pc, event.data.toString());
    };
  }

  return dcHnd;
}

function pc_DataChannelId(hnd) {
  console.log(`pc_DataChannelId: hnd=${hnd}`);
  const dc = hnd2dc(hnd);
  if (dc == null) {
    return;
  }

  return dc.id;
}

function pc_DataChannelState(hnd) {
  console.log(`pc_DataChannelState: hnd=${hnd}`);
  const dc = hnd2dc(hnd);
  if (dc == null) {
    return;
  }

  const str = dc.readyState;
  let state = DC_STATE_ERROR;

  if (str == 'connecting') {
    state = DC_STATE_CONNECTING;
  } else if (str == 'open') {
    state = DC_STATE_OPEN;
  } else if (str == 'closing') {
    state = DC_STATE_CLOSING;
  } else if (str == 'closed') {
    state = DC_STATE_CLOSED;
  }

  return state;
}

function pc_DataChannelSend(hnd, dataPtr, dataLen) {
  console.log(`pc_DataCHannelSend: hnd=${hnd}`);

  const dc = hnd2dc(hnd);
  if (dc == null) {
    return;
  }

  const data = new Uint8Array(em_module.HEAPU8.buffer, dataPtr, dataLen);

  dc.send(data);
}

function pc_DataChannelClose(hnd) {
  console.log(`pc_DataChannelClose: hnd=${hnd}`);

  const dc = hnd2dc(hnd);
  if (dc == null) {
    return;
  }

  dc.close();
}

const avspc = {
  avspc_init: function(module) {
    em_module = module;
    console.log('pcwrap_init');
    const fn_pc_New = em_module.addFunction(pc_New, 'nn');
    const fn_pc_Close = em_module.addFunction(pc_Close, 'vn');
    const fn_pc_AddTS = em_module.addFunction(pc_AddTurnServer, 'vnsss');
    const fn_pc_IceGatheringState = em_module.addFunction(pc_IceGatheringState, 'nn');
    const fn_pc_SignallingState = em_module.addFunction(pc_SignallingState, 'n');
    const fn_pc_ConnectionState = em_module.addFunction(pc_ConnectionState, 'n');
    const fn_pc_CreateDataChannel = em_module.addFunction(pc_CreateDataChannel, 'ns');
    const fn_pc_CreateOffer = em_module.addFunction(pc_CreateOffer, 'n');
    const fn_pc_CreateAnswer = em_module.addFunction(pc_CreateAnswer, 'n');
    const fn_pc_SetRemoteDescription = em_module.addFunction(pc_SetRemoteDescription, 'nss');
    const fn_pc_SetLocalDescription = em_module.addFunction(pc_SetLocalDescription, 'nss');
    const fn_pc_LocalDescription = em_module.addFunction(pc_LocalDescription, 'sns');
    const fn_pc_DataChannelId = em_module.addFunction(pc_DataChannelId, 'nn');
    const fn_pc_DataChannelState = em_module.addFunction(pc_DataChannelState, 'nn');
    const fn_pc_DataChannelSend = em_module.addFunction(pc_DataChannelSend, 'vnsn');
    const fn_pc_DataChannelClose = em_module.addFunction(pc_DataChannelClose, 'vn');

    em_module.ccall(
      'pc_set_callbacks',
      'null',
      [
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
        'number',
        'number',
        'number',
      ],
      [
        fn_pc_New,
        fn_pc_Close,
        fn_pc_AddTS,
        fn_pc_IceGatheringState,
        fn_pc_SignallingState,
        fn_pc_ConnectionState,
        fn_pc_CreateDataChannel,
        fn_pc_CreateOffer,
        fn_pc_CreateAnswer,
        fn_pc_SetRemoteDescription,
        fn_pc_SetLocalDescription,
        fn_pc_LocalDescription,
        fn_pc_DataChannelId,
        fn_pc_DataChannelState,
        fn_pc_DataChannelSend,
        fn_pc_DataChannelClose,
      ]
    );
  },
};

export default avspc;
