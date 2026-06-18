import {GridParticipant} from './FluidVideoGrid.types';

interface GridTileProps {
  participant: GridParticipant;
}

const TIER_BADGE: Partial<Record<GridParticipant['tier'], string>> = {
  'screen-sharing': '🖥 Screen',
  'active-camera': '🎙 Speaking',
  'active-no-camera': '🎙 Speaking',
};

export function GridTile({participant}: GridTileProps) {
  const isActiveSpeaker = participant.tier === 'active-camera' || participant.tier === 'active-no-camera';
  const badge = TIER_BADGE[participant.tier];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isActiveSpeaker ? 'inset 0 0 0 3px #0af, inset 0 0 0 6px #0002' : 'none',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Video or avatar */}
      {participant.renderVideo ? (
        <div style={{position: 'absolute', inset: 0}}>{participant.renderVideo()}</div>
      ) : participant.avatarUrl ? (
        <img
          src={participant.avatarUrl}
          alt={participant.name}
          style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}}
        />
      ) : (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#334',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {participant.name.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Name label */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          borderRadius: 4,
          padding: '4px 10px',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          maxWidth: 'calc(100% - 16px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {participant.isMuted && <span>🔇</span>}
        <span>{participant.name}</span>
      </div>

      {/* Tier badge */}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,170,255,0.8)',
            color: '#fff',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}
