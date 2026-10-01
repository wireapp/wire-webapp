import {useRef} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

import {TileDescriptor} from './FluidVideoGrid.types';
import {useFluidVideoGrid} from './FluidVideoGridContext';
import {FractionalTile} from './FractionalTile';
import {GridTile} from './GridTile';
import {OverflowTile} from './OverflowTile';
import {useContainerSize} from './useContainerSize';

const TILE_MOTION = {
  layout: true,
  initial: {opacity: 0, scale: 0.9},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.9},
  transition: {duration: 0.25, ease: 'easeOut'},
} as const;

const CONTAINER_STYLE = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: '#111',
  boxSizing: 'border-box',
  display: 'flex',
} as const;

function isActiveSpeaker(tile: Extract<TileDescriptor, {type: 'full'}>): boolean {
  return tile.participant.tier === 'speaking-camera' || tile.participant.tier === 'speaking-no-camera';
}

/**
 * Stable identity for a tile. Full tiles key off their occupant; fractional tiles key
 * off their first occupant so they survive reflow without remounting.
 */
function tileKey(tile: TileDescriptor): string {
  if (tile.type === 'full') {
    return `full-${tile.participant.id}`;
  }
  if (tile.type === 'overflow') {
    return 'overflow';
  }
  const first = tile.fractions.find(f => f.type === 'participant');
  return `fractional-${first && first.type === 'participant' ? first.participant.id : 'empty'}`;
}

export function FluidVideoGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {layout, config, setContainerSize} = useFluidVideoGrid();
  const gap = config.tileGap;

  useContainerSize(containerRef, setContainerSize);

  /**
   * Single render path for every tile in both modes. `width`/`height` are undefined
   * for the spotlight, which is flex-filled instead of explicitly sized.
   */
  const renderTile = (tile: TileDescriptor, width?: number, height?: number) => {
    const style =
      width === undefined
        ? {flex: '1 1 0%', minWidth: 0, overflow: 'hidden' as const}
        : {width, height, flexShrink: 0};

    if (tile.type === 'full') {
      return (
        <motion.div key={tileKey(tile)} {...TILE_MOTION} style={style}>
          <GridTile participant={tile.participant} isActiveSpeaker={isActiveSpeaker(tile)} />
        </motion.div>
      );
    }

    if (tile.type === 'fractional') {
      return (
        <motion.div key={tileKey(tile)} {...TILE_MOTION} style={style}>
          <FractionalTile
            fractionRows={tile.fractionRows}
            fractionCols={tile.fractionCols}
            fractions={tile.fractions}
            gap={gap}
          />
        </motion.div>
      );
    }

    return (
      <motion.div key={tileKey(tile)} {...TILE_MOTION} style={style}>
        <OverflowTile count={tile.count} avatars={tile.avatars} />
      </motion.div>
    );
  };

  if (layout.mode === 'presenter') {
    return (
      <div
        ref={containerRef}
        style={{...CONTAINER_STYLE, flexDirection: 'row', gap, padding: gap}}
      >
        {layout.spotlight && renderTile(layout.spotlight)}

        <div
          style={{
            width: layout.stripTileWidth,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap,
            justifyContent: 'center',
          }}
        >
          {layout.strip.map(tile => renderTile(tile, layout.stripTileWidth, layout.stripTileHeight))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...CONTAINER_STYLE,
        flexDirection: 'column',
        gap,
        padding: gap,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="popLayout">
        {layout.rows.map((row, rowIdx) => (
          <motion.div
            key={rowIdx}
            layout
            style={{display: 'flex', flexDirection: 'row', gap, flexShrink: 0}}
          >
            {row.tiles.map(tile => renderTile(tile, layout.tileWidth, layout.tileHeight))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
