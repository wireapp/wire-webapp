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

import {useEffect, useRef, useState, type ReactElement} from 'react';

import {isUndefined} from '@sindresorhus/is';

import {NoteTakerSession, type TranscriptEntry} from './noteTakerSession';
import {WhisperWorkerEngine, type SpeechEngine} from './speechEngine';

import type {Call} from '../../../repositories/calling/Call';

const SECONDS_PER_MINUTE = 60;
const TIMESTAMP_DIGITS = 2;
const REVOKE_DELAY_MS = 1000;

// Add factories here for other speech runtimes. No capture/UI changes required.
const engines: Record<string, () => SpeechEngine> = {
  Whisper: () => {
    return new WhisperWorkerEngine();
  },
};

export function NoteTaker({call}: {call?: Call}): ReactElement | null {
  const [engineName, setEngineName] = useState('Whisper');
  const [model, setModel] = useState('Xenova/whisper-tiny');
  const [status, setStatus] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const session = useRef<NoteTakerSession | undefined>(undefined);
  const engine = useRef<SpeechEngine | undefined>(undefined);
  const [lifecycle] = useState(() => {
    return {generation: 0};
  });

  const stop = async (): Promise<void> => {
    setFinishing(true);
    ++lifecycle.generation;
    const activeSession = session.current;
    if (!isUndefined(activeSession)) {
      setStatus('Finishing queued audio…');
      await activeSession.stop();
    } else {
      engine.current?.dispose();
    }
    session.current = undefined;
    engine.current = undefined;
    setBusy(false);
    setFinishing(false);
    setStatus('Stopped. Export before reloading; transcript is only held in memory.');
  };

  useEffect(() => {
    // Keep the transcript after leaving; finish queued audio before allowing another capture.
    return () => {
      ++lifecycle.generation;
      const activeSession = session.current;
      session.current = undefined;
      if (!isUndefined(activeSession)) {
        setFinishing(true);
        setStatus('Call ended. Finishing queued audio…');
        void activeSession.stop().finally(() => {
          setBusy(false);
          setFinishing(false);
          setStatus('Call ended. Export your transcript before reloading.');
        });
      } else {
        engine.current?.dispose();
        setBusy(false);
      }
      engine.current = undefined;
    };
  }, [call, lifecycle]);

  const start = async (): Promise<void> => {
    if (isUndefined(call)) {
      return;
    }
    const id = ++lifecycle.generation;
    const speechEngine = engines[engineName]();
    engine.current = speechEngine;
    setBusy(true);
    setStatus('Loading speech model…');
    try {
      await speechEngine.load(model, message => {
        if (lifecycle.generation === id) {
          setStatus(message);
        }
      });
      if (lifecycle.generation !== id) {
        return;
      }
      setEntries([]);
      const activeSession = new NoteTakerSession(
        call,
        speechEngine,
        entry => {
          setEntries(previous => {
            return [...previous, entry];
          });
        },
        error => {
          setStatus(String(error));
          const failedSession = session.current;
          if (!isUndefined(failedSession)) {
            setFinishing(true);
            void failedSession.stop().finally(() => {
              session.current = undefined;
              engine.current = undefined;
              setBusy(false);
              setFinishing(false);
            });
          }
        },
      );
      session.current = activeSession;
      await activeSession.start();
      if (lifecycle.generation === id) {
        setStatus('Transcribing locally (mixed audio, no speaker labels).');
      }
    } catch (error) {
      if (lifecycle.generation === id) {
        session.current?.cancel();
        session.current = undefined;
        speechEngine.dispose();
        setBusy(false);
        setStatus(String(error));
      }
    }
  };

  const download = (): void => {
    const text = `# Call transcript\n\n${entries
      .map(entry => {
        const minutes = Math.floor(entry.seconds / SECONDS_PER_MINUTE);
        const seconds = Math.floor(entry.seconds % SECONDS_PER_MINUTE)
          .toString()
          .padStart(TIMESTAMP_DIGITS, '0');
        return `[${minutes}:${seconds}] ${entry.text}`;
      })
      .join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([text], {type: 'text/markdown'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'call-transcript.md';
    link.click();
    setTimeout(() => {
      return URL.revokeObjectURL(url);
    }, REVOKE_DELAY_MS);
  };

  if (isUndefined(call) && entries.length === 0 && !busy) {
    return null;
  }

  return (
    <aside
      aria-label="Experimental note taker"
      css={{
        '& button, & input, & select': {
          color: '#111',
          background: '#fff',
          border: '1px solid #999',
          borderRadius: 4,
          padding: '6px 8px',
          font: 'inherit',
          lineHeight: 1.4,
        },
        '& button': {cursor: 'pointer'},
        '& button:disabled': {color: '#ccc', background: '#444', cursor: 'default'},
        '& input:disabled, & select:disabled': {color: '#ddd', background: '#444'},
        '& option': {color: '#111', background: '#fff'},
        '& input': {boxSizing: 'border-box'},
        '& p': {margin: '8px 0'},
        '& button + button': {marginLeft: 6},
      }}
      style={{
        position: 'fixed',
        bottom: 80,
        left: 16,
        zIndex: 'calc(var(--z-index-video, 10000) + 1)',
        width: 340,
        maxWidth: '90vw',
        padding: 12,
        color: '#fff',
        background: '#242424',
        borderRadius: 8,
      }}
    >
      <button
        type="button"
        onClick={() => {
          return setExpanded(value => {
            return !value;
          });
        }}
      >
        {busy ? '● Note taker' : 'Note taker (experiment)'} {expanded ? '▾' : '▸'}
      </button>
      {expanded && (
        <div>
          <p>Local transcription. Tell everyone before enabling. Only you see this indicator and transcript.</p>
          <label>
            Engine{' '}
            <select
              value={engineName}
              disabled={busy}
              onChange={event => {
                return setEngineName(event.target.value);
              }}
            >
              {Object.keys(engines).map(name => {
                return <option key={name}>{name}</option>;
              })}
            </select>
          </label>
          <label style={{display: 'block'}}>
            Whisper ONNX model{' '}
            <input
              value={model}
              disabled={busy}
              onChange={event => {
                return setModel(event.target.value);
              }}
              style={{width: '100%'}}
            />
          </label>
          <p>The model downloads only when enabled. Audio stays on this device. No summaries yet.</p>
          <button
            type="button"
            disabled={finishing || (!busy && isUndefined(call))}
            onClick={() => {
              return void (busy ? stop() : start());
            }}
          >
            {busy ? 'Stop note taker' : 'Enable note taker'}
          </button>
          <button type="button" disabled={entries.length === 0} onClick={download}>
            Export Markdown
          </button>
          <p role="status">{status}</p>
          <div style={{maxHeight: 240, overflowY: 'auto', userSelect: 'text'}}>
            {entries.map((entry, index) => {
              return (
                <p key={index}>
                  [{Math.floor(entry.seconds)}s] {entry.text}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
