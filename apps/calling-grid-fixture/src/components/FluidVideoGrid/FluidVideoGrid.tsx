import {useEffect, useMemo, useReducer, useRef} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

import {GridConfig, GridParticipant, TileDescriptor} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState} from './gridReducer';
import {FractionalTile} from './FractionalTile';
import {GridTile} from './GridTile';

export interface FluidVideoGridProps {
  participants: GridParticipant[];
  config: GridConfig;
  onViewAllParticipantsSelected?: () => void;
}

const TILE_MOTION = {
  layout: true,
  initial: {opacity: 0, scale: 0.9},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.9},
  transition: {duration: 0.25, ease: 'easeOut'},
} as const;

export function FluidVideoGrid({participants, config, onViewAllParticipantsSelected}: FluidVideoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const reducer = useMemo(() => createGridReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, createInitialState({width: 0, height: 0}));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(entries => {
      const {width, height} = entries[0].contentRect;
      dispatch({type: 'SET_CONTAINER_SIZE', width, height});
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const currentIds = new Set(state.participants.map(p => p.id));
    const incomingIds = new Set(participants.map(p => p.id));

    for (const p of state.participants) {
      if (!incomingIds.has(p.id)) {
        dispatch({type: 'REMOVE_PARTICIPANT', id: p.id});
      }
    }

    for (const p of participants) {
      if (!currentIds.has(p.id)) {
        dispatch({type: 'ADD_PARTICIPANT', participant: p});
      } else {
        dispatch({type: 'UPDATE_PARTICIPANT', id: p.id, changes: p});
      }
    }
  }, [participants]); // eslint-disable-line react-hooks/exhaustive-deps

  const {layout} = state;
  const {rows, tileWidth, tileHeight} = layout;
  const gap = config.tileGap;

  const renderTile = (tile: TileDescriptor, key: string) => {
    if (tile.type === 'full') {
      return (
        <motion.div
          key={key}
          {...TILE_MOTION}
          style={{width: tileWidth, height: tileHeight, flexShrink: 0}}
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
          style={{width: tileWidth, height: tileHeight, flexShrink: 0}}
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
      <AnimatePresence>
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{display: 'flex', flexDirection: 'row', gap, flexShrink: 0}}
          >
            {row.tiles.map((tile, tileIdx) => {
              const key =
                tile.type === 'full'
                  ? `full-${tile.participant.id}`
                  : `fractional-${rowIdx}-${tileIdx}`;
              return renderTile(tile, key);
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
