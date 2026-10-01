import {FractionDescriptor} from './FluidVideoGrid.types';
import {FractionTile} from './FractionTile';
import {OverflowTile} from './OverflowTile';

interface FractionalTileProps {
  fractionRows: number;
  fractionCols: number;
  fractions: FractionDescriptor[];
  gap: number;
}

export function FractionalTile({fractionRows, fractionCols, fractions, gap}: FractionalTileProps) {
  const fractionWidth = `calc((100% - ${gap}px * ${fractionCols - 1}) / ${fractionCols})`;
  const fractionHeight = `calc((100% - ${gap}px * ${fractionRows - 1}) / ${fractionRows})`;

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
      {Array.from({length: fractionRows}, (_, rowIdx) => {
        const rowStart = rowIdx * fractionCols;
        const rowEntries = fractions.slice(rowStart, rowStart + fractionCols);

        if (rowEntries.length === 0) {
          return null;
        }

        return (
          <div
            key={rowIdx}
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap,
              height: fractionHeight,
              flexShrink: 0,
            }}
          >
            {rowEntries.map(entry => (
              <div
                key={entry.type === 'overflow' ? 'overflow' : entry.participant.id}
                style={{width: fractionWidth, height: '100%', flexShrink: 0, position: 'relative'}}
              >
                {entry.type === 'overflow' ? (
                  <OverflowTile count={entry.count} avatars={entry.avatars} />
                ) : (
                  <FractionTile participant={entry.participant} />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
