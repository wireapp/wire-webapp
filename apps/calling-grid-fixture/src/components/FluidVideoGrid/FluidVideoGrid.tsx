import {useEffect, useMemo, useReducer, useRef} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

import {GridConfig, GridParticipant} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState} from './gridReducer';
import {FractionalTile} from './FractionalTile';
import {GridTile} from './GridTile';

export interface FluidVideoGridProps {
  participants: GridParticipant[];
  config: GridConfig;
  onViewAllParticipantsSelected?: () => void;
}

export function FluidVideoGrid({participants, config, onViewAllParticipantsSelected}: FluidVideoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const reducer = useMemo(() => createGridReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, createInitialState({width: 0, height: 0}));

  // Sync container size via ResizeObserver
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

  // Sync participant list prop → reducer
  useEffect(() => {
    const currentIds = new Set(state.participants.map(p => p.id));
    const incomingIds = new Set(participants.map(p => p.id));

    // Remove departed participants
    for (const p of state.participants) {
      if (!incomingIds.has(p.id)) {
        dispatch({type: 'REMOVE_PARTICIPANT', id: p.id});
      }
    }

    // Add new or update existing
    for (const p of participants) {
      if (!currentIds.has(p.id)) {
        dispatch({type: 'ADD_PARTICIPANT', participant: p});
      } else {
        dispatch({type: 'UPDATE_PARTICIPANT', id: p.id, changes: p});
      }
    }
  }, [participants]); // eslint-disable-line react-hooks/exhaustive-deps

  const {layout} = state;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#111',
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        gap: config.tileGap,
        padding: config.tileGap,
        boxSizing: 'border-box',
      }}
    >
      <AnimatePresence>
        {layout.cells.map((cell, i) => {
          const key = cell.type === 'active' ? `active-${cell.participant?.id ?? i}` : `fractional-${i}`;
          return (
            <motion.div
              key={key}
              layout
              initial={{opacity: 0, scale: 0.9}}
              animate={{opacity: 1, scale: 1}}
              exit={{opacity: 0, scale: 0.9}}
              transition={{duration: 0.25, ease: 'easeOut'}}
              style={{minWidth: 0, minHeight: 0}}
            >
              {cell.type === 'active' && cell.participant ? (
                <GridTile participant={cell.participant} />
              ) : cell.type === 'fractional' && cell.subtiles ? (
                <FractionalTile
                  subtiles={cell.subtiles}
                  onViewAllParticipantsSelected={onViewAllParticipantsSelected}
                />
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
