import {useRef} from 'react';
import {CSSObject} from '@emotion/react';
import {AnimatePresence, motion} from 'framer-motion';

import {
  GridModeLayout,
  OneOnOneLayout,
  PresenterModeLayout,
  TileDescriptor,
} from './FluidVideoGrid.types';
import * as styles from './FluidVideoGrid.styles';
import {useFluidVideoGrid} from './FluidVideoGridContext';
import {FractionalTileContainer} from './FractionalTileContainer';
import {OverflowTile} from './OverflowTile';
import {ParticipantTile} from './ParticipantTile';
import {useContainerSize} from './useContainerSize';

const TILE_MOTION = {
  layout: true,
  initial: {opacity: 0, scale: 0.9},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.9},
  transition: {duration: 0.25, ease: 'easeOut'},
} as const;

/** Stable identity so a tile survives reflow without remounting. */
function tileKey(tile: TileDescriptor): string {
  switch (tile.type) {
    case 'full':
      return `full-${tile.participant.id}`;
    case 'overflow':
      return 'overflow';
    case 'fractional': {
      const first = tile.fractionalTiles.find(entry => entry.type === 'participant');
      return `fractional-${first?.type === 'participant' ? first.participant.id : 'empty'}`;
    }
  }
}

/**
 * `boxStyle` deliberately avoids the name `css` — Emotion's JSX transform intercepts a `css`
 * prop at the call site and turns it into a className, so it would never reach this component.
 */
function AnimatedTile({tile, boxStyle}: {tile: TileDescriptor; boxStyle: CSSObject}) {
  return (
    <motion.div key={tileKey(tile)} {...TILE_MOTION} css={boxStyle}>
      {tile.type === 'full' && <ParticipantTile participant={tile.participant} />}
      {tile.type === 'overflow' && <OverflowTile count={tile.count} avatars={tile.avatars} />}
    </motion.div>
  );
}

function OneOnOneView({layout}: {layout: OneOnOneLayout}) {
  return (
    <>
      <div css={styles.oneOnOneStage}>
        <AnimatedTile tile={layout.main} boxStyle={styles.flexFilledTile} />
      </div>
      <div css={styles.pictureInPicture}>
        <ParticipantTile participant={layout.pip} size="pip" />
      </div>
    </>
  );
}

function PresenterView({layout, gap}: {layout: PresenterModeLayout; gap: number}) {
  return (
    <>
      {layout.spotlight && <AnimatedTile tile={layout.spotlight} boxStyle={styles.flexFilledTile} />}

      <div css={styles.presenterStrip(layout.stripTileWidth, gap)}>
        {layout.strip.map(tile => (
          <AnimatedTile
            key={tileKey(tile)}
            tile={tile}
            boxStyle={styles.sizedTile(layout.stripTileWidth, layout.stripTileHeight)}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Full tiles and the fractional container are all direct children of one flex-wrap container:
 * only each tile's own size is computed, leaving row breaks and centering entirely to CSS.
 */
function GridView({layout, gap}: {layout: GridModeLayout; gap: number}) {
  return (
    <AnimatePresence mode="popLayout">
      {layout.tiles.map(tile =>
        tile.type === 'fractional' ? (
          <motion.div
            key={tileKey(tile)}
            {...TILE_MOTION}
            css={styles.sizedTile(
              layout.fractionalContainerWidth ?? 0,
              layout.fractionalContainerHeight ?? 0,
            )}
          >
            <FractionalTileContainer
              tile={tile}
              cellWidth={layout.fractionalTileWidth ?? 0}
              cellHeight={layout.fractionalTileHeight ?? 0}
              width={layout.fractionalContainerWidth ?? 0}
              height={layout.fractionalContainerHeight ?? 0}
              gap={gap}
            />
          </motion.div>
        ) : (
          <AnimatedTile
            key={tileKey(tile)}
            tile={tile}
            boxStyle={styles.sizedTile(layout.tileWidth, layout.tileHeight)}
          />
        ),
      )}
    </AnimatePresence>
  );
}

export function FluidVideoGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {layout, tileGap, setContainerSize} = useFluidVideoGrid();

  useContainerSize(containerRef, setContainerSize);

  if (layout.mode === 'one-on-one') {
    return (
      <div ref={containerRef} css={styles.oneOnOneSurface}>
        <OneOnOneView layout={layout} />
      </div>
    );
  }

  if (layout.mode === 'presenter') {
    return (
      <div ref={containerRef} css={styles.presenterSurface(tileGap)}>
        <PresenterView layout={layout} gap={tileGap} />
      </div>
    );
  }

  return (
    <div ref={containerRef} css={styles.gridSurface(tileGap)}>
      <GridView layout={layout} gap={tileGap} />
    </div>
  );
}
