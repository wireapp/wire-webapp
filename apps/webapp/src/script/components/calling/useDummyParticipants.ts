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

import {useEffect, useRef, useState} from 'react';

import {VIDEO_STATE} from '@wireapp/avs';

import {Participant} from 'Repositories/calling/Participant';
import {User} from 'Repositories/entity/User';

const STORAGE_KEY = 'wire-debug-dummy-participants';
const CHANGE_EVENT = 'wire-debug-dummy-participants-changed';

const DUMMY_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Quinn', 'Morgan', 'Taylor', 'Casey', 'Drew', 'Avery', 'Blake', 'Rowan'];

function createDummyStream(name: string, hue: number): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;
  let frame = 0;
  const intervalId = setInterval(() => {
    frame++;
    ctx.fillStyle = `hsl(${hue}, 55%, 28%)`;
    ctx.fillRect(0, 0, 320, 180);
    const x = 160 + Math.sin(frame * 0.05) * 80;
    const y = 80 + Math.cos(frame * 0.04) * 40;
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 160, 165);
  }, 1000 / 15);
  const stream = (canvas as any).captureStream(15) as MediaStream;
  (stream as any).__dummyStop = () => clearInterval(intervalId);
  return stream;
}

function makeDummyParticipant(index: number): Participant {
  const name = DUMMY_NAMES[index % DUMMY_NAMES.length];
  const user = new User(`wire-dummy-${index}`, 'dummy.local');
  user.name(name);
  const participant = new Participant(user, `dummy-client-${index}`);
  const stream = createDummyStream(name, (index * 30) % 360);
  participant.videoStream(stream);
  participant.videoState(VIDEO_STATE.STARTED);
  participant.isAudioEstablished(true);
  return participant;
}

function stopDummyStreams(participants: Participant[]): void {
  participants.forEach(p => {
    const stream = p.videoStream();
    if (stream && (stream as any).__dummyStop) {
      (stream as any).__dummyStop();
    }
  });
}

/**
 * Sets the number of dummy participants to inject into the video grid.
 * Exposed via `window.wire.app.debug.setDummyParticipants(count)`.
 * Persists in localStorage across reloads. Pass 0 to remove all dummies.
 */
export function setDummyParticipantCount(count: number): void {
  if (count > 0) {
    localStorage.setItem(STORAGE_KEY, String(count));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, {detail: count}));
}

/**
 * Returns an array of dummy Participant objects with animated canvas video streams.
 * Returns an empty array when the debug flag is not set (zero production overhead).
 */
export function useDummyParticipants(): Participant[] {
  const [count, setCount] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Math.max(0, parseInt(stored, 10)) : 0;
  });

  useEffect(() => {
    const handler = (e: Event) => setCount((e as CustomEvent<number>).detail);
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const participantsRef = useRef<Participant[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    stopDummyStreams(participantsRef.current);

    if (count <= 0) {
      participantsRef.current = [];
      setParticipants([]);
      return undefined;
    }

    const newParticipants = Array.from({length: count}, (_, i) => makeDummyParticipant(i));
    participantsRef.current = newParticipants;
    setParticipants(newParticipants);

    return () => stopDummyStreams(newParticipants);
  }, [count]);

  return participants;
}
