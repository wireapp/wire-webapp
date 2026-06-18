import {FluidVideoGrid} from './components/FluidVideoGrid';
import {GRID_CONFIG} from './constants';
import {useFixtureState} from './useFixtureState';
import type {ViewportConfig} from './constants';

const BTN: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid #444',
  background: '#222',
  color: '#ccc',
  cursor: 'pointer',
  lineHeight: 1.4,
};

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN,
  background: '#0af3',
  borderColor: '#0af',
  color: '#fff',
};

interface FixtureInstanceProps {
  viewport: ViewportConfig;
  initialCount?: number;
}

export function FixtureInstance({viewport, initialCount = 2}: FixtureInstanceProps) {
  const {
    participants,
    rawParticipants,
    addParticipant,
    removeParticipant,
    toggleSpeaking,
    toggleCamera,
    toggleScreenshare,
    toggleMuted,
    canAddMore,
  } = useFixtureState(initialCount);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
      {/* Label */}
      <div style={{color: '#888', fontSize: 12, fontFamily: 'monospace'}}>
        {viewport.label} — {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </div>

      {/* Grid at fixed size */}
      <div
        style={{
          width: viewport.width,
          height: viewport.height,
          flexShrink: 0,
          border: '1px solid #333',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <FluidVideoGrid
          participants={participants}
          config={GRID_CONFIG}
          onViewAllParticipantsSelected={() => console.log('[fixture] view all participants')}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 4px',
          background: '#181818',
          borderRadius: 6,
          maxWidth: viewport.width,
        }}
      >
        <button
          style={{...BTN, alignSelf: 'flex-start', opacity: canAddMore ? 1 : 0.4}}
          onClick={addParticipant}
          disabled={!canAddMore}
        >
          + Add participant
        </button>

        {rawParticipants.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{fontSize: 11, color: '#aaa', minWidth: 60, flexShrink: 0}}>{p.name}</span>

            <button
              style={p.isSpeaking ? BTN_ACTIVE : BTN}
              onClick={() => toggleSpeaking(p.id)}
            >
              🎙 speak
            </button>

            <button
              style={p.hasCamera ? BTN_ACTIVE : BTN}
              onClick={() => toggleCamera(p.id)}
            >
              📷 cam
            </button>

            <button
              style={p.isSharingScreen ? BTN_ACTIVE : BTN}
              onClick={() => toggleScreenshare(p.id)}
            >
              🖥 screen
            </button>

            <button
              style={p.isMuted ? BTN_ACTIVE : BTN}
              onClick={() => toggleMuted(p.id)}
            >
              🔇 mute
            </button>

            <button
              style={{...BTN, color: '#f66', borderColor: '#f443'}}
              onClick={() => removeParticipant(p.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
