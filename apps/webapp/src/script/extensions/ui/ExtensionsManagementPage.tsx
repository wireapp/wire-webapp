/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {useCallback, useEffect, useState} from 'react';

import {useExtensionRegistry} from '../registry/ExtensionRegistry';
import {getDb} from '../getDb';
import {getExtensionStorageManager} from '../storage/ExtensionStorageManager';
import {migrateAiDataToExtensions} from '../migration/DataMigration';
import {ExtensionManifest, RouteContribution} from '../types';

// ─── Settings schema types ───────────────────────────────────────────────────

/**
 * A single property from manifest.contributes.settings.schema.properties.
 * Mirrors the JSON Schema subset used by the three built-in extensions.
 */
interface SchemaProperty {
    type?: 'string' | 'number' | 'boolean';
    title?: string;
    default?: unknown;
    format?: 'email' | 'uri' | 'textarea';
    enum?: string[];
}

/** Values held in controlled form state — one key per schema property. */
type FormValues = Record<string, string | number | boolean>;

// ─── SettingsField ────────────────────────────────────────────────────────────

interface SettingsFieldProps {
    /** The schema property key (e.g. "ollamaUrl"). */
    fieldKey: string;
    schema: SchemaProperty;
    /** Whether this field should render as a password input. */
    isSecret: boolean;
    value: string | number | boolean;
    onChange: (key: string, value: string | number | boolean) => void;
}

/**
 * Renders a single form field based on its JSON Schema property definition.
 * Controlled: all state lives in the parent SettingsForm.
 */
const SettingsField = ({fieldKey, schema, isSecret, value, onChange}: SettingsFieldProps) => {
    const inputStyle: React.CSSProperties = {
        background: '#1d1e22',
        border: '1px solid #2a2b30',
        borderRadius: '4px',
        color: '#dce0e3',
        fontSize: '0.85rem',
        padding: '6px 10px',
        width: '100%',
        boxSizing: 'border-box',
    };

    const label = schema.title ?? fieldKey;
    const placeholder = schema.default !== undefined ? String(schema.default) : undefined;

    // enum → <select>
    if (schema.enum) {
        return (
            <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#9fa1a7', marginBottom: '4px'}}>
                    {label}
                </label>
                <select
                    value={String(value)}
                    onChange={e => onChange(fieldKey, e.target.value)}
                    style={inputStyle}
                >
                    {schema.enum.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        );
    }

    // boolean → toggle checkbox
    if (schema.type === 'boolean') {
        return (
            <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <input
                    type="checkbox"
                    id={`field-${fieldKey}`}
                    checked={Boolean(value)}
                    onChange={e => onChange(fieldKey, e.target.checked)}
                    style={{accentColor: '#2f7ef6', width: '14px', height: '14px', cursor: 'pointer'}}
                />
                <label htmlFor={`field-${fieldKey}`} style={{fontSize: '0.85rem', color: '#dce0e3', cursor: 'pointer'}}>
                    {label}
                </label>
            </div>
        );
    }

    // number → <input type="number">
    if (schema.type === 'number') {
        return (
            <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#9fa1a7', marginBottom: '4px'}}>
                    {label}
                </label>
                <input
                    type="number"
                    value={String(value)}
                    placeholder={placeholder}
                    onChange={e => onChange(fieldKey, e.target.valueAsNumber)}
                    style={inputStyle}
                />
            </div>
        );
    }

    // string + textarea format → <textarea>
    if (schema.format === 'textarea') {
        return (
            <div style={{marginBottom: '12px'}}>
                <label style={{display: 'block', fontSize: '0.8rem', color: '#9fa1a7', marginBottom: '4px'}}>
                    {label}
                </label>
                <textarea
                    value={String(value)}
                    placeholder={placeholder}
                    onChange={e => onChange(fieldKey, e.target.value)}
                    rows={3}
                    style={{...inputStyle, resize: 'vertical'}}
                />
            </div>
        );
    }

    // string: pick input type from format or secret flag
    let inputType: React.HTMLInputTypeAttribute = 'text';
    if (isSecret) {
        inputType = 'password';
    } else if (schema.format === 'email') {
        inputType = 'email';
    } else if (schema.format === 'uri') {
        inputType = 'url';
    }

    return (
        <div style={{marginBottom: '12px'}}>
            <label style={{display: 'block', fontSize: '0.8rem', color: '#9fa1a7', marginBottom: '4px'}}>
                {label}
            </label>
            <input
                type={inputType}
                value={String(value)}
                placeholder={placeholder}
                onChange={e => onChange(fieldKey, e.target.value)}
                style={inputStyle}
            />
        </div>
    );
};

// ─── SettingsForm ─────────────────────────────────────────────────────────────

interface SettingsFormProps {
    extensionId: string;
    manifest: ExtensionManifest;
}

/**
 * Inline settings form for a single extension.
 * Loads current values from the namespaced Dexie settings table on mount,
 * writes them back on "Save Settings".
 *
 * The manifest schema follows JSON Schema draft-07 subset:
 *   schema.type === 'object' && schema.properties: Record<string, SchemaProperty>
 */
const SettingsForm = ({extensionId, manifest}: SettingsFormProps) => {
    const settingsContrib = manifest.contributes?.settings;
    const secrets = new Set<string>(settingsContrib?.secrets ?? []);

    // Extract properties from the object-typed root schema
    const schemaRoot = settingsContrib?.schema as {
        type?: string;
        properties?: Record<string, SchemaProperty>;
    } | undefined;
    const properties = schemaRoot?.properties ?? {};
    const propertyKeys = Object.keys(properties);

    // Check for a /settings route so we can show the "Open Settings Page" link
    const settingsRoute = manifest.contributes?.routes?.find(
        (r: RouteContribution) => r.path.endsWith('/settings'),
    );
    const settingsPagePath = settingsRoute
        ? `/plugins/${extensionId}/settings`
        : null;

    const [values, setValues] = useState<FormValues>(() => {
        // Initialise from schema defaults so inputs are never uncontrolled
        const defaults: FormValues = {};
        for (const key of propertyKeys) {
            const prop = properties[key];
            if (prop.type === 'boolean') {
                defaults[key] = Boolean(prop.default ?? false);
            } else if (prop.type === 'number') {
                defaults[key] = typeof prop.default === 'number' ? prop.default : 0;
            } else {
                defaults[key] = typeof prop.default === 'string' ? prop.default : '';
            }
        }
        return defaults;
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Load persisted values from Dexie on mount
    useEffect(() => {
        const load = async () => {
            try {
                const storageManager = getExtensionStorageManager();
                const table = storageManager.getTable(extensionId, 'settings');
                const rows = await table.toArray() as Array<{key: string; value: unknown}>;
                const persisted: FormValues = {};
                for (const row of rows) {
                    if (propertyKeys.includes(row.key)) {
                        const prop = properties[row.key];
                        if (prop.type === 'boolean') {
                            persisted[row.key] = Boolean(row.value);
                        } else if (prop.type === 'number') {
                            persisted[row.key] = typeof row.value === 'number' ? row.value : Number(row.value) || 0;
                        } else {
                            persisted[row.key] = row.value !== undefined && row.value !== null ? String(row.value) : '';
                        }
                    }
                }
                // Merge: persisted values win over defaults
                setValues(prev => ({...prev, ...persisted}));
            } catch {
                // Table may not exist yet if the extension was never configured; use defaults
            }
        };
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extensionId]);

    const handleChange = useCallback((key: string, value: string | number | boolean) => {
        setValues(prev => ({...prev, [key]: value}));
        setSaved(false);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        setSaved(false);
        try {
            const storageManager = getExtensionStorageManager();
            const table = storageManager.getTable(extensionId, 'settings');
            for (const key of propertyKeys) {
                const serialized = JSON.parse(JSON.stringify(values[key]));
                await table.put({key, value: serialized} as Record<string, unknown>, key);
            }
            setSaved(true);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    if (propertyKeys.length === 0) {
        return (
            <div style={{color: '#9fa1a7', fontSize: '0.85rem', padding: '8px 0'}}>
                No configurable settings.
            </div>
        );
    }

    return (
        <div
            style={{
                background: '#1d1e22',
                border: '1px solid #2a2b30',
                borderRadius: '6px',
                marginTop: '12px',
                padding: '16px',
            }}
        >
            {propertyKeys.map(key => (
                <SettingsField
                    key={key}
                    fieldKey={key}
                    schema={properties[key]}
                    isSecret={secrets.has(key)}
                    value={values[key]}
                    onChange={handleChange}
                />
            ))}

            {saveError && (
                <p style={{color: '#f87171', fontSize: '0.8rem', marginBottom: '8px'}}>
                    Error: {saveError}
                </p>
            )}

            <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    style={{
                        background: '#2f7ef6',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        opacity: saving ? 0.6 : 1,
                        padding: '7px 16px',
                    }}
                >
                    {saving ? 'Saving…' : 'Save Settings'}
                </button>

                {saved && (
                    <span style={{color: '#4ade80', fontSize: '0.8rem'}}>Saved.</span>
                )}

                {settingsPagePath && (
                    <a
                        href={`#${settingsPagePath}`}
                        style={{color: '#2f7ef6', fontSize: '0.8rem', textDecoration: 'none'}}
                    >
                        Open Settings Page →
                    </a>
                )}
            </div>
        </div>
    );
};

// ─── ExtensionsManagementPage ─────────────────────────────────────────────────

export const ExtensionsManagementPage = () => {
    const db = getDb();
    const extensions = useExtensionRegistry(state => Array.from(state.extensions.values()));
    const setEnabled = useExtensionRegistry(state => state.setEnabled);

    // Track which extensions have their config panel open
    const [openConfigIds, setOpenConfigIds] = useState<Set<string>>(new Set());

    const [migrationAvailable, setMigrationAvailable] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationDone, setMigrationDone] = useState(false);
    const [migrationError, setMigrationError] = useState<string | null>(null);

    useEffect(() => {
        // Check if old ai_reports table has any data
        const check = async () => {
            try {
                const count = await (db as unknown as {ai_reports?: {count: () => Promise<number>}})
                    .ai_reports
                    ?.count();
                setMigrationAvailable((count ?? 0) > 0);
            } catch {
                setMigrationAvailable(false);
            }
        };
        void check();
    }, [db]);

    const runMigration = async () => {
        setMigrating(true);
        setMigrationError(null);
        try {
            const result = await migrateAiDataToExtensions(db);
            if (result.errors.length > 0) {
                setMigrationError(result.errors.join(', '));
            } else {
                setMigrationDone(true);
                setMigrationAvailable(false);
            }
        } catch (err) {
            setMigrationError(err instanceof Error ? err.message : String(err));
        } finally {
            setMigrating(false);
        }
    };

    /** Toggle the config panel open/closed for a given extension. */
    const toggleConfig = (extensionId: string) => {
        setOpenConfigIds(prev => {
            const next = new Set(prev);
            if (next.has(extensionId)) {
                next.delete(extensionId);
            } else {
                next.add(extensionId);
            }
            return next;
        });
    };

    return (
        <div
            style={{
                padding: '24px',
                maxWidth: '640px',
                color: '#dce0e3',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
        >
            <h1 style={{fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px'}}>Extensions</h1>

            {/* Migration section — TODO: REMOVE AFTER MIGRATION */}
            {migrationAvailable && !migrationDone && (
                <div
                    style={{
                        background: '#26272c',
                        border: '1px solid #34373d',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '24px',
                    }}
                >
                    <h2 style={{fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#fcd34d'}}>
                        Legacy data migration available
                    </h2>
                    <p style={{fontSize: '0.85rem', color: '#9fa1a7', marginBottom: '12px'}}>
                        You have data from the old AI tools (reports, Jira, exports). Click the button below to
                        migrate it to the new extension format.
                    </p>
                    {migrationError && (
                        <p style={{color: '#f87171', fontSize: '0.85rem', marginBottom: '12px'}}>
                            Error: {migrationError}
                        </p>
                    )}
                    <button
                        onClick={() => void runMigration()}
                        disabled={migrating}
                        style={{
                            background: '#2f7ef6',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '8px 16px',
                            opacity: migrating ? 0.6 : 1,
                        }}
                    >
                        {migrating ? 'Migrating…' : 'Migrate legacy AI data to extensions'}
                    </button>
                </div>
            )}

            {migrationDone && (
                <div
                    style={{
                        background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.3)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '24px',
                        color: '#4ade80',
                        fontSize: '0.85rem',
                    }}
                >
                    Migration completed successfully.
                </div>
            )}

            {/* Extension list */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {extensions.map(ext => {
                    const extId = ext.manifest.id;
                    const hasSettings = Boolean(
                        ext.manifest.contributes?.settings?.schema &&
                        Object.keys(
                            (ext.manifest.contributes.settings.schema as {properties?: Record<string, unknown>})
                                .properties ?? {},
                        ).length > 0,
                    );
                    const isConfigOpen = openConfigIds.has(extId);

                    return (
                        <div
                            key={extId}
                            style={{
                                background: '#26272c',
                                border: '1px solid #34373d',
                                borderRadius: '8px',
                                padding: '16px',
                            }}
                        >
                            {/* Header row */}
                            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                                <div style={{flex: 1}}>
                                    <div style={{fontWeight: 600, marginBottom: '2px'}}>{ext.manifest.name}</div>
                                    <div style={{color: '#9fa1a7', fontSize: '0.8rem'}}>
                                        {ext.manifest.description}
                                    </div>
                                    <div style={{color: '#676b71', fontSize: '0.75rem', marginTop: '4px'}}>
                                        v{ext.manifest.version} · {ext.source}
                                        {ext.state === 'error' && (
                                            <span style={{color: '#f87171', marginLeft: '8px'}}>
                                                Error: {ext.error}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0}}>
                                    {/* Configure button — only shown when the extension declares settings */}
                                    {hasSettings && (
                                        <button
                                            onClick={() => toggleConfig(extId)}
                                            style={{
                                                background: isConfigOpen ? '#34373d' : 'transparent',
                                                border: '1px solid #34373d',
                                                borderRadius: '4px',
                                                color: '#9fa1a7',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                padding: '5px 10px',
                                            }}
                                        >
                                            {isConfigOpen ? 'Close' : 'Configure'}
                                        </button>
                                    )}

                                    {/* Enable / Disable toggle */}
                                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                                        <input
                                            type="checkbox"
                                            checked={ext.enabled}
                                            onChange={e => setEnabled(extId, e.target.checked)}
                                            style={{accentColor: '#2f7ef6', width: '14px', height: '14px'}}
                                        />
                                        <span style={{fontSize: '0.85rem', color: '#9fa1a7'}}>Enabled</span>
                                    </label>
                                </div>
                            </div>

                            {/* Inline settings form — rendered when config panel is open */}
                            {isConfigOpen && hasSettings && (
                                <SettingsForm extensionId={extId} manifest={ext.manifest} />
                            )}
                        </div>
                    );
                })}
            </div>

            {extensions.length === 0 && (
                <div style={{color: '#676b71', textAlign: 'center', padding: '48px 0'}}>
                    No extensions installed
                </div>
            )}
        </div>
    );
};
