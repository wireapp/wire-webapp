import {GridParticipant} from './FluidVideoGrid.types';

const TILE_BG = '#34373D';
const RING_BLUE = '#0667C8';

function avatarGrad(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 55% 56%), hsl(${(hue + 28) % 360} 58% 40%))`;
}

interface SubTileProps {
  participant: GridParticipant;
}

export function SubTile({participant}: SubTileProps) {
  const {name, displayName, initials: initialsOverride, avatarUrl, hue = 200, renderVideo, isMuted} = participant;
  const isActiveSpeaker =
    participant.tier === 'active-camera' || participant.tier === 'active-no-camera';
  const initials = initialsOverride ?? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const label = displayName ?? name;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: TILE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {renderVideo && renderVideo()}

      {!renderVideo && (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', display: 'block'}}
            />
          ) : (
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: avatarGrad(hue),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {initials}
            </div>
          )}
        </div>
      )}

      {/* Active speaker ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          pointerEvents: 'none',
          boxShadow: isActiveSpeaker
            ? `inset 0 0 0 2px ${RING_BLUE}, inset 0 0 0 4px #fff`
            : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      />

      {/* Mute badge */}
      {isMuted && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            width: 18,
            height: 18,
            borderRadius: 4,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
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
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          background: isActiveSpeaker ? RING_BLUE : '#000',
          color: '#fff',
          fontSize: 10,
          fontWeight: 500,
          lineHeight: '11px',
          padding: '3px 5px',
          borderRadius: 3,
          maxWidth: 'calc(100% - 8px)',
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
