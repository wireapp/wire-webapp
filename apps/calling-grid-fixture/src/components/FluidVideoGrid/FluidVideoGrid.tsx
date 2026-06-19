import { useEffect, useMemo, useReducer, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { GridConfig, GridParticipant, TileDescriptor } from './FluidVideoGrid.types';
import { createGridReducer, createInitialState } from './gridReducer';
import { FractionalTile } from './FractionalTile';
import { GridTile } from './GridTile';
import { OverflowTile } from './OverflowTile';
import { useContainerSize } from './useContainerSize';

export interface FluidVideoGridProps {
  participants: GridParticipant[];
  config: GridConfig;
  onViewAllParticipantsSelected?: () => void;
  presenterMode?: boolean;
  onPresenterModeRequested?: () => void;
}

const TILE_MOTION = {
  layout: true,
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.25, ease: 'easeOut' },
} as const;

export function FluidVideoGrid({ participants, config, onViewAllParticipantsSelected, presenterMode, onPresenterModeRequested }: FluidVideoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHadScreenShare = useRef(false);

  const reducer = useMemo(() => createGridReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, createInitialState({ width: 0, height: 0 }));

  useContainerSize(containerRef, (width, height) => dispatch({type: 'SET_CONTAINER_SIZE', width, height}));

  useEffect(() => {
    const currentIds = new Set(state.participants.map(p => p.id));
    const incomingIds = new Set(participants.map(p => p.id));

    for (const p of state.participants) {
      if (!incomingIds.has(p.id)) {
        dispatch({ type: 'REMOVE_PARTICIPANT', id: p.id });
      }
    }

    for (const p of participants) {
      if (!currentIds.has(p.id)) {
        dispatch({ type: 'ADD_PARTICIPANT', participant: p });
      } else {
        dispatch({ type: 'UPDATE_PARTICIPANT', id: p.id, changes: p });
      }
    }
  }, [participants]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-activate presenter mode when screen sharing first appears
  useEffect(() => {
    const hasScreenShare = state.participants.some(p => p.tier === 'screen-sharing');
    if (hasScreenShare && !prevHadScreenShare.current) {
      onPresenterModeRequested?.();
    }
    prevHadScreenShare.current = hasScreenShare;
  }, [state.participants, onPresenterModeRequested]);

  const { layout, slotMap, containerSize } = state;
  const { rows, tileWidth, tileHeight } = layout;
  const gap = config.tileGap;

  // Presenter mode: spotlight + narrow strip
  if (presenterMode) {
    const sorted = [...state.participants].sort((a, b) => (slotMap[a.id] ?? 999) - (slotMap[b.id] ?? 999));
    const spotlight = sorted.find(p => p.tier !== 'you');

    if (spotlight) {
      const narrowInnerWidth = Math.ceil(config.minTileHeight * config.minAspectRatio);
      // Aspect-ratio bounds for a tile of this exact width
      const minStripTileHeight = narrowInnerWidth / config.maxAspectRatio;
      const maxStripTileHeight = narrowInnerWidth / config.minAspectRatio; // ≈ config.minTileHeight
      const gridParticipants = sorted.filter(p => p !== spotlight);
      const availH = containerSize.height - 2 * gap;
      // How many tiles fit using the shortest valid tile height
      const maxTiles = Math.max(1, Math.floor((availH + gap) / (minStripTileHeight + gap)));
      const hasOverflow = gridParticipants.length > maxTiles;
      const nVisible = hasOverflow ? maxTiles : gridParticipants.length;
      // Distribute height evenly, clamped to aspect-ratio bounds
      const rawHeight = nVisible > 0 ? (availH - gap * (nVisible - 1)) / nVisible : maxStripTileHeight;
      const stripTileHeight = Math.min(maxStripTileHeight, Math.max(minStripTileHeight, rawHeight));
      const visibleStripParticipants = gridParticipants.slice(0, hasOverflow ? maxTiles - 1 : nVisible);
      const overflowCount = hasOverflow ? gridParticipants.length - (maxTiles - 1) : 0;
      const overflowAvatars = hasOverflow ? gridParticipants.slice(maxTiles - 1) : [];

      return (
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: '#111',
            display: 'flex',
            flexDirection: 'row',
            gap,
            padding: gap,
            boxSizing: 'border-box',
          }}
        >
          {/* Spotlight tile — grows to fill all available width */}
          <div style={{flex: '1 1 0%', minWidth: 0, overflow: 'hidden'}}>
            <GridTile
              participant={spotlight}
              isActiveSpeaker={spotlight.tier === 'active-camera' || spotlight.tier === 'active-no-camera'}
            />
          </div>

          {/* Narrow strip — fixed single-column sidebar */}
          <div style={{width: narrowInnerWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', gap, justifyContent: 'center'}}>
            {visibleStripParticipants.map(p => (
              <div key={p.id} style={{height: stripTileHeight, flexShrink: 0, overflow: 'hidden'}}>
                <GridTile
                  participant={p}
                  isActiveSpeaker={p.tier === 'active-camera' || p.tier === 'active-no-camera'}
                />
              </div>
            ))}
            {overflowCount > 0 && (
              <div style={{height: stripTileHeight, flexShrink: 0}}>
                <OverflowTile
                  count={overflowCount}
                  avatars={overflowAvatars}
                  onViewAll={onViewAllParticipantsSelected}
                />
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  const renderTile = (tile: TileDescriptor, key: string) => {
    if (tile.type === 'full') {
      return (
        <motion.div
          key={key}
          {...TILE_MOTION}
          style={{ width: tileWidth, height: tileHeight, flexShrink: 0 }}
        >
          <GridTile
            participant={tile.participant}
            isActiveSpeaker={
              tile.participant.tier === 'active-camera' || tile.participant.tier === 'active-no-camera'
            }
          />
        </motion.div>
      );
    }

    if (tile.type === 'fractional') {
      return (
        <motion.div
          key={key}
          {...TILE_MOTION}
          style={{ width: tileWidth, height: tileHeight, flexShrink: 0 }}
        >
          <FractionalTile
            subRows={tile.subRows}
            subCols={tile.subCols}
            subtiles={tile.subtiles}
            gap={gap}
            onViewAllParticipantsSelected={onViewAllParticipantsSelected}
          />
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#111',
        display: 'flex',
        flexDirection: 'column',
        gap,
        padding: gap,
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="popLayout">
        {rows.map((row, rowIdx) => (
          <motion.div
            key={rowIdx}
            layout
            style={{ display: 'flex', flexDirection: 'row', gap, flexShrink: 0 }}
          >
            {row.tiles.map((tile, tileIdx) => {
              const key =
                tile.type === 'full'
                  ? `full-${tile.participant.id}`
                  : `fractional-${rowIdx}-${tileIdx}`;
              return renderTile(tile, key);
            })}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
