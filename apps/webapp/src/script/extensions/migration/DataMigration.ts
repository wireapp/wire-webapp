/**
 * ONE-TIME MIGRATION UTILITY
 * TODO: REMOVE THIS FILE AND ITS CALLSITE IN ExtensionsManagementPage
 * AFTER THE MIGRATION HAS BEEN RUN ON ALL DEVELOPER MACHINES.
 * Tracking: this migration is invoked via the "Migrate legacy AI data" button
 * in Settings → Extensions.
 */

import {DexieDatabase} from 'Repositories/storage/dexieDatabase';

export interface MigrationResult {
    migratedTables: string[];
    rowCounts: Record<string, number>;
    errors: string[];
}

type LegacyDb = DexieDatabase & {
    ai_reports?: ReturnType<DexieDatabase['table']>;
    ai_conversation_sub_reports?: ReturnType<DexieDatabase['table']>;
    ai_final_report_entries?: ReturnType<DexieDatabase['table']>;
    ai_conversation_settings?: ReturnType<DexieDatabase['table']>;
    ai_settings?: ReturnType<DexieDatabase['table']>;
    ai_prompt_templates?: ReturnType<DexieDatabase['table']>;
    ai_exports?: ReturnType<DexieDatabase['table']>;
    ai_entry_notes?: ReturnType<DexieDatabase['table']>;
    jira_tickets?: ReturnType<DexieDatabase['table']>;
    jira_problems?: ReturnType<DexieDatabase['table']>;
};

const JIRA_SETTINGS_KEYS = new Set(['jira_email', 'jira_pat', 'jira_base_url']);

export const migrateAiDataToExtensions = async (db: DexieDatabase): Promise<MigrationResult> => {
    const legacy = db as LegacyDb;
    const result: MigrationResult = {migratedTables: [], rowCounts: {}, errors: []};

    const migrate = async (
        sourceTable: ReturnType<DexieDatabase['table']> | undefined,
        destTable: ReturnType<DexieDatabase['table']>,
        tableName: string,
        transform?: (row: unknown) => unknown,
    ) => {
        if (!sourceTable) return;
        try {
            const rows = await sourceTable.toArray();
            if (rows.length === 0) return;
            const transformed = transform ? rows.map(transform) : rows;
            const plain = JSON.parse(JSON.stringify(transformed)) as Record<string, unknown>[];
            await destTable.bulkPut(plain);
            result.migratedTables.push(tableName);
            result.rowCounts[tableName] = rows.length;
        } catch (err) {
            result.errors.push(`${tableName}: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    // Reports tables
    await migrate(legacy.ai_reports, db['ext_com_wire_reports__reports'], 'reports');
    await migrate(legacy.ai_conversation_sub_reports, db['ext_com_wire_reports__subReports'], 'subReports');
    await migrate(legacy.ai_final_report_entries, db['ext_com_wire_reports__finalEntries'], 'finalEntries');
    await migrate(legacy.ai_conversation_settings, db['ext_com_wire_reports__convSettings'], 'convSettings');
    await migrate(legacy.ai_prompt_templates, db['ext_com_wire_reports__promptTemplates'], 'promptTemplates');
    await migrate(legacy.ai_entry_notes, db['ext_com_wire_reports__entryNotes'], 'entryNotes');

    // ai_settings: split by key — Ollama keys → reports settings, Jira keys → jira settings
    if (legacy.ai_settings) {
        try {
            const allSettings = (await legacy.ai_settings.toArray()) as Array<{key: string; value: unknown}>;
            const ollamaSettings = allSettings.filter(s => !JIRA_SETTINGS_KEYS.has(s.key));
            const jiraSettings = allSettings.filter(s => JIRA_SETTINGS_KEYS.has(s.key));

            if (ollamaSettings.length > 0) {
                await db['ext_com_wire_reports__settings'].bulkPut(
                    JSON.parse(JSON.stringify(ollamaSettings)) as Record<string, unknown>[],
                );
                result.migratedTables.push('settings (ollama)');
                result.rowCounts['settings (ollama)'] = ollamaSettings.length;
            }
            if (jiraSettings.length > 0) {
                await db['ext_com_wire_jira__settings'].bulkPut(
                    JSON.parse(JSON.stringify(jiraSettings)) as Record<string, unknown>[],
                );
                result.migratedTables.push('settings (jira)');
                result.rowCounts['settings (jira)'] = jiraSettings.length;
            }
        } catch (err) {
            result.errors.push(`ai_settings: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // Exports table
    await migrate(legacy.ai_exports, db['ext_com_wire_exports__exports'], 'exports');

    // Jira tables
    await migrate(legacy.jira_tickets, db['ext_com_wire_jira__tickets'], 'jira_tickets');
    await migrate(legacy.jira_problems, db['ext_com_wire_jira__problems'], 'jira_problems');

    return result;
};
