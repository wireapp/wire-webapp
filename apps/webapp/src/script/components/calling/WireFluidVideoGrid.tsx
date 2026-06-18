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

import {useEffect, useState} from 'react';

import ko from 'knockout';

import {FluidVideoGrid, deriveParticipantTier} from '@fluid-video-grid/components';
import type {GridConfig, GridParticipant} from '@fluid-video-grid/components';

import type {Call} from 'Repositories/calling/Call';
import type {Participant} from 'Repositories/calling/Participant';

import {Video} from './Video';

const GRID_CONFIG: GridConfig = {
  minTileHeight: 240,
  maxTileHeight: 600,
  minAspectRatio: 0.67,
  maxAspectRatio: 1.78,
  tileGap: 4,
};

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h * 31) + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function participantToGrid(p: Participant, isYou: boolean): GridParticipant {
  // Read all KO observables here — when called inside a ko.computed, every access is tracked
  const videoStream = p.hasActiveVideo() ? (p.processedVideoStream()?.stream ?? p.videoStream()) : undefined;
  const id = isYou ? 'self' : `${p.user.qualifiedId.id}/${p.clientId}`;

  return {
    id,
    name: p.user.name(),
    displayName: isYou ? `You (${p.user.name()})` : undefined,
    initials: isYou ? p.user.name().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : undefined,
    hue: hueFromId(id),
    renderVideo: videoStream
      ? () => (
        <Video
          srcObject={videoStream}
          autoPlay
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )
      : undefined,
    tier: deriveParticipantTier({
      isYou,
      isSharingScreen: p.sharesScreen(),
      isSpeaking: p.isActivelySpeaking(),
      hasCamera: p.sharesCamera(),
    }),
    isMuted: p.isMuted(),
    speakingDuration: 0,
  };
}

function useGridParticipants(call: Call): GridParticipant[] {
  const [gridParticipants, setGridParticipants] = useState<GridParticipant[]>([]);

  useEffect(() => {
    // ko.computed tracks every KO observable accessed inside it — call.participants(),
    // plus all per-participant observables read by participantToGrid. Any change to any
    // of them (join/leave, video on/off, mute, speaking) re-runs the computation and
    // produces a fresh GridParticipant[], eliminating the need for manual subscriptions.
    const computed = ko.computed<GridParticipant[]>(() => {
      const selfParticipant = call.getSelfParticipant();
      const all = call.participants();
      return [
        participantToGrid(selfParticipant, true),
        ...all.filter(p => p !== selfParticipant).map(p => participantToGrid(p, false)),
      ];
    });

    setGridParticipants(computed());
    const sub = computed.subscribe(setGridParticipants);

    return () => {
      sub.dispose();
      computed.dispose();
    };
  }, [call]);

  return gridParticipants;
}

interface WireFluidVideoGridProps {
  call: Call;
  presenterMode?: boolean;
  onPresenterModeRequested?: () => void;
  onViewAllParticipantsSelected?: () => void;
}

export function WireFluidVideoGrid({
  call,
  presenterMode,
  onPresenterModeRequested,
  onViewAllParticipantsSelected,
}: WireFluidVideoGridProps) {
  const gridParticipants = useGridParticipants(call);
  return (
    <FluidVideoGrid
      participants={gridParticipants}
      config={GRID_CONFIG}
      presenterMode={presenterMode}
      onPresenterModeRequested={onPresenterModeRequested}
      onViewAllParticipantsSelected={onViewAllParticipantsSelected}
    />
  );
}
