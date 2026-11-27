import {observableArray} from 'knockout';
import type {NetworkQualityStats} from '@wireapp/avs';

import type {Call} from './Call';
import {NetworkQualityInfoSchema} from './calling.schema';
import {Participant} from './Participant';
import {updateParticipantNetworkStats} from './participantNetworkStats';

import {User} from '../entity/User';
import {translateForTest} from '../../util/test/translateForTest';

const audio = {bitrate: 32000, jitter: 5, loss: 0.5};
const video = {...audio, bitrate: 1080000, width: 1280, height: 720, fps: 30};
const sample: NetworkQualityStats = {
  quality: 1, rtt: 24, loss: {tx: 0, rx: 0}, jitter: {audio: {tx: 0, rx: 0}, video: {tx: 0, rx: 0}},
  connection: {protocol: 'UDP', candidate: 'Relay', local_proto: 'TLS', local_cand: 'Relay', remote_proto: 'UDP', remote_cand: 'Host'},
  peer: 'Server', tx: {audio, video}, rx: {audio: [], video: []},
};
const participant = (id: string, clientId: string, domain = 'example.com'): Participant => {
  return new Participant(new User(id, domain, translateForTest), clientId);
};

describe('AVS participant network samples', () => {
  const self = participant('self', 'local');
  const alice = participant('alice', 'desktop');
  const aliceMobile = participant('alice', 'mobile');
  const federatedAlice = participant('alice', 'desktop', 'other.example');
  const participants = [self, alice, aliceMobile, federatedAlice];
  const call = {getSelfParticipant: () => {return self}, participants: observableArray(participants)} as unknown as Call;

  beforeEach(() => { participants.forEach(peer => { peer.networkStats(undefined); }); });

  it('assigns TX to self and RX by qualified user and client, preserving multiple tracks', () => {
    const info = NetworkQualityInfoSchema.parse({...sample, rx: {
      audio: [{...audio, trackId: 'a', userId: 'alice@example.com', clientId: 'desktop'}],
      video: [
        {...video, trackId: 'v1', userId: 'alice@example.com', clientId: 'desktop'},
        {...video, trackId: 'v2', userId: 'alice@example.com', clientId: 'desktop'},
        {...video, bitrate: 420000, trackId: 'v3', userId: 'alice@example.com', clientId: 'mobile'},
        {...video, bitrate: 640000, trackId: 'v4', userId: 'alice@other.example', clientId: 'desktop'},
      ],
    }});
    updateParticipantNetworkStats(call, info, 'sft', 'sft', 1000);
    expect(self.networkStats()).toMatchObject({receivedAt: 1000, rttMs: 24, quality: 1, audio: [audio], video: [video], connection: {local_proto: 'TLS'}});
    expect(alice.networkStats()).toMatchObject({rttMs: null, quality: null, audio: [audio]});
    expect(alice.networkStats()?.video).toHaveLength(2);
    expect(aliceMobile.networkStats()?.video[0].bitrate).toBe(420000);
    expect(federatedAlice.networkStats()?.video[0].bitrate).toBe(640000);
  });

  it('does not guess identities for unlabelled or ambiguous SFT tracks and clears old RX snapshots', () => {
    const info = NetworkQualityInfoSchema.parse({...sample, rx: {
      audio: [], video: [
        {...video, trackId: 'unknown', userId: null, clientId: null},
        {...video, trackId: 'ambiguous', userId: 'alice@example.com', clientId: null},
      ],
    }});
    updateParticipantNetworkStats(call, info, 'alice@example.com', 'desktop', 1000);
    for (const peer of [alice, aliceMobile, federatedAlice]) { expect(peer.networkStats()?.video).toEqual([]); }
    updateParticipantNetworkStats(call, NetworkQualityInfoSchema.parse(sample), 'sft', 'sft', 2000);
    expect(alice.networkStats()).toMatchObject({receivedAt: 2000, video: []});
  });

  it('uses the callback identity only for a direct User connection, leaving other endpoints untouched', () => {
    const info = NetworkQualityInfoSchema.parse({...sample, peer: 'User', rtt: 0, rx: {
      audio: [{...audio, trackId: 'a', userId: null, clientId: null}], video: [],
    }});
    updateParticipantNetworkStats(call, info, 'alice@example.com', 'desktop', 1000);
    expect(alice.networkStats()).toMatchObject({rttMs: null, quality: 1, audio: [audio]});
    expect(aliceMobile.networkStats()).toBeUndefined();
    expect(federatedAlice.networkStats()).toBeUndefined();
  });

  it('keeps legacy quality callbacks compatible and rejects malformed new metrics', () => {
    updateParticipantNetworkStats(call, NetworkQualityInfoSchema.parse({quality: 1}), 'alice', 'desktop', 1000);
    expect(self.networkStats()).toBeUndefined();
    expect(NetworkQualityInfoSchema.safeParse({...sample, tx: {audio: {...audio, bitrate: 'wrong'}, video}}).success).toBe(false);
    expect(NetworkQualityInfoSchema.safeParse({...sample, rx: {audio: [], video: null}}).success).toBe(false);
  });

  it('matches unlabelled tracks against the participant media stream and retains unknown quality as unknown', () => {
    alice.audioStream({getTracks: () => {return [{id: 'audio-track'}]}} as unknown as MediaStream);
    const info = NetworkQualityInfoSchema.parse({...sample, quality: 0, rx: {
      audio: [{...audio, trackId: 'audio-track', userId: null, clientId: null}], video: [],
    }});
    updateParticipantNetworkStats(call, info, 'sft', 'sft', 1000);
    expect(alice.networkStats()?.audio[0].bitrate).toBe(32000);
    expect(self.networkStats()?.quality).toBeNull();
    alice.audioStream(undefined);
  });
});
