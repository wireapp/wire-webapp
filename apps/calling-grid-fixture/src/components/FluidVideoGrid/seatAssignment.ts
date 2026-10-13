import {
  AssignmentMap,
  GridParticipant,
  isActiveTier,
  SlotMap,
  tierRank,
} from './FluidVideoGrid.types';

/**
 * Stable render order. Participants who already hold a slot keep their relative order — a tier
 * change never reshuffles someone already seated, which is what stops the grid jittering. New
 * participants are inserted at the position their tier earns them, most recently active first.
 */
export function assignSlotOrder(participants: GridParticipant[], previousOrder: SlotMap): SlotMap {
  const alreadySeated = participants
    .filter(participant => previousOrder[participant.id] !== undefined)
    .sort((a, b) => previousOrder[a.id] - previousOrder[b.id]);

  const newcomers = participants
    .filter(participant => previousOrder[participant.id] === undefined)
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || recencyOf(b) - recencyOf(a));

  const ordered = [...alreadySeated];
  for (const newcomer of newcomers) {
    const firstLowerRanked = ordered.findIndex(seated => tierRank(seated.tier) > tierRank(newcomer.tier));
    ordered.splice(firstLowerRanked === -1 ? ordered.length : firstLowerRanked, 0, newcomer);
  }

  return Object.fromEntries(ordered.map((participant, index) => [participant.id, index]));
}

export function sortBySlotOrder(participants: GridParticipant[], slotOrder: SlotMap): GridParticipant[] {
  return [...participants].sort((a, b) => (slotOrder[a.id] ?? 0) - (slotOrder[b.id] ?? 0));
}

function recencyOf(participant: GridParticipant): number {
  return participant.activatedAt ?? 0;
}

/**
 * Who most deserves a full tile right now — lower wins. Read from the participant's *current*
 * tier rather than their slot order, which is deliberately sticky and so lags behind tier
 * changes. Slot order only breaks exact ties.
 */
function seatPriorityOf(participant: GridParticipant, slotOrder: SlotMap): number[] {
  return [tierRank(participant.tier), -recencyOf(participant), slotOrder[participant.id] ?? 0];
}

function compareSeatPriority(a: number[], b: number[]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function bestRanked(participants: GridParticipant[], slotOrder: SlotMap): GridParticipant {
  return participants.reduce((best, candidate) =>
    compareSeatPriority(seatPriorityOf(candidate, slotOrder), seatPriorityOf(best, slotOrder)) < 0
      ? candidate
      : best,
  );
}

export interface FullTileAssignment {
  occupants: GridParticipant[];
  assignmentMap: AssignmentMap;
}

/**
 * Fills `seatCount` full tiles. Whoever already holds a seat keeps it while they stay active;
 * remaining seats go to the highest-priority active participants. Only once every seat is taken
 * and someone still has nowhere to sit does an existing holder become displaceable — and only on
 * a strict priority win, so an exact tie always favours the incumbent and two similarly-ranked
 * participants never trade a seat back and forth.
 */
export function assignFullTiles(
  participantsBySlot: GridParticipant[],
  seatCount: number,
  previousAssignment: AssignmentMap,
  slotOrder: SlotMap,
): FullTileAssignment {
  const seats: (GridParticipant | null)[] = new Array(seatCount).fill(null);
  const seated = new Set<string>();

  const activeParticipants = participantsBySlot.filter(participant => isActiveTier(participant.tier));

  for (const participant of activeParticipants) {
    const previousSeat = previousAssignment[participant.id];
    const keepsSeat =
      previousSeat?.kind === 'full' &&
      previousSeat.seatIndex < seatCount &&
      seats[previousSeat.seatIndex] === null;

    if (keepsSeat) {
      seats[previousSeat.seatIndex] = participant;
      seated.add(participant.id);
    }
  }

  let waiting = activeParticipants.filter(participant => !seated.has(participant.id));

  for (let seatIndex = 0; seatIndex < seatCount && waiting.length > 0; seatIndex++) {
    if (seats[seatIndex] === null) {
      seats[seatIndex] = waiting[0];
      seated.add(waiting[0].id);
      waiting = waiting.slice(1);
    }
  }

  while (waiting.length > 0 && seats.every(seat => seat !== null)) {
    const occupants = seats as GridParticipant[];
    const weakestOccupant = occupants.reduce((weakest, candidate) =>
      compareSeatPriority(seatPriorityOf(candidate, slotOrder), seatPriorityOf(weakest, slotOrder)) > 0
        ? candidate
        : weakest,
    );
    const challenger = bestRanked(waiting, slotOrder);

    const challengerWins =
      compareSeatPriority(
        seatPriorityOf(challenger, slotOrder),
        seatPriorityOf(weakestOccupant, slotOrder),
      ) < 0;
    if (!challengerWins) {
      break;
    }

    seats[occupants.indexOf(weakestOccupant)] = challenger;
    seated.delete(weakestOccupant.id);
    seated.add(challenger.id);
    waiting = waiting.filter(participant => participant !== challenger);
  }

  const assignmentMap: AssignmentMap = {};
  const occupants: GridParticipant[] = [];
  seats.forEach((participant, seatIndex) => {
    if (participant !== null) {
      assignmentMap[participant.id] = {kind: 'full', seatIndex};
      occupants.push(participant);
    }
  });

  return {occupants, assignmentMap};
}
