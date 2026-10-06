import {GridParticipant} from './FluidVideoGrid.types';

const TILE_BG = '#34373D';
const RING_BLUE = '#0667C8';

function avatarGrad(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 55% 56%), hsl(${(hue + 28) % 360} 58% 40%))`;
}

interface GridTileProps {
  participant: GridParticipant;
  isActiveSpeaker?: boolean;
  /** `pip` renders a smaller variant for the one-on-one overlay thumbnail. */
  variant?: 'default' | 'pip';
}

export function GridTile({participant, isActiveSpeaker, variant = 'default'}: GridTileProps) {
  const {name, displayName, initials: initialsOverride, avatarUrl, hue = 200, renderVideo, isMuted} = participant;
  const initials = initialsOverride ?? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const label = displayName ?? name;
  const isPip = variant === 'pip';

  const borderRadius = isPip ? 8 : 6;
  const avatarSize = isPip ? 48 : 84;
  const avatarFontSize = isPip ? 16 : 28;
  const ringInset = isPip ? '2px' : '3px';
  const badgeSize = isPip ? 18 : 22;
  const badgeIconSize = isPip ? 11 : 14;
  const pillFontSize = isPip ? 10 : 11;
  const pillPadding = isPip ? '3px 5px' : '4px 6px';
  const edgeOffset = isPip ? 4 : 6;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius,
        overflow: 'hidden',
        backgroundColor: TILE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isPip ? '0 4px 16px rgba(0,0,0,.4)' : 'none',
        border: isPip ? '1px solid rgba(255,255,255,.18)' : 'none',
        boxSizing: 'border-box',
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
              style={{width: avatarSize, height: avatarSize, borderRadius: '50%', objectFit: 'cover', display: 'block'}}
            />
          ) : (
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: '50%',
                background: avatarGrad(hue),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: avatarFontSize,
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
          borderRadius,
          pointerEvents: 'none',
          boxShadow: isActiveSpeaker ? `inset 0 0 0 ${ringInset} ${RING_BLUE}` : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      />

      {/* Mute badge */}
      {isMuted && (
        <div
          style={{
            position: 'absolute',
            bottom: edgeOffset,
            left: edgeOffset,
            width: badgeSize,
            height: badgeSize,
            borderRadius: 4,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={badgeIconSize} height={badgeIconSize} viewBox="0 0 16 16" fill="none">
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
          bottom: edgeOffset,
          left: '50%',
          transform: 'translateX(-50%)',
          background: isActiveSpeaker ? RING_BLUE : '#000',
          color: '#fff',
          fontSize: pillFontSize,
          fontWeight: 500,
          lineHeight: '12px',
          letterSpacing: 0.4,
          padding: pillPadding,
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
