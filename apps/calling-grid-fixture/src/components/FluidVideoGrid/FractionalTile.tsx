import {SubtileDescriptor} from './FluidVideoGrid.types';
import {OverflowTile} from './OverflowTile';
import {SubTile} from './SubTile';

interface FractionalTileProps {
  subRows: number;
  subCols: number;
  subtiles: SubtileDescriptor[];
  gap: number;
  onViewAllParticipantsSelected?: () => void;
}

export function FractionalTile({subRows, subCols, subtiles, gap, onViewAllParticipantsSelected}: FractionalTileProps) {
  const subtileWidth = `calc((100% - ${gap}px * ${subCols - 1}) / ${subCols})`;
  const subtileHeight = `calc((100% - ${gap}px * ${subRows - 1}) / ${subRows})`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        gap,
      }}
    >
      {Array.from({length: subRows}, (_, rowIdx) => {
        const rowStart = rowIdx * subCols;
        const rowEntries = subtiles.slice(rowStart, rowStart + subCols);

        return (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap,
              height: subtileHeight,
              flexShrink: 0,
            }}
          >
            {rowEntries.map((entry, colIdx) => (
              <div
                key={colIdx}
                style={{width: subtileWidth, height: '100%', flexShrink: 0, position: 'relative'}}
              >
                {entry.type === 'overflow' ? (
                  <OverflowTile
                    count={entry.count}
                    avatars={entry.avatars}
                    onViewAll={onViewAllParticipantsSelected}
                  />
                ) : (
                  <SubTile participant={entry.participant} />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
