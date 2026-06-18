import {useCallback, useMemo, useState} from 'react';

import {deriveParticipantTier, GridParticipant} from './components/FluidVideoGrid';
import {MOCK_PEOPLE} from './mockData';

interface ParticipantState {
  id: string;
  name: string;
  avatarUrl: string;
  screenshareUrl: string;
  isSharingScreen: boolean;
  isSpeaking: boolean;
  hasCamera: boolean;
  isMuted: boolean;
  speakingDuration: number;
}

interface FixtureState {
  participants: GridParticipant[];
  rawParticipants: ParticipantState[];
  addParticipant: () => void;
  removeParticipant: (id: string) => void;
  toggleSpeaking: (id: string) => void;
  toggleCamera: (id: string) => void;
  toggleScreenshare: (id: string) => void;
  toggleMuted: (id: string) => void;
  canAddMore: boolean;
}

function toGridParticipant(p: ParticipantState): GridParticipant {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.hasCamera || p.isSharingScreen ? p.screenshareUrl : p.avatarUrl,
    tier: deriveParticipantTier({
      isSharingScreen: p.isSharingScreen,
      isSpeaking: p.isSpeaking,
      hasCamera: p.hasCamera,
    }),
    isMuted: p.isMuted,
    speakingDuration: p.speakingDuration,
  };
}

function makeInitial(person: (typeof MOCK_PEOPLE)[0]): ParticipantState {
  return {
    id: person.id,
    name: person.name,
    avatarUrl: person.avatarUrl,
    screenshareUrl: person.screenshareUrl,
    isSharingScreen: false,
    isSpeaking: false,
    hasCamera: false,
    isMuted: false,
    speakingDuration: 0,
  };
}

export function useFixtureState(initialCount = 2): FixtureState {
  const [raw, setRaw] = useState<ParticipantState[]>(() =>
    MOCK_PEOPLE.slice(0, initialCount).map(makeInitial),
  );

  const toggle = useCallback((id: string, field: keyof ParticipantState) => {
    setRaw(prev =>
      prev.map(p =>
        p.id === id ? {...p, [field]: !(p[field] as boolean)} : p,
      ),
    );
  }, []);

  const addParticipant = useCallback(() => {
    setRaw(prev => {
      const usedIds = new Set(prev.map(p => p.id));
      const next = MOCK_PEOPLE.find(m => !usedIds.has(m.id));
      if (!next) return prev;
      return [...prev, makeInitial(next)];
    });
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setRaw(prev => prev.filter(p => p.id !== id));
  }, []);

  const participants = useMemo(() => raw.map(toGridParticipant), [raw]);

  return {
    participants,
    rawParticipants: raw,
    addParticipant,
    removeParticipant,
    toggleSpeaking: (id: string) => toggle(id, 'isSpeaking'),
    toggleCamera: (id: string) => toggle(id, 'hasCamera'),
    toggleScreenshare: (id: string) => toggle(id, 'isSharingScreen'),
    toggleMuted: (id: string) => toggle(id, 'isMuted'),
    canAddMore: raw.length < MOCK_PEOPLE.length,
  };
}
