import {GridParticipant} from './FluidVideoGrid.types';

const TILE_BG = '#34373D';

function avatarGrad(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 55% 56%), hsl(${(hue + 28) % 360} 58% 40%))`;
}

interface OverflowTileProps {
  count: number;
  avatars: GridParticipant[];
  onViewAll?: () => void;
}

export function OverflowTile({count, avatars, onViewAll}: OverflowTileProps) {
  const shown = avatars.slice(0, 3);

  return (
    <button
      onClick={onViewAll}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: TILE_BG,
        borderRadius: 4,
        gap: 6,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3d4046';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = TILE_BG;
      }}
    >
      {/* Stacked overlapping avatars */}
      <div style={{display: 'flex', position: 'relative', height: 30}}>
        {shown.map((p, i) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: i * 18,
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: `2px solid ${TILE_BG}`,
              overflow: 'hidden',
              background: avatarGrad(p.hue ?? (i * 47) % 360),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt={p.name}
                style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
              />
            ) : (
              p.name
                .split(' ')
                .map(w => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            )}
          </div>
        ))}
      </div>

      <span
        style={{
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.3,
        }}
      >
        +{count} more
      </span>
    </button>
  );
}
