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

import { useEffect, useState } from 'react';

import { FluidVideoGrid, deriveParticipantTier } from '@fluid-video-grid/components';
import type { GridConfig, GridParticipant } from '@fluid-video-grid/components';

import type { Participant } from 'Repositories/calling/Participant';

import { Video } from './Video';

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
  const videoStream = p.hasActiveVideo() ? (p.processedVideoStream()?.stream ?? p.videoStream()) : undefined;
  const id = isYou ? 'self' : `${p.user.qualifiedId.id}/${p.clientId}`;

  return {
    id,
    name: p.user.name(),
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

function useGridParticipants(participants: Participant[], selfParticipant: Participant): GridParticipant[] {
  const [gridParticipants, setGridParticipants] = useState<GridParticipant[]>(() => [
    participantToGrid(selfParticipant, true),
    ...participants.map(p => participantToGrid(p, false)),
  ]);

  useEffect(() => {
    const rebuild = () => {
      setGridParticipants([
        participantToGrid(selfParticipant, true),
        ...participants.map(p => participantToGrid(p, false)),
      ]);
    };

    rebuild();

    const subs: { dispose: () => void }[] = [];
    for (const p of [selfParticipant, ...participants]) {
      subs.push(p.videoStream.subscribe(rebuild));
      subs.push(p.processedVideoStream.subscribe(rebuild));
      subs.push(p.videoState.subscribe(rebuild));
      subs.push(p.isMuted.subscribe(rebuild));
      subs.push(p.isActivelySpeaking.subscribe(rebuild));
    }

    return () => subs.forEach(s => s.dispose());
  }, [participants, selfParticipant]);

  return gridParticipants;
}

interface WireFluidVideoGridProps {
  participants: Participant[];
  selfParticipant: Participant;
  onViewAllParticipantsSelected?: () => void;
}

export function WireFluidVideoGrid({
  participants,
  selfParticipant,
  onViewAllParticipantsSelected,
}: WireFluidVideoGridProps) {
  const gridParticipants = useGridParticipants(participants, selfParticipant);
  return (
    <FluidVideoGrid
      participants={gridParticipants}
      config={GRID_CONFIG}
      onViewAllParticipantsSelected={onViewAllParticipantsSelected}
    />
  );
}
