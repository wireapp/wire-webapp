import {GridParticipant} from './FluidVideoGrid.types';

interface SubTileProps {
  participant: GridParticipant;
}

export function SubTile({participant}: SubTileProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#1e1e1e',
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        gap: 4,
      }}
    >
      {participant.avatarUrl ? (
        <img
          src={participant.avatarUrl}
          alt={participant.name}
          style={{width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0}}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {participant.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: '#fff',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 3,
            padding: '1px 4px',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {participant.isMuted ? '🔇 ' : ''}
          {participant.name}
        </span>
      </div>
    </div>
  );
}
