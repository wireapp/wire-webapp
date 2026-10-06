import {useRef} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

import {TileDescriptor} from './FluidVideoGrid.types';
import {useFluidVideoGrid} from './FluidVideoGridContext';
import {FractionalTileContainer} from './FractionalTileContainer';
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
 * Stable identity for a tile. Full tiles key off their occupant; the fractional tile
 * container keys off its first occupant so it survives reflow without remounting.
 */
function tileKey(tile: TileDescriptor): string {
  if (tile.type === 'full') {
    return `full-${tile.participant.id}`;
  }
  if (tile.type === 'overflow') {
    return 'overflow';
  }
  const first = tile.fractionalTiles.find(f => f.type === 'participant');
  return `fractional-${first && first.type === 'participant' ? first.participant.id : 'empty'}`;
}

export function FluidVideoGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {layout, config, setContainerSize} = useFluidVideoGrid();
  const gap = config.tileGap;

  useContainerSize(containerRef, setContainerSize);

  /**
   * Render path for full and overflow tiles, shared across every mode. `width`/`height`
   * are undefined for the spotlight / one-on-one main tile, which are flex-filled instead
   * of explicitly sized.
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

    if (tile.type === 'overflow') {
      return (
        <motion.div key={tileKey(tile)} {...TILE_MOTION} style={style}>
          <OverflowTile count={tile.count} avatars={tile.avatars} />
        </motion.div>
      );
    }

    return null;
  };

  if (layout.mode === 'one-on-one') {
    return (
      <div ref={containerRef} style={{...CONTAINER_STYLE, padding: 0}}>
        <div style={{position: 'absolute', inset: 0, display: 'flex'}}>{renderTile(layout.main)}</div>
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            width: '19%',
            aspectRatio: '4 / 3',
          }}
        >
          <GridTile participant={layout.pip} variant="pip" />
        </div>
      </div>
    );
  }

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

  // Grid mode: full tiles and the fractional tile container (if any) are all direct
  // children of one flex-wrap container. Only each tile's own fixed size is computed —
  // row breaks, centering, and the fractional container's width are left entirely to CSS.
  return (
    <div
      ref={containerRef}
      style={{
        ...CONTAINER_STYLE,
        flexWrap: 'wrap',
        gap,
        padding: gap,
        justifyContent: 'center',
        alignContent: 'center',
      }}
    >
      <AnimatePresence mode="popLayout">
        {layout.tiles.map(tile => {
          if (tile.type === 'fractional') {
            const boxWidth = layout.fractionalContainerWidth ?? 0;
            const boxHeight = layout.fractionalContainerHeight ?? 0;
            return (
              <motion.div
                key={tileKey(tile)}
                {...TILE_MOTION}
                style={{width: boxWidth, height: boxHeight, flexShrink: 0}}
              >
                <FractionalTileContainer
                  fractionalTiles={tile.fractionalTiles}
                  tileWidth={layout.fractionalTileWidth ?? 0}
                  tileHeight={layout.fractionalTileHeight ?? 0}
                  boxWidth={boxWidth}
                  boxHeight={boxHeight}
                  fillDirection={tile.fillDirection}
                  align={tile.align}
                  gap={gap}
                />
              </motion.div>
            );
          }
          return renderTile(tile, layout.tileWidth, layout.tileHeight);
        })}
      </AnimatePresence>
    </div>
  );
}
