import {GridParticipant, OverflowBadgeTile} from './FluidVideoGrid.types';

/** How many avatars the overflow badge previews. */
const OVERFLOW_AVATAR_COUNT = 3;

export interface CapacitySplit {
  visible: GridParticipant[];
  badge: OverflowBadgeTile | null;
}

/**
 * Splits participants into those that fit and an optional badge summarising the rest. When
 * anyone overflows the badge itself occupies one slot, so one fewer participant is shown.
 */
export function splitForCapacity(
  participants: GridParticipant[],
  capacity: number,
): CapacitySplit {
  if (participants.length <= capacity) {
    return {visible: participants, badge: null};
  }

  const hidden = participants.slice(capacity - 1);

  return {
    visible: participants.slice(0, capacity - 1),
    badge: {
      type: 'overflow',
      count: hidden.length,
      avatars: hidden.slice(0, OVERFLOW_AVATAR_COUNT),
    },
  };
}
