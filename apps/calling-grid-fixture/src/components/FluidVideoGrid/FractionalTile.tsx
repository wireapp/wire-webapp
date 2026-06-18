import {SubtileEntry} from './FluidVideoGrid.types';
import {OverflowTile} from './OverflowTile';
import {SubTile} from './SubTile';

/**
 * CSS grid templates for 1–6 subtiles.
 * Based on Figma design: 1 / 1×2 / 1+2 / 2×2 / 2+3 / 3×3
 */
const SUBTILE_GRID_TEMPLATES: Record<number, {templateRows: string; templateCols: string}> = {
  1: {templateRows: '1fr', templateCols: '1fr'},
  2: {templateRows: '1fr', templateCols: '1fr 1fr'},
  3: {templateRows: '1fr 1fr', templateCols: '1fr 1fr'},
  4: {templateRows: '1fr 1fr', templateCols: '1fr 1fr'},
  5: {templateRows: '1fr 1fr', templateCols: '1fr 1fr 1fr'},
  6: {templateRows: '1fr 1fr', templateCols: '1fr 1fr 1fr'},
};

interface FractionalTileProps {
  subtiles: SubtileEntry[];
  onViewAllParticipantsSelected?: () => void;
}

export function FractionalTile({subtiles, onViewAllParticipantsSelected}: FractionalTileProps) {
  const count = subtiles.length;
  const template = SUBTILE_GRID_TEMPLATES[count] ?? SUBTILE_GRID_TEMPLATES[6];

  // Special case: 3 subtiles → first spans both rows
  const isThreeLayout = count === 3;

  return (
    <div
      style={{
        display: 'grid',
        width: '100%',
        height: '100%',
        gridTemplateRows: template.templateRows,
        gridTemplateColumns: template.templateCols,
        gap: 2,
      }}
    >
      {subtiles.map((entry, i) => {
        const style: React.CSSProperties =
          isThreeLayout && i === 0 ? {gridRow: '1 / 3'} : {};

        return (
          <div key={i} style={{...style, minHeight: 0, minWidth: 0}}>
            {entry.type === 'overflow' ? (
              <OverflowTile
                count={entry.overflowCount ?? 0}
                avatars={entry.overflowAvatars ?? []}
                onViewAll={onViewAllParticipantsSelected}
              />
            ) : entry.participant ? (
              <SubTile participant={entry.participant} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
