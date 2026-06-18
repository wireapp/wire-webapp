import {GridParticipant} from './FluidVideoGrid.types';

interface OverflowTileProps {
  count: number;
  avatars: GridParticipant[];
  onViewAll?: () => void;
}

export function OverflowTile({count, avatars, onViewAll}: OverflowTileProps) {
  return (
    <button
      onClick={onViewAll}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#1e1e1e',
        borderRadius: 6,
        gap: 6,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Stacked avatars */}
      <div style={{display: 'flex', position: 'relative', height: 32}}>
        {avatars.slice(0, 3).map((p, i) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: i * 18,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#555',
              border: '2px solid #1e1e1e',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={p.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            ) : (
              p.name.slice(0, 2).toUpperCase()
            )}
          </div>
        ))}
      </div>
      <span style={{fontSize: 11, color: '#ccc', fontWeight: 600}}>+{count} more</span>
    </button>
  );
}
