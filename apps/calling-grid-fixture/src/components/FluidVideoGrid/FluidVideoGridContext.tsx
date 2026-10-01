import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer} from 'react';

import {GridConfig, GridLayout, GridParticipant} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState} from './gridReducer';

export interface FluidVideoGridContextValue {
  layout: GridLayout;
  participants: GridParticipant[];
  containerSize: {width: number; height: number};
  config: GridConfig;
  /** True when the grid is showing a spotlight + strip instead of the tiled grid. */
  isPresenterModeActive: boolean;
  /** True when the full participants list is on screen. */
  areAllParticipantsShown: boolean;
  togglePresenterMode: () => void;
  toggleAllParticipants: () => void;
  setContainerSize: (width: number, height: number) => void;
}

const FluidVideoGridContext = createContext<FluidVideoGridContextValue | null>(null);

export interface FluidVideoGridProviderProps {
  participants: GridParticipant[];
  config: GridConfig;
  children: ReactNode;
}

/**
 * Owns the grid reducer. Everything that needs to read grid state or drive it —
 * the grid itself, the call control bar, the overflow badge — goes through this
 * provider rather than threading props.
 */
export function FluidVideoGridProvider({participants, config, children}: FluidVideoGridProviderProps) {
  const reducer = useMemo(() => createGridReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, createInitialState({width: 0, height: 0}));

  // Reconcile the incoming participant list into reducer state.
  useEffect(() => {
    const currentIds = new Set(state.participants.map(p => p.id));
    const incomingIds = new Set(participants.map(p => p.id));

    for (const p of state.participants) {
      if (!incomingIds.has(p.id)) {
        dispatch({type: 'REMOVE_PARTICIPANT', id: p.id});
      }
    }

    for (const p of participants) {
      if (currentIds.has(p.id)) {
        dispatch({type: 'UPDATE_PARTICIPANT', id: p.id, changes: p});
      } else {
        dispatch({type: 'ADD_PARTICIPANT', participant: p});
      }
    }
  }, [participants]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePresenterMode = useCallback(() => dispatch({type: 'TOGGLE_PRESENTER_MODE'}), []);
  const toggleAllParticipants = useCallback(() => dispatch({type: 'TOGGLE_ALL_PARTICIPANTS'}), []);
  const setContainerSize = useCallback(
    (width: number, height: number) => dispatch({type: 'SET_CONTAINER_SIZE', width, height}),
    [],
  );

  const value = useMemo<FluidVideoGridContextValue>(
    () => ({
      layout: state.layout,
      participants: state.participants,
      containerSize: state.containerSize,
      config,
      isPresenterModeActive: state.isPresenterModeActive,
      areAllParticipantsShown: state.areAllParticipantsShown,
      togglePresenterMode,
      toggleAllParticipants,
      setContainerSize,
    }),
    [
      state.layout,
      state.participants,
      state.containerSize,
      state.isPresenterModeActive,
      state.areAllParticipantsShown,
      config,
      togglePresenterMode,
      toggleAllParticipants,
      setContainerSize,
    ],
  );

  return <FluidVideoGridContext.Provider value={value}>{children}</FluidVideoGridContext.Provider>;
}

/**
 * Reads the grid context. Throws when used outside a provider so callers never
 * have to null-check.
 */
export function useFluidVideoGrid(): FluidVideoGridContextValue {
  const context = useContext(FluidVideoGridContext);
  if (context === null) {
    throw new Error('useFluidVideoGrid must be used within a <FluidVideoGridProvider>');
  }
  return context;
}
