import {
  ContainerSize,
  GridAction,
  GridConfig,
  GridParticipant,
  GridState,
  isActiveTier,
} from './FluidVideoGrid.types';
import {computeLayout, emptyLayout} from './gridLayout';
import {assignSlotOrder} from './seatAssignment';

export function createInitialState(containerSize: ContainerSize): GridState {
  return {
    participants: [],
    containerSize,
    slotMap: {},
    assignmentMap: {},
    isPresenterModeActive: false,
    presenterModeBeforeScreenShare: null,
    areAllParticipantsShown: false,
    layout: emptyLayout(null),
  };
}

export function createGridReducer(config: GridConfig) {
  return function gridReducer(state: GridState, action: GridAction): GridState {
    switch (action.type) {
      case 'ADD_PARTICIPANT': {
        if (state.participants.some(participant => participant.id === action.participant.id)) {
          return state;
        }
        const participant = withActivationTime(action.participant, action.now);
        return withParticipants(state, [...state.participants, participant], config);
      }

      case 'REMOVE_PARTICIPANT': {
        const participants = state.participants.filter(participant => participant.id !== action.id);
        return participants.length === state.participants.length
          ? state
          : withParticipants(state, participants, config);
      }

      case 'UPDATE_PARTICIPANT': {
        const index = state.participants.findIndex(participant => participant.id === action.id);
        if (index === -1) {
          return state;
        }

        const previous = state.participants[index];
        const updated = {...previous, ...action.changes};
        const tierChanged = action.changes.tier !== undefined && action.changes.tier !== previous.tier;

        const participants = [...state.participants];
        participants[index] = tierChanged
          ? {...updated, activatedAt: action.now ?? Date.now()}
          : updated;

        return withParticipants(state, participants, config);
      }

      case 'SET_CONTAINER_SIZE': {
        const containerSize = {width: action.width, height: action.height};
        return {...state, containerSize, ...relayout(state, {containerSize}, config)};
      }

      case 'TOGGLE_PRESENTER_MODE': {
        const isPresenterModeActive = !state.isPresenterModeActive;
        return {
          ...state,
          isPresenterModeActive,
          ...relayout(state, {isPresenterModeActive}, config),
        };
      }

      case 'TOGGLE_ALL_PARTICIPANTS':
        return {...state, areAllParticipantsShown: !state.areAllParticipantsShown};

      default:
        return state;
    }
  };
}

/** Active participants need an activation time so recency can break ties within a tier. */
function withActivationTime(participant: GridParticipant, now?: number): GridParticipant {
  const needsTimestamp = isActiveTier(participant.tier) && participant.activatedAt === undefined;
  return needsTimestamp ? {...participant, activatedAt: now ?? Date.now()} : participant;
}

/** Recomputes slot order, seating and layout after the participant list changes. */
function withParticipants(
  state: GridState,
  participants: GridParticipant[],
  config: GridConfig,
): GridState {
  const presenterMode = resolvePresenterMode(state, participants);
  const slotMap = assignSlotOrder(participants, state.slotMap);

  const {layout, assignmentMap} = computeLayout(
    participants,
    slotMap,
    state.containerSize,
    config,
    presenterMode.isPresenterModeActive,
    state.assignmentMap,
  );

  return {...state, ...presenterMode, participants, slotMap, assignmentMap, layout};
}

/** Recomputes just the layout, for changes that don't touch the participant list. */
function relayout(
  state: GridState,
  overrides: {containerSize?: ContainerSize; isPresenterModeActive?: boolean},
  config: GridConfig,
) {
  return computeLayout(
    state.participants,
    state.slotMap,
    overrides.containerSize ?? state.containerSize,
    config,
    overrides.isPresenterModeActive ?? state.isPresenterModeActive,
    state.assignmentMap,
  );
}

/**
 * Presenter mode turns on by itself the moment screen sharing starts, remembering whatever the
 * user had it set to. It stays freely toggleable while sharing continues; only when the last
 * share ends does it revert to the remembered setting, discarding mid-share manual changes.
 */
function resolvePresenterMode(
  state: GridState,
  participants: GridParticipant[],
): Pick<GridState, 'isPresenterModeActive' | 'presenterModeBeforeScreenShare'> {
  const wasSharing = hasScreenShare(state.participants);
  const isSharing = hasScreenShare(participants);

  if (!wasSharing && isSharing) {
    return {
      isPresenterModeActive: true,
      presenterModeBeforeScreenShare: state.isPresenterModeActive,
    };
  }

  if (wasSharing && !isSharing) {
    return {
      isPresenterModeActive: state.presenterModeBeforeScreenShare ?? false,
      presenterModeBeforeScreenShare: null,
    };
  }

  return {
    isPresenterModeActive: state.isPresenterModeActive,
    presenterModeBeforeScreenShare: state.presenterModeBeforeScreenShare,
  };
}

function hasScreenShare(participants: GridParticipant[]): boolean {
  return participants.some(participant => participant.tier === 'screen-sharing');
}
