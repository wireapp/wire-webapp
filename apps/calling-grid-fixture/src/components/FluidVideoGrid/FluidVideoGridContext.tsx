import {
  createContext,
  Dispatch,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import {GridAction, GridConfig, GridLayout, GridParticipant} from './FluidVideoGrid.types';
import {createGridReducer, createInitialState} from './gridReducer';

export interface FluidVideoGridContextValue {
  layout: GridLayout;
  participants: GridParticipant[];
  /** Gap in px between tiles — the one config value the views need. */
  tileGap: number;
  /** True when showing a spotlight + strip instead of the tiled grid. */
  isPresenterModeActive: boolean;
  /** True when the host app should be showing the full participants list. */
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
 * Owns the grid reducer. Everything that reads grid state or drives it — the grid itself, a call
 * control bar, the overflow badge — goes through this provider rather than threading props.
 */
export function FluidVideoGridProvider({participants, config, children}: FluidVideoGridProviderProps) {
  const reducer = useMemo(() => createGridReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, createInitialState({width: 0, height: 0}));

  useSyncedParticipants(participants, state.participants, dispatch);

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
      tileGap: config.tileGap,
      isPresenterModeActive: state.isPresenterModeActive,
      areAllParticipantsShown: state.areAllParticipantsShown,
      togglePresenterMode,
      toggleAllParticipants,
      setContainerSize,
    }),
    [state, config.tileGap, togglePresenterMode, toggleAllParticipants, setContainerSize],
  );

  return <FluidVideoGridContext.Provider value={value}>{children}</FluidVideoGridContext.Provider>;
}

/**
 * Reconciles the caller's participant list into reducer state. Runs only when `incoming`
 * changes — `current` is read as the latest value at that moment, not depended on, since
 * reacting to our own writes would loop.
 */
function useSyncedParticipants(
  incoming: GridParticipant[],
  current: GridParticipant[],
  dispatch: Dispatch<GridAction>,
) {
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    const seated = currentRef.current;
    const incomingIds = new Set(incoming.map(participant => participant.id));
    const seatedIds = new Set(seated.map(participant => participant.id));

    for (const participant of seated) {
      if (!incomingIds.has(participant.id)) {
        dispatch({type: 'REMOVE_PARTICIPANT', id: participant.id});
      }
    }

    for (const participant of incoming) {
      if (seatedIds.has(participant.id)) {
        dispatch({type: 'UPDATE_PARTICIPANT', id: participant.id, changes: participant});
      } else {
        dispatch({type: 'ADD_PARTICIPANT', participant});
      }
    }
  }, [incoming, dispatch]);
}

/** Reads the grid context. Throws outside a provider so callers never null-check. */
export function useFluidVideoGrid(): FluidVideoGridContextValue {
  const context = useContext(FluidVideoGridContext);
  if (context === null) {
    throw new Error('useFluidVideoGrid must be used within a <FluidVideoGridProvider>');
  }
  return context;
}
