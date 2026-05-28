/** Encode an extension ID + table name into a namespaced Dexie table name. */
export const encodeTableName = (extensionId: string, tableName: string): string => {
    const safeId = extensionId.replace(/\./g, '_');
    return `ext_${safeId}__${tableName}`;
};

/** Decode a namespaced table name back into extensionId and tableName. Returns null if not a namespaced table. */
export const decodeTableName = (
    namespacedName: string,
): { extensionId: string; tableName: string } | null => {
    const match = namespacedName.match(/^ext_([^_].+)__(.+)$/);
    if (!match) return null;
    return {
        extensionId: match[1].replace(/_/g, '.'),
        tableName: match[2],
    };
};

/** Check that a table name is declared for the given extension. */
export const isTableOwnedByExtension = (
    extensionId: string,
    namespacedTableName: string,
): boolean => {
    const decoded = decodeTableName(namespacedTableName);
    if (!decoded) return false;
    return decoded.extensionId === extensionId;
};
