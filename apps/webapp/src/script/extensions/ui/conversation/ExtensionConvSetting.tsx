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

import {useEffect, useState} from 'react';

import {ConversationSettingContribution} from '../../types';
import {getExtensionStorageManager} from '../../storage/ExtensionStorageManager';

interface ExtensionConvSettingProps {
    contribution: ConversationSettingContribution;
    conversationId: string;
    extensionId: string;
    onOpenPanel?: (panelUrl: string) => void;
}

export const ExtensionConvSetting = ({
    contribution,
    conversationId,
    extensionId,
    onOpenPanel,
}: ExtensionConvSettingProps) => {
    const storageManager = getExtensionStorageManager();
    const [value, setValue] = useState<unknown>(contribution.default ?? false);

    useEffect(() => {
        const load = async () => {
            try {
                const table = storageManager.getConversationStorageTable(extensionId);
                const key = storageManager.buildConversationKey(conversationId, contribution.storageKey ?? contribution.id);
                const row = await table.get(key) as Record<string, unknown> | undefined;
                if (row !== undefined) setValue(row.value ?? contribution.default ?? false);
            } catch {
                // Table may not exist yet
            }
        };
        void load();
    }, [conversationId, extensionId, contribution.id]);

    const save = async (newValue: unknown) => {
        setValue(newValue);
        try {
            const table = storageManager.getConversationStorageTable(extensionId);
            const key = storageManager.buildConversationKey(conversationId, contribution.storageKey ?? contribution.id);
            const serialized = JSON.parse(JSON.stringify(newValue));
            await table.put({
                conversation_id: key,
                conversationId,
                key: contribution.storageKey ?? contribution.id,
                value: serialized,
            } as Record<string, unknown>, key);
        } catch {
            // ignore
        }
    };

    if (contribution.type === 'toggle') {
        return (
            <li className="panel__action-item">
                <span className="panel__action-item__text">{contribution.label}</span>
                <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                    <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={e => void save(e.target.checked)}
                        style={{accentColor: '#2f7ef6'}}
                    />
                </label>
            </li>
        );
    }

    if (contribution.type === 'text') {
        return (
            <li className="panel__action-item">
                <span className="panel__action-item__text">{contribution.label}</span>
                <input
                    type="text"
                    value={String(value ?? '')}
                    placeholder={contribution.placeholder}
                    onChange={e => void save(e.target.value)}
                    style={{
                        background: '#34373d', border: '1px solid #34373d',
                        borderRadius: '4px', color: '#dce0e3', padding: '4px 8px',
                        fontSize: '0.85rem', width: '140px',
                    }}
                />
            </li>
        );
    }

    if (contribution.type === 'openPanel') {
        return (
            <li className="panel__action-item">
                <button
                    className="panel__action-item__button"
                    onClick={() => onOpenPanel?.(contribution.panel ?? '')}
                >
                    {contribution.label}
                </button>
            </li>
        );
    }

    return null;
};
