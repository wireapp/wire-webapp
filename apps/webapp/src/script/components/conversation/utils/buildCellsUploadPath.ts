import type {QualifiedId} from '@wireapp/api-client/lib/user/';

interface BuildCellsUploadPathParams {
  conversationId: string;
  conversationQualifiedId: QualifiedId;
  cellsWireDomain: string;
  isDevelopment: boolean;
}

/**
 * Builds the Cells upload path consistently for initial uploads and retries.
 * Development uses the local conversation ID; deployed environments use the qualified ID.
 */
export const buildCellsUploadPath = ({
  conversationId,
  conversationQualifiedId,
  cellsWireDomain,
  isDevelopment,
}: BuildCellsUploadPathParams): string =>
  isDevelopment
    ? `${conversationId}@${cellsWireDomain}`
    : `${conversationQualifiedId.id}@${conversationQualifiedId.domain}`;
