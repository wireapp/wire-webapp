/**
 * Declarative storage schema for all built-in extensions.
 *
 * Each entry declares the Dexie index notation for each table. When adding a new extension:
 * 1. Add its entry here.
 * 2. Bump StorageSchemata and add the generated table names to DexieDatabase.
 * 3. Run generateExtensionSchema() to get the schema object for the new version.
 *
 * Index notation: https://dexie.org/docs/Version/Version.stores()
 */

export interface ExtensionTableSchemas {
    [tableName: string]: string;
}

export interface ExtensionStorageSchema {
    extensionId: string;
    tables: ExtensionTableSchemas;
}

export const EXTENSION_STORAGE_SCHEMAS: ExtensionStorageSchema[] = [
    {
        extensionId: 'com.wire.reports',
        tables: {
            reports:        'id, status, created_at',
            subReports:     '++pk, id, report_id, conversation_id, status, [report_id+status]',
            finalEntries:   '++pk, id, report_id, type, status, [report_id+type]',
            convSettings:   'conversation_id',
            settings:       'key',
            promptTemplates:'template_id',
            entryNotes:     'entry_id',
        },
    },
    {
        extensionId: 'com.wire.jira',
        tables: {
            tickets:    'key, status_category_color, fetched_at',
            problems:   '++id, ticket_key, rule_id, status, [ticket_key+rule_id]',
            settings:   'key',
            convSettings: 'conversation_id',
        },
    },
    {
        extensionId: 'com.wire.exports',
        tables: {
            exports:  'id, created_at',
            settings: 'key',
        },
    },
];

/**
 * Produce the Dexie schema record for all extension tables.
 * The key format matches ExtensionStorageNamespace.encodeTableName().
 *
 * Used when registering a new Dexie schema version in StorageSchemata.
 */
export function generateExtensionSchema(): Record<string, string> {
    const schema: Record<string, string> = {};
    for (const ext of EXTENSION_STORAGE_SCHEMAS) {
        const safeId = ext.extensionId.replace(/\./g, '_');
        for (const [tableName, indexes] of Object.entries(ext.tables)) {
            schema[`ext_${safeId}__${tableName}`] = indexes;
        }
    }
    return schema;
}
