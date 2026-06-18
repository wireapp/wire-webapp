import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {GridParticipant, deriveParticipantTier} from './components/FluidVideoGrid';
import {MOCK_PEOPLE} from './mockData';
import {PRIME_HOLD_MS, SPEAKING_DEBOUNCE_MS} from './constants';

export const YOU_ID = '__you__';

interface ParticipantState {
  id: string;
  name: string;
  avatarUrl: string;
  cameraUrl: string;
  screenshareUrl: string;
  hue: number;
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
  isMuted: boolean;
  speakingDuration: number;
}

interface DebounceEntry {
  talkingSince: number | null;
  promotedUntil: number | null;
}

export interface FixtureState {
  participants: GridParticipant[];
  rawParticipants: ParticipantState[];
  addParticipant: () => void;
  removeParticipant: (id: string) => void;
  setParticipantCount: (n: number) => void;
  toggleSpeaking: (id: string) => void;
  toggleCamera: (id: string) => void;
  toggleScreenshare: (id: string) => void;
  toggleMuted: (id: string) => void;
  canAddMore: boolean;
  debounceMs: number;
  setDebounceMs: (v: number) => void;
  holdMs: number;
  setHoldMs: (v: number) => void;
  simulationEnabled: boolean;
  toggleSimulation: () => void;
  promotedIds: Set<string>;
  getPromotedUntil: (id: string) => number | null;
  youHasCamera: boolean;
  youIsMuted: boolean;
  toggleYouCamera: () => void;
  toggleYouMuted: () => void;
}

function makeVideoEl(src: string): () => React.ReactNode {
  return () =>
    React.createElement('img', {
      src,
      alt: '',
      style: {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block'},
    });
}

function toGridParticipant(p: ParticipantState, promotedIds: Set<string>): GridParticipant {
  const videoSrc = p.isSharingScreen
    ? p.screenshareUrl
    : p.hasCamera && p.cameraUrl
      ? p.cameraUrl
      : null;
  return {
    id: p.id,
    name: p.name,
    ...(p.avatarUrl ? {avatarUrl: p.avatarUrl} : {}),
    hue: p.hue,
    renderVideo: videoSrc ? makeVideoEl(videoSrc) : undefined,
    tier: deriveParticipantTier({
      isYou: false,
      isSharingScreen: p.isSharingScreen,
      isSpeaking: promotedIds.has(p.id),
      hasCamera: p.hasCamera,
    }),
    isMuted: p.isMuted,
    speakingDuration: p.speakingDuration,
  };
}

function makeInitial(person: (typeof MOCK_PEOPLE)[0], index: number): ParticipantState {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: person.avatarUrl,
    cameraUrl: person.cameraUrl,
    screenshareUrl: person.screenshareUrl,
    hue: (index * 47) % 360,
    isSharingScreen: false,
    isSpeaking: false,
    hasCamera: false,
    isMuted: false,
    speakingDuration: 0,
  };
}

export function useFixtureState(initialCount = 2): FixtureState {
  const [raw, setRaw] = useState<ParticipantState[]>(() =>
    MOCK_PEOPLE.slice(0, initialCount).map((p, i) => makeInitial(p, i)),
  );

  const [youHasCamera, setYouHasCamera] = useState(true);
  const [youIsMuted, setYouIsMuted] = useState(false);

  const [debounceMs, setDebounceMs] = useState(SPEAKING_DEBOUNCE_MS);
  const [holdMs, setHoldMs] = useState(PRIME_HOLD_MS);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());

  // Refs for the rAF loop — avoids stale closures without re-registering the loop
  const rawRef = useRef(raw);
  useEffect(() => {
    rawRef.current = raw;
  }, [raw]);

  const debounceMsRef = useRef(debounceMs);
  useEffect(() => {
    debounceMsRef.current = debounceMs;
  }, [debounceMs]);

  const holdMsRef = useRef(holdMs);
  useEffect(() => {
    holdMsRef.current = holdMs;
  }, [holdMs]);

  const simEnabledRef = useRef(simulationEnabled);
  useEffect(() => {
    simEnabledRef.current = simulationEnabled;
  }, [simulationEnabled]);

  // Per-participant debounce tracking — mutable, never triggers renders
  const debounceStateRef = useRef<Map<string, DebounceEntry>>(new Map());

  // promotedUntil timestamps — read by FixtureInstance via getPromotedUntil during its own renders
  const promotedUntilMapRef = useRef<Record<string, number>>({});

  const getPromotedUntil = useCallback((id: string) => promotedUntilMapRef.current[id] ?? null, []);

  // Simulation state — mutable
  const simRef = useRef<{speakers: {id: string; until: number}[]; nextSpeakTime: number}>({
    speakers: [],
    nextSpeakTime: 0,
  });

  // Single rAF loop — reads everything from refs, writes to state only when values change
  useEffect(() => {
    let rafId: number;

    function tick() {
      const now = performance.now();
      const currentRaw = rawRef.current;

      // ── Simulation ──────────────────────────────────────────────────────────
      if (simEnabledRef.current) {
        const sim = simRef.current;

        const expiredIds = new Set(sim.speakers.filter(s => now >= s.until).map(s => s.id));
        sim.speakers = sim.speakers.filter(s => now < s.until);

        const rawChanges: Record<string, Partial<ParticipantState>> = {};
        for (const id of expiredIds) rawChanges[id] = {isSpeaking: false};

        if (now >= sim.nextSpeakTime) {
          sim.nextSpeakTime = now + 700 + Math.random() * 1600;
          const candidates = currentRaw.filter(
            p => !p.isSpeaking && !p.isMuted && !p.isSharingScreen && !expiredIds.has(p.id),
          );
          if (candidates.length > 0 && sim.speakers.length < 3 && Math.random() < 0.8) {
            const chosen = candidates[Math.floor(Math.random() * candidates.length)];
            sim.speakers.push({id: chosen.id, until: now + 2200 + Math.random() * 6000});
            rawChanges[chosen.id] = {isSpeaking: true};
          }
        }

        const changedIds = Object.keys(rawChanges);
        if (changedIds.length > 0) {
          setRaw(prev => prev.map(p => (changedIds.includes(p.id) ? {...p, ...rawChanges[p.id]} : p)));
        }
      }

      // ── Debounce / Promotion ────────────────────────────────────────────────
      const newPromotedUntilMap: Record<string, number> = {};

      for (const p of currentRaw) {
        const entry: DebounceEntry = debounceStateRef.current.get(p.id) ?? {
          talkingSince: null,
          promotedUntil: null,
        };

        if (p.isSharingScreen) {
          // Screen-share bypasses debounce; hold resets every tick while sharing
          entry.talkingSince = null;
          entry.promotedUntil = now + holdMsRef.current;
        } else if (p.isSpeaking) {
          if (entry.talkingSince === null) entry.talkingSince = now;
          if (now - entry.talkingSince >= debounceMsRef.current) {
            // Continuously refresh hold while speaking — starts counting down after they stop
            entry.promotedUntil = now + holdMsRef.current;
          }
        } else {
          entry.talkingSince = null;
          // Don't clear promotedUntil — hold keeps them in prime position after stopping
        }

        if (entry.promotedUntil !== null && now >= entry.promotedUntil) {
          entry.promotedUntil = null;
        }

        if (entry.promotedUntil !== null) {
          newPromotedUntilMap[p.id] = entry.promotedUntil;
        }

        debounceStateRef.current.set(p.id, entry);
      }

      // Clean up state for removed participants
      for (const id of debounceStateRef.current.keys()) {
        if (!currentRaw.some(p => p.id === id)) debounceStateRef.current.delete(id);
      }

      promotedUntilMapRef.current = newPromotedUntilMap;

      const newPromotedIds = new Set(Object.keys(newPromotedUntilMap));
      setPromotedIds(prev => {
        if (prev.size === newPromotedIds.size && [...prev].every(id => newPromotedIds.has(id))) return prev;
        return newPromotedIds;
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []); // empty — reads from refs

  const toggle = useCallback((id: string, field: keyof ParticipantState) => {
    setRaw(prev => prev.map(p => (p.id === id ? {...p, [field]: !(p[field] as boolean)} : p)));
  }, []);

  const addParticipant = useCallback(() => {
    setRaw(prev => {
      const usedIds = new Set(prev.map(p => p.id));
      const nextIdx = MOCK_PEOPLE.findIndex(m => !usedIds.has(m.id));
      if (nextIdx === -1) return prev;
      return [...prev, makeInitial(MOCK_PEOPLE[nextIdx], prev.length)];
    });
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setRaw(prev => prev.filter(p => p.id !== id));
    simRef.current.speakers = simRef.current.speakers.filter(s => s.id !== id);
  }, []);

  const setParticipantCount = useCallback((n: number) => {
    const target = Math.max(1, Math.min(MOCK_PEOPLE.length, n));
    setRaw(prev => {
      if (target === prev.length) return prev;
      if (target < prev.length) {
        const removed = new Set(prev.slice(target).map(p => p.id));
        simRef.current.speakers = simRef.current.speakers.filter(s => !removed.has(s.id));
        return prev.slice(0, target);
      }
      const usedIds = new Set(prev.map(p => p.id));
      const toAdd = MOCK_PEOPLE.filter(m => !usedIds.has(m.id)).slice(0, target - prev.length);
      return [...prev, ...toAdd.map((p, i) => makeInitial(p, prev.length + i))];
    });
  }, []);

  const toggleSimulation = useCallback(() => {
    setSimulationEnabled(prev => {
      if (prev) {
        // Turning off — stop all simulated speakers
        const sim = simRef.current;
        const simIds = new Set(sim.speakers.map(s => s.id));
        sim.speakers = [];
        sim.nextSpeakTime = 0;
        if (simIds.size > 0) {
          setRaw(p => p.map(q => (simIds.has(q.id) ? {...q, isSpeaking: false} : q)));
        }
      }
      return !prev;
    });
  }, []);

  const toggleYouCamera = useCallback(() => setYouHasCamera(v => !v), []);
  const toggleYouMuted = useCallback(() => setYouIsMuted(v => !v), []);

  const youParticipant = useMemo<GridParticipant>(
    () => ({
      id: YOU_ID,
      name: 'You',
      hue: 220,
      tier: 'you',
      isMuted: youIsMuted,
      speakingDuration: 0,
    }),
    [youIsMuted],
  );

  const participants = useMemo(
    () => [youParticipant, ...raw.map(p => toGridParticipant(p, promotedIds))],
    [youParticipant, raw, promotedIds],
  );

  return {
    participants,
    rawParticipants: raw,
    addParticipant,
    removeParticipant,
    setParticipantCount,
    toggleSpeaking: (id: string) => toggle(id, 'isSpeaking'),
    toggleCamera: (id: string) => toggle(id, 'hasCamera'),
    toggleScreenshare: (id: string) => toggle(id, 'isSharingScreen'),
    toggleMuted: (id: string) => toggle(id, 'isMuted'),
    canAddMore: raw.length < MOCK_PEOPLE.length,
    debounceMs,
    setDebounceMs,
    holdMs,
    setHoldMs,
    simulationEnabled,
    toggleSimulation,
    promotedIds,
    getPromotedUntil,
    youHasCamera,
    youIsMuted,
    toggleYouCamera,
    toggleYouMuted,
  };
}
