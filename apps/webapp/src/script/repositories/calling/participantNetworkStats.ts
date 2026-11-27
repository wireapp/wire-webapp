/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {AudioMetrics, VideoMetrics, TrackSource} from '@wireapp/avs';

import type {Call} from './Call';
import type {NetworkQualityInfo} from './calling.schema';
import type {Participant} from './Participant';

import {matchQualifiedIds} from '../../util/qualifiedId';

export type ParticipantNetworkSample = {
  receivedAt: number;
  quality: number | null;
  rttMs: number | null;
  connection?: NetworkQualityInfo['connection'];
  peer?: NetworkQualityInfo['peer'];
  audio: AudioMetrics[];
  video: VideoMetrics[];
};

const matchesUser = (participant: Participant, serializedId: string): boolean => {
  const [id, domain = ''] = serializedId.split('@');
  return matchQualifiedIds(participant.user.qualifiedId, {id, domain});
};

/** Use explicit AVS identity first. Unlabelled SFT tracks must never be assigned to an arbitrary user. */
const findTrackParticipant = (
  participants: Participant[],
  source: TrackSource,
  fallback?: Participant,
): Participant | undefined => {
  const candidates = participants.filter(participant => {
    return (
      (source.userId === null || source.userId === '' || matchesUser(participant, source.userId)) &&
      (source.clientId === null || source.clientId === '' || participant.clientId === source.clientId)
    );
  });
  if (source.userId !== null && source.userId !== '' && source.clientId !== null && source.clientId !== '') {
    return candidates.length === 1 ? candidates[0] : undefined;
  }
  const byTrack = candidates.filter(participant => {
    return [participant.audioStream(), participant.videoStream()].some(stream => {
      return (
        stream?.getTracks().some(track => {
          return track.id === source.trackId;
        }) ?? false
      );
    });
  });
  if (byTrack.length === 1) {
    return byTrack[0];
  }
  if (source.userId !== null && source.userId !== '' && candidates.length === 1) {
    return candidates[0];
  }
  return fallback !== undefined && candidates.includes(fallback) ? fallback : undefined;
};

export const updateParticipantNetworkStats = (
  call: Call,
  info: NetworkQualityInfo,
  callbackUserId: string,
  callbackClientId: string,
  receivedAt: number,
): void => {
  if (info.tx === undefined || info.rx === undefined) {
    return;
  }
  const self = call.getSelfParticipant();
  const quality = info.quality === 0 ? null : info.quality;
  const rttMs = info.rtt !== undefined && info.rtt > 0 ? info.rtt : null;
  self.networkStats({
    receivedAt,
    quality,
    rttMs,
    connection: info.connection,
    peer: info.peer,
    audio: [info.tx.audio],
    video: [info.tx.video],
  });

  const peers = call.participants().filter(participant => {
    return participant !== self;
  });
  const endpoint =
    info.peer === 'User'
      ? peers.find(participant => {
          return matchesUser(participant, callbackUserId) && participant.clientId === callbackClientId;
        })
      : undefined;
  const samples = new Map<Participant, ParticipantNetworkSample>();
  // An SFT sample is a full RX snapshot; clear streams that disappeared. A P2P sample only updates its endpoint.
  let snapshotParticipants: Participant[] = [];
  if (info.peer === 'Server') {
    snapshotParticipants = peers;
  } else if (endpoint !== undefined) {
    snapshotParticipants = [endpoint];
  }
  for (const participant of snapshotParticipants) {
    samples.set(participant, {
      receivedAt,
      quality: endpoint === participant ? quality : null,
      rttMs: endpoint === participant ? rttMs : null,
      audio: [],
      video: [],
    });
  }
  const getSample = (participant: Participant): ParticipantNetworkSample => {
    let sample = samples.get(participant);
    if (sample === undefined) {
      sample = {receivedAt, quality: null, rttMs: null, audio: [], video: []};
      samples.set(participant, sample);
    }
    return sample;
  };
  for (const audio of info.rx.audio) {
    const participant = findTrackParticipant(peers, audio, endpoint);
    if (participant !== undefined) {
      getSample(participant).audio.push(audio);
    }
  }
  for (const video of info.rx.video) {
    const participant = findTrackParticipant(peers, video, endpoint);
    if (participant !== undefined) {
      getSample(participant).video.push(video);
    }
  }
  samples.forEach((sample, participant) => {
    participant.networkStats(sample);
  });
};
