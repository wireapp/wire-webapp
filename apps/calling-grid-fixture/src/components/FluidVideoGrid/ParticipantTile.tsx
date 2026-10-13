import {GridParticipant} from './FluidVideoGrid.types';
import * as styles from './ParticipantTile.styles';
import {TileSize, tileSizeTokens} from './ParticipantTile.styles';
import {colors, initialsFromName} from './tokens';

interface ParticipantTileProps {
  participant: GridParticipant;
  size?: TileSize;
}

function ParticipantAvatar({participant, size}: {participant: GridParticipant; size: TileSize}) {
  const {name, initials, avatarUrl, hue = 200} = participant;

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} css={styles.avatarImage(size)} />;
  }
  return <div css={styles.avatarInitials(size, hue)}>{initials ?? initialsFromName(name)}</div>;
}

function MutedBadge({size}: {size: TileSize}) {
  const iconSize = tileSizeTokens[size].mutedIconSize;

  return (
    <div css={styles.mutedBadge(size)}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none">
        <path d="M2 2L14 14" stroke={colors.mutedIcon} strokeWidth="2" strokeLinecap="round" />
        <path
          d="M8 1a3 3 0 013 3v3.586L5.414 2A3 3 0 018 1zM5 4.586V7a3 3 0 004.586 2.586M10.94 10.94A5 5 0 013 8H1a7 7 0 0011.142 5.656M8 13v2M6 15h4"
          stroke={colors.mutedIcon}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * One participant, at any of the three sizes the grid renders them: a full grid tile, a
 * fractional tile inside the overflow container, or the picture-in-picture overlay used in
 * one-on-one calls. Only dimensions differ between them — see `tileSizeTokens`.
 */
export function ParticipantTile({participant, size = 'full'}: ParticipantTileProps) {
  const {name, displayName, renderVideo, isMuted, isSpeakingNow = false} = participant;

  return (
    <div css={styles.tile(size)}>
      {renderVideo ? renderVideo() : <ParticipantAvatar participant={participant} size={size} />}

      <div css={styles.activeSpeakerRing(size, isSpeakingNow)} />

      {isMuted && <MutedBadge size={size} />}

      <div css={styles.nameLabel(size, isSpeakingNow)}>{displayName ?? name}</div>
    </div>
  );
}
