import {GridParticipant} from './FluidVideoGrid.types';
import {useFluidVideoGrid} from './FluidVideoGridContext';
import * as styles from './OverflowTile.styles';
import {initialsFromName} from './tokens';

const MAX_STACKED_AVATARS = 3;

interface OverflowTileProps {
  count: number;
  avatars: GridParticipant[];
}

/**
 * Summarises the participants that did not fit. Clicking it raises the grid's
 * "show all participants" intent, which the host app decides how to present.
 */
export function OverflowTile({count, avatars}: OverflowTileProps) {
  const {toggleAllParticipants} = useFluidVideoGrid();
  const stackedAvatars = avatars.slice(0, MAX_STACKED_AVATARS);

  return (
    <button onClick={toggleAllParticipants} css={styles.overflowButton}>
      <div css={styles.avatarStack(stackedAvatars.length)}>
        {stackedAvatars.map((participant, index) => (
          <div
            key={participant.id}
            css={styles.stackedAvatar(index, participant.hue ?? (index * 47) % 360)}
          >
            {participant.avatarUrl ? (
              <img
                src={participant.avatarUrl}
                alt={participant.name}
                css={styles.stackedAvatarImage}
              />
            ) : (
              initialsFromName(participant.name)
            )}
          </div>
        ))}
      </div>

      <span css={styles.overflowLabel}>+{count} more</span>
    </button>
  );
}
