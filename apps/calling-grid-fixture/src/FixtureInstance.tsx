import {useEffect, useReducer, useState} from 'react';

import {FluidVideoGrid} from './components/FluidVideoGrid';
import {GRID_CONFIG, VIEWPORT_CONFIGS} from './constants';
import {MOCK_PEOPLE} from './mockData';
import {useFixtureState} from './useFixtureState';

// ── SVG icons (match wire-call-grid-reference.html exactly) ──────────────────

const IcMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 13, height: 13}}>
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10v1a7 7 0 0 0 14 0v-1"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
  </svg>
);

const IcMicOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 13, height: 13}}>
    <line x1="3" y1="3" x2="21" y2="21"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.94-.6"/>
    <path d="M9 9v3a3 3 0 0 0 4.6 2.54"/>
    <path d="M5 10v1a7 7 0 0 0 10.4 6.13"/>
    <path d="M19 10v1a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
  </svg>
);

const IcVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 13, height: 13}}>
    <path d="M23 7l-7 5 7 5z"/>
    <rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);

const IcVideoOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 13, height: 13}}>
    <path d="M16 16H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/>
    <path d="M9 6h5a2 2 0 0 1 2 2v3l1 1 4-3v9"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);

const IcShare = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 13, height: 13}}>
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const IcTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 13, height: 13}}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarGrad(hue: number) {
  return `linear-gradient(135deg,hsl(${hue},55%,60%) 0%,hsl(${hue},50%,38%) 100%)`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const BLUE = '#0667C8';
const BLUE_50 = '#E7F0FA';
const BLUE_BORDER = '#6AA4DE';
const RED = '#C20013';
const PANEL_LINE = '#e7e9ee';
const INK = '#1f232b';
const INK_DIM = '#6b7280';

const chip = (active: boolean, danger = false): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  border: `1px solid ${active ? (danger ? '#e7a3ab' : BLUE_BORDER) : PANEL_LINE}`,
  background: active ? (danger ? '#fdeef0' : BLUE_50) : '#fff',
  color: active ? (danger ? RED : BLUE) : '#42474f',
  borderRadius: 8,
  padding: '4px 8px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  lineHeight: 1,
  fontFamily: 'inherit',
});

const switchTrack = (on: boolean): React.CSSProperties => ({
  position: 'relative',
  width: 40,
  height: 22,
  borderRadius: 100,
  background: on ? BLUE : '#cfd4dc',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background .15s',
  border: 'none',
  outline: 'none',
  padding: 0,
  appearance: 'none' as React.CSSProperties['appearance'],
});

const switchThumb: React.CSSProperties = {
  position: 'absolute',
  top: 2,
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 2px rgba(0,0,0,.25)',
  transition: 'left .15s',
  pointerEvents: 'none',
};

// ── Main component ────────────────────────────────────────────────────────────

interface FixtureInstanceProps {
  initialCount?: number;
}

export function FixtureInstance({initialCount = 2}: FixtureInstanceProps) {
  const [vpIndex, setVpIndex] = useState(1); // default 1280×720
  const viewport = VIEWPORT_CONFIGS[vpIndex];
  const [panelOpen, setPanelOpen] = useState(true);

  const {
    participants,
    rawParticipants,
    addParticipant,
    removeParticipant,
    setParticipantCount,
    toggleSpeaking,
    toggleCamera,
    toggleScreenshare,
    toggleMuted,
    canAddMore,
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
  } = useFixtureState(initialCount);

  // Local ticker to animate reservation bars while anyone is promoted
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const hasPromoted = promotedIds.size > 0;
  useEffect(() => {
    if (!hasPromoted) return;
    const id = setInterval(forceUpdate, 50);
    return () => clearInterval(id);
  }, [hasPromoted]);

  // Mic toggle: muting also stops talking
  const handleMicToggle = (id: string) => {
    const p = rawParticipants.find(x => x.id === id);
    if (!p) return;
    if (!p.isMuted && p.isSpeaking) toggleSpeaking(id); // muting → stop talking
    toggleMuted(id);
  };

  // Talk toggle: starting talk also unmutes
  const handleTalkToggle = (id: string) => {
    const p = rawParticipants.find(x => x.id === id);
    if (!p) return;
    if (!p.isSpeaking && p.isMuted) toggleMuted(id); // talking → unmute
    toggleSpeaking(id);
  };

  return (
    <div style={{display: 'flex', width: '100%', height: '100%', overflow: 'hidden'}}>

      {/* ── Left: stage area (non-scrollable, grid centered) ── */}
      <div style={{flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, minWidth: 0, overflow: 'hidden', gap: 10, position: 'relative'}}>
        <div style={{color: INK_DIM, fontSize: 12, fontFamily: 'monospace', alignSelf: 'flex-start'}}>
          {viewport.label} — {participants.length} participant{participants.length !== 1 ? 's' : ''}
        </div>
        <div
          style={{
            width: viewport.width,
            height: viewport.height,
            flexShrink: 0,
            border: `1px solid #9FA1A7`,
            borderRadius: 12,
            boxShadow: '0 18px 50px -12px rgba(0,0,0,.30), 0 4px 8px rgba(0,0,0,.14)',
            overflow: 'hidden',
          }}
        >
          <FluidVideoGrid
            participants={participants}
            config={GRID_CONFIG}
            onViewAllParticipantsSelected={() => console.log('[fixture] view all participants')}
          />
        </div>

        {/* Show panel button (visible when panel is hidden) */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${PANEL_LINE}`,
              background: '#fff',
              color: INK,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,.12)',
              fontFamily: 'inherit',
            }}
          >
            ⚙ Controls
          </button>
        )}
      </div>

      {/* ── Right: panel (collapsible, independently scrollable) ── */}
      <aside
        style={{
          flex: panelOpen ? '0 0 360px' : '0 0 0px',
          width: panelOpen ? 360 : 0,
          background: '#fff',
          borderLeft: panelOpen ? `1px solid ${PANEL_LINE}` : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'flex-basis .25s ease, width .25s ease',
        }}
      >
        {/* Panel header (sticky) */}
        <div style={{padding: '18px 18px 12px', borderBottom: `1px solid ${PANEL_LINE}`, flexShrink: 0, position: 'relative', minWidth: 324}}>
          <button
            onClick={() => setPanelOpen(false)}
            title="Hide controls"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 28,
              height: 28,
              borderRadius: 7,
              border: `1px solid ${PANEL_LINE}`,
              background: '#fff',
              color: INK_DIM,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
          <div style={{fontSize: 15, fontWeight: 700, letterSpacing: .2, color: INK, paddingRight: 36}}>Grid view fixture</div>
          <div style={{marginTop: 4, fontSize: 12, color: INK_DIM, lineHeight: 1.45}}>
            Tiles go to whoever is <b>in focus</b> — recently talking. Everyone else collects into the last tile. Drive it below or simulate a conversation.
          </div>
        </div>

        {/* Scrollable content (independent of grid) */}
        <div style={{flex: '1 1 auto', overflowY: 'auto', padding: '14px 18px 28px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 324}}>

          {/* ── Call group ── */}
          <div>
            <GroupHeader>Call</GroupHeader>
            <Field label="Viewport">
              <select
                value={vpIndex}
                onChange={e => setVpIndex(Number(e.target.value))}
                style={{width: '100%', fontSize: 13, padding: '4px 6px', borderRadius: 6, border: `1px solid ${PANEL_LINE}`, background: '#fff', color: INK, cursor: 'pointer'}}
              >
                {VIEWPORT_CONFIGS.map((v, i) => (
                  <option key={v.label} value={i}>{v.label}</option>
                ))}
              </select>
            </Field>
            <ToggleRow label="Simulate conversation" on={simulationEnabled} onToggle={toggleSimulation} />
          </div>

          {/* ── Timing logic group ── */}
          <div>
            <GroupHeader>Timing logic</GroupHeader>
            <Field label="Promotion delay" value={`${(debounceMs / 1000).toFixed(1)}s`}>
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.1}
                value={debounceMs / 1000}
                onChange={e => setDebounceMs(Number(e.target.value) * 1000)}
                style={{width: '100%', accentColor: BLUE}}
              />
              <div style={{fontSize: 11, color: INK_DIM, marginTop: 4, lineHeight: 1.4}}>
                How long someone must talk continuously before they earn a front-page tile.
              </div>
            </Field>
            <Field label="Front-page hold" value={`${(holdMs / 1000).toFixed(0)}s`}>
              <input
                type="range"
                min={3}
                max={30}
                step={1}
                value={holdMs / 1000}
                onChange={e => setHoldMs(Number(e.target.value) * 1000)}
                style={{width: '100%', accentColor: BLUE}}
              />
              <div style={{fontSize: 11, color: INK_DIM, marginTop: 4, lineHeight: 1.4}}>
                After being promoted, a speaker keeps their tile at least this long — prevents flicker.
              </div>
            </Field>
          </div>

          {/* ── Participants group ── */}
          <div>
            <div style={{marginBottom: 10}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                <GroupHeader style={{margin: 0}}>Participants</GroupHeader>
                <span style={{fontSize: 12, color: INK_DIM, fontVariantNumeric: 'tabular-nums'}}>
                  {rawParticipants.length + 1} / {MOCK_PEOPLE.length + 1}
                </span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <button
                  onClick={() => setParticipantCount(rawParticipants.length - 1)}
                  disabled={rawParticipants.length <= 0}
                  style={{
                    width: 26, height: 26, borderRadius: 7,
                    border: `1px solid ${PANEL_LINE}`,
                    background: rawParticipants.length > 0 ? '#fff' : '#f5f5f5',
                    color: rawParticipants.length > 0 ? INK : INK_DIM,
                    cursor: rawParticipants.length > 0 ? 'pointer' : 'default',
                    fontSize: 16, fontWeight: 600, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontFamily: 'inherit', padding: 0,
                  }}
                  title="Remove one"
                >
                  −
                </button>
                <input
                  type="range"
                  min={0}
                  max={MOCK_PEOPLE.length}
                  value={rawParticipants.length}
                  onChange={e => setParticipantCount(Number(e.target.value))}
                  style={{flex: 1, accentColor: BLUE, cursor: 'pointer'}}
                />
                <button
                  onClick={addParticipant}
                  disabled={!canAddMore}
                  style={{
                    width: 26, height: 26, borderRadius: 7,
                    border: `1px solid ${PANEL_LINE}`,
                    background: canAddMore ? '#fff' : '#f5f5f5',
                    color: canAddMore ? INK : INK_DIM,
                    cursor: canAddMore ? 'pointer' : 'default',
                    fontSize: 16, fontWeight: 600, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontFamily: 'inherit', padding: 0,
                  }}
                  title="Add one"
                >
                  +
                </button>
              </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              {/* You row — always present, no delete/speak/share */}
              <div
                style={{
                  border: `1px solid ${BLUE_BORDER}`,
                  borderRadius: 10,
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  background: BLUE_50,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: avatarGrad(220),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    YO
                  </div>
                  <div style={{fontSize: 13, fontWeight: 600, flex: '1 1 auto', minWidth: 0, color: INK}}>
                    You
                  </div>
                  <span style={{fontSize: 10.5, fontWeight: 700, letterSpacing: .2, padding: '2px 6px', borderRadius: 6, background: BLUE_50, color: BLUE, border: `1px solid ${BLUE_BORDER}`, whiteSpace: 'nowrap', flexShrink: 0}}>
                    You
                  </span>
                </div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                  <button style={chip(youHasCamera)} onClick={toggleYouCamera}>
                    {youHasCamera ? <IcVideo /> : <IcVideoOff />}
                    {youHasCamera ? 'Camera' : 'Cam off'}
                  </button>
                  <button style={chip(!youIsMuted)} onClick={toggleYouMuted}>
                    {youIsMuted ? <IcMicOff /> : <IcMic />}
                    {youIsMuted ? 'Muted' : 'Mic on'}
                  </button>
                </div>
              </div>

              {rawParticipants.map(p => {
                const isPromoted = promotedIds.has(p.id);
                const promotedUntil = getPromotedUntil(p.id);
                const holdPct =
                  promotedUntil !== null
                    ? Math.max(0, Math.min(100, ((promotedUntil - performance.now()) / holdMs) * 100))
                    : 0;

                return (
                  <div
                    key={p.id}
                    style={{
                      border: `1px solid ${PANEL_LINE}`,
                      borderRadius: 10,
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                      background: '#fcfcfd',
                    }}
                  >
                    {/* Top row: avatar + name + status */}
                    <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          flexShrink: 0,
                          ...(p.avatarUrl
                            ? {backgroundImage: `url('${p.avatarUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center'}
                            : {background: avatarGrad(p.hue)}),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {p.avatarUrl ? null : initials(p.name)}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          flex: '1 1 auto',
                          minWidth: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: INK,
                        }}
                      >
                        {p.name}
                      </div>
                      {isPromoted && (
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: .2,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: BLUE_50,
                          color: BLUE,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          Speaker
                        </span>
                      )}
                      <button
                        onClick={() => removeParticipant(p.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#bbb',
                          cursor: 'pointer',
                          padding: '2px 3px',
                          borderRadius: 4,
                          lineHeight: 1,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Remove"
                      >
                        <IcTrash />
                      </button>
                    </div>

                    {/* Reservation bar */}
                    <div style={{height: 4, borderRadius: 3, background: '#e9ecf1', overflow: 'hidden', opacity: isPromoted ? 1 : 0.25}}>
                      <div style={{
                        height: '100%',
                        width: `${holdPct}%`,
                        background: BLUE,
                        transition: 'width .12s linear',
                      }} />
                    </div>

                    {/* Chip controls */}
                    <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                      <button style={chip(p.hasCamera)} onClick={() => toggleCamera(p.id)}>
                        {p.hasCamera ? <IcVideo /> : <IcVideoOff />}
                        {p.hasCamera ? 'Camera' : 'Cam off'}
                      </button>
                      <button style={chip(!p.isMuted)} onClick={() => handleMicToggle(p.id)}>
                        {p.isMuted ? <IcMicOff /> : <IcMic />}
                        {p.isMuted ? 'Muted' : 'Mic on'}
                      </button>
                      <button style={chip(p.isSharingScreen)} onClick={() => toggleScreenshare(p.id)}>
                        <IcShare />
                        Share
                      </button>
                      <button style={chip(p.isSpeaking, true)} onClick={() => handleTalkToggle(p.id)}>
                        <IcMic />
                        {p.isSpeaking ? 'Talking…' : 'Talk'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Legend ── */}
          <div>
            <GroupHeader>Reading the tiles</GroupHeader>
            <div style={{fontSize: 11, color: INK_DIM, lineHeight: 1.5}}>
              <b style={{color: INK}}>Blue ring + blue label</b> — speaking now.<br />
              <b style={{color: INK}}>Mic badge</b> (bottom-left) — muted.<br />
              <b style={{color: INK}}>Grey tile + avatar</b> — camera off.<br />
              <b style={{color: INK}}>Blue "Speaker"</b> — holding a front-page tile via promotion.
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function GroupHeader({children, style}: {children: React.ReactNode; style?: React.CSSProperties}) {
  return (
    <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: .7, color: INK_DIM, fontWeight: 700, marginBottom: 10, ...style}}>
      {children}
    </div>
  );
}

function Field({label, value, children}: {label: string; value?: string; children: React.ReactNode}) {
  return (
    <div style={{marginBottom: 14}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: INK}}>
        <span>{label}</span>
        {value && <span style={{color: BLUE, fontVariantNumeric: 'tabular-nums'}}>{value}</span>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({label, on, onToggle}: {label: string; on: boolean; onToggle: () => void}) {
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: INK, marginBottom: 14}}>
      <span>{label}</span>
      <button
        onClick={onToggle}
        style={switchTrack(on)}
        aria-checked={on}
        role="switch"
      >
        <div style={{...switchThumb, left: on ? 20 : 2}} />
      </button>
    </div>
  );
}
