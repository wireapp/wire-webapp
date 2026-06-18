import {GridParticipant} from './FluidVideoGrid.types';

const TILE_BG = '#34373D';
const RING_BLUE = '#0667C8';

function avatarGrad(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 55% 56%), hsl(${(hue + 28) % 360} 58% 40%))`;
}

interface GridTileProps {
  participant: GridParticipant;
  isActiveSpeaker?: boolean;
}

export function GridTile({participant, isActiveSpeaker}: GridTileProps) {
  const {name, displayName, initials: initialsOverride, avatarUrl, hue = 200, renderVideo, isMuted} = participant;
  const initials = initialsOverride ?? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const label = displayName ?? name;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: TILE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Video feed (camera on / screenshare) */}
      {renderVideo && renderVideo()}

      {/* Camera-off: centered round avatar */}
      {!renderVideo && (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', display: 'block'}}
            />
          ) : (
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: avatarGrad(hue),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {initials}
            </div>
          )}
        </div>
      )}

      {/* Active speaker ring — drawn above video so it's never obscured */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 6,
          pointerEvents: 'none',
          boxShadow: isActiveSpeaker
            ? `inset 0 0 0 3px ${RING_BLUE}, inset 0 0 0 6px #fff`
            : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      />

      {/* Mute badge */}
      {isMuted && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            width: 22,
            height: 22,
            borderRadius: 4,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 14" stroke="#C20013" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M8 1a3 3 0 013 3v3.586L5.414 2A3 3 0 018 1zM5 4.586V7a3 3 0 004.586 2.586M10.94 10.94A5 5 0 013 8H1a7 7 0 0011.142 5.656M8 13v2M6 15h4"
              stroke="#C20013"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Name pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          background: isActiveSpeaker ? RING_BLUE : '#000',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          lineHeight: '12px',
          letterSpacing: 0.4,
          padding: '4px 6px',
          borderRadius: 3,
          maxWidth: 'calc(100% - 16px)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          transition: 'background 0.2s',
        }}
      >
        {label}
      </div>
    </div>
  );
}
