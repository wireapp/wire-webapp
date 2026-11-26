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

import {useCallback, useEffect, useMemo, useRef, useState, type ReactElement} from 'react';

import createCache from '@emotion/cache';
import {CacheProvider} from '@emotion/react';
import type {Clock} from '@enormora/clock/clock';
import {isNull, isUndefined} from '@sindresorhus/is';
import {createPortal} from 'react-dom';
import {Maybe} from 'true-myth';

import {noteTakerPanelStyles} from './noteTaker.styles';
import {useNoteTakerPanelStore} from './useNoteTakerPanelStore';

import {
  createNoteTakerSession,
  type NoteTakerSession,
  type NoteTakerCall,
  type TranscriptEntry,
  type Speaker,
} from '../../../repositories/calling/noteTaker/noteTakerSession';
import {
  createWhisperWorkerEngine,
  type SpeechEngine,
  type SpeechEngineOptions,
} from '../../../repositories/calling/noteTaker/speechEngine';
import {speechModelIds, type SpeechModelId} from '../../../repositories/calling/noteTaker/speechModels';
import {
  speechDeviceSchema,
  speechLanguageSchema,
  type SpeechProgress,
} from '../../../repositories/calling/noteTaker/speechWorkerProtocol';
import {CloseIcon} from '../../../uiKit/dataDisplay/icon/closeIcon';
import {DownloadIcon} from '../../../uiKit/dataDisplay/icon/downloadIcon';
import {EditDocumentIcon} from '../../../uiKit/dataDisplay/icon/editDocumentIcon';
import {LockIcon} from '../../../uiKit/dataDisplay/icon/lockIcon';

const SECONDS_PER_MINUTE = 60;
const TIMESTAMP_DIGITS = 2;
const FOLLOW_SCROLL_THRESHOLD = 32;
const REVOKE_DELAY_MS = 1000;
const MICROSECONDS_PER_SECOND = 1_000_000;
function formatSpeechProgress(progress: SpeechProgress): string {
  switch (progress.phase) {
    case 'download':
      return `Downloading ${progress.file}: ${Math.round(progress.percent)}%`;
    case 'load':
      return `Loading ${progress.device === 'webgpu' ? 'GPU' : 'CPU'} model…`;
    case 'warmup':
      return `Warming up ${progress.device === 'webgpu' ? 'GPU' : 'CPU'} model…`;
    case 'fallback':
      return `GPU unavailable; falling back to CPU: ${progress.reason}`;
  }
}

function speakerLabel(entry: TranscriptEntry): string {
  const name = entry.speakerName ?? entry.speaker;
  return `${name}${entry.speaker === 'You' && name !== 'You' ? ' (you)' : ''}`;
}

function timestamp(seconds: number): string {
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)
    .toString()
    .padStart(TIMESTAMP_DIGITS, '0')}:${Math.floor(seconds % SECONDS_PER_MINUTE)
    .toString()
    .padStart(TIMESTAMP_DIGITS, '0')}`;
}

function TranscriptTurn({entry, live = false}: {entry: TranscriptEntry; live?: boolean}): ReactElement {
  return (
    <article className={`notes-entry${live ? ' notes-draft' : ''}`}>
      <div className="notes-entry-heading">
        <span className="notes-avatar" aria-hidden="true">
          {speakerLabel(entry).slice(0, 1).toLocaleUpperCase()}
        </span>
        <strong>{speakerLabel(entry)}</strong>
        {live && <span className="notes-draft-label">LIVE DRAFT</span>}
        <span className="notes-time">{timestamp(entry.seconds)}</span>
      </div>
      <p>{entry.text}</p>
    </article>
  );
}

interface NoteTakerProps {
  call?: NoteTakerCall;
  targetDocument?: Document;
  clock: Clock;
  createEngine?: () => SpeechEngine;
  createSession?: typeof createNoteTakerSession;
}

export function NoteTaker({
  call,
  targetDocument,
  clock,
  createEngine,
  createSession = createNoteTakerSession,
}: NoteTakerProps): ReactElement | null {
  const [model, setModel] = useState<SpeechModelId>('base');
  const [device, setDevice] = useState<SpeechEngineOptions['device']>('auto');
  const [language, setLanguage] = useState<SpeechEngineOptions['language']>('en');
  const [performanceInfo, setPerformanceInfo] = useState('');
  const [status, setStatus] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [previews, setPreviews] = useState<Map<Speaker, TranscriptEntry>>(() => {
    return new Map();
  });
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const followTranscript = useRef(true);
  const previousScrollTop = useRef(0);
  const {isOpen, panelTarget, setOpen, setRecording} = useNoteTakerPanelStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const panelDocument = panelTarget?.ownerDocument ?? targetDocument ?? document;
  const styleCache = useMemo(() => {
    return createCache({key: 'call-notes', container: panelDocument.head});
  }, [panelDocument]);
  const session = useRef<Maybe<NoteTakerSession>>(Maybe.nothing());
  const notesCall = useRef<Maybe<NoteTakerCall>>(Maybe.nothing());
  const notesStartedAt = useRef<Maybe<bigint>>(Maybe.nothing());
  const endedPanelShown = useRef(false);
  const engine = useRef<Maybe<SpeechEngine>>(Maybe.nothing());
  const [lifecycle] = useState(() => {
    return {generation: 0};
  });

  const closePanel = useCallback((): void => {
    setOpen(false);
    const ownerDocument = panelTarget?.ownerDocument ?? targetDocument ?? document;
    ownerDocument.querySelector<HTMLButtonElement>('[data-uie-name="do-toggle-call-note-taker"]')?.focus();
  }, [panelTarget, setOpen, targetDocument]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const ownerDocument = panelTarget?.ownerDocument ?? targetDocument ?? document;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePanel();
      }
    };
    ownerDocument.addEventListener('keydown', onKeyDown);
    return () => {
      ownerDocument.removeEventListener('keydown', onKeyDown);
    };
  }, [closePanel, isOpen, panelTarget, targetDocument]);

  useEffect(() => {
    if (followTranscript.current && !isNull(transcriptRef.current)) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
      previousScrollTop.current = transcriptRef.current.scrollTop;
    }
  }, [entries, previews, isOpen, panelTarget]);

  useEffect(() => {
    setRecording(isTranscribing);
  }, [isTranscribing, setRecording]);
  useEffect(() => {
    return () => {
      setRecording(false);
    };
  }, [setRecording]);
  useEffect(() => {
    if (!isUndefined(call)) {
      endedPanelShown.current = false;
    } else if (entries.length > 0 && !endedPanelShown.current) {
      endedPanelShown.current = true;
      setOpen(true);
    }
  }, [call, entries.length, setOpen]);

  const stop = async (): Promise<void> => {
    setFinishing(true);
    ++lifecycle.generation;
    const activeSession = session.current;
    if (activeSession.isJust) {
      setStatus('Finishing queued audio…');
      await activeSession.value.stop();
    } else if (engine.current.isJust) {
      engine.current.value.dispose();
    }
    session.current = Maybe.nothing();
    engine.current = Maybe.nothing();
    setBusy(false);
    setIsTranscribing(false);
    setFinishing(false);
    setPreviews(new Map());
    setStatus('Stopped. Export before reloading; transcript is only held in memory.');
  };

  useEffect(() => {
    // Keep the transcript after leaving; finish queued audio before allowing another capture.
    return () => {
      ++lifecycle.generation;
      const activeSession = session.current;
      session.current = Maybe.nothing();
      if (activeSession.isJust) {
        setFinishing(true);
        setStatus('Call ended. Finishing queued audio…');
        void activeSession.value.stop().finally(() => {
          setBusy(false);
          setIsTranscribing(false);
          setFinishing(false);
          setPreviews(new Map());
          setStatus('Call ended. Export your transcript before reloading.');
        });
      } else {
        if (engine.current.isJust) {
          engine.current.value.dispose();
        }
        setBusy(false);
        setIsTranscribing(false);
      }
      engine.current = Maybe.nothing();
    };
  }, [call, lifecycle]);

  const start = async (): Promise<void> => {
    if (isUndefined(call)) {
      return;
    }
    const id = ++lifecycle.generation;
    const speechEngine = (createEngine ?? createWhisperWorkerEngine)();
    engine.current = Maybe.just(speechEngine);
    setBusy(true);
    setStatus('Loading speech model…');
    setPerformanceInfo('');
    const loaded = await speechEngine.load(
      model,
      message => {
        if (lifecycle.generation === id) {
          setStatus(formatSpeechProgress(message));
        }
      },
      {device, language},
    );
    if (lifecycle.generation !== id) {
      return;
    }
    if (loaded.isErr) {
      speechEngine.dispose();
      engine.current = Maybe.nothing();
      setBusy(false);
      setStatus(loaded.error.message);
      return;
    }
    const startsNewTranscript = notesCall.current.isNothing || notesCall.current.value !== call;
    const timestampOffsetSeconds =
      !startsNewTranscript && notesStartedAt.current.isJust
        ? Number(clock.currentMonotonicMicroseconds - notesStartedAt.current.value) / MICROSECONDS_PER_SECOND
        : 0;
    setPreviews(new Map());
    followTranscript.current = true;
    const activeSession = createSession({
      clock,
      timestampOffsetSeconds,
      call,
      engine: speechEngine,
      onEntry: entry => {
        setEntries(previous => {
          return [...previous, entry].toSorted((left, right) => {
            return left.seconds - right.seconds;
          });
        });
      },
      onError: error => {
        setStatus(String(error));
        const failedSession = session.current;
        if (failedSession.isJust) {
          setFinishing(true);
          void failedSession.value.stop().finally(() => {
            session.current = Maybe.nothing();
            engine.current = Maybe.nothing();
            setBusy(false);
            setIsTranscribing(false);
            setFinishing(false);
            setPreviews(new Map());
          });
        }
      },
      onStats: stats => {
        setPerformanceInfo(
          `${stats.provisional === true ? 'Live preview' : 'Final'} · ${(stats.inferenceMs / REVOKE_DELAY_MS).toFixed(1)}s processing / ${stats.audioSeconds.toFixed(1)}s audio · ${stats.queuedSeconds.toFixed(0)}s queued`,
        );
      },
      onPreview: preview => {
        setPreviews(previous => {
          const current = previous.get(preview.speaker);
          if (!isUndefined(current) && current.seconds > preview.seconds) {
            return previous;
          }
          const next = new Map(previous);
          if (preview.text.length > 0) {
            next.set(preview.speaker, preview);
          } else {
            next.delete(preview.speaker);
          }
          return next;
        });
      },
    });
    session.current = Maybe.just(activeSession);
    const started = await activeSession.start();
    if (started.isErr && lifecycle.generation === id) {
      activeSession.cancel();
      session.current = Maybe.nothing();
      engine.current = Maybe.nothing();
      setBusy(false);
      setStatus(started.error.message);
      return;
    }
    if (lifecycle.generation === id) {
      if (startsNewTranscript) {
        setEntries([]);
        notesCall.current = Maybe.just(call);
        notesStartedAt.current = Maybe.just(clock.currentMonotonicMicroseconds);
      }
      setIsTranscribing(true);
      setStatus(`Transcribing locally · ${speechEngine.description ?? 'speech engine'} · live transcript`);
    }
  };

  const download = (): void => {
    const text = `# Call transcript\n\n${entries
      .map(entry => {
        const minutes = Math.floor(entry.seconds / SECONDS_PER_MINUTE);
        const seconds = Math.floor(entry.seconds % SECONDS_PER_MINUTE)
          .toString()
          .padStart(TIMESTAMP_DIGITS, '0');
        return `[${minutes}:${seconds}] ${speakerLabel(entry)}: ${entry.text}`;
      })
      .join('\n\n')}`;
    const url = URL.createObjectURL(new Blob([text], {type: 'text/markdown'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'call-transcript.md';
    link.click();
    clock.setTimeout(() => {
      return URL.revokeObjectURL(url);
    }, REVOKE_DELAY_MS);
  };

  // Returning no panel leaves this controller (and its recording session) mounted.
  if (!isOpen || (isUndefined(call) && entries.length === 0 && !busy)) {
    return null;
  }

  const liveEntries = [...previews.values()];
  const modelLabel = model;

  let stateLabel = 'Ready when you are';
  if (entries.length > 0) {
    stateLabel = 'Saved in this session';
  }
  if (busy) {
    stateLabel = 'Preparing model…';
  }
  if (isTranscribing) {
    stateLabel = 'Live transcript';
  }

  return createPortal(
    <CacheProvider value={styleCache}>
      <aside
        id="call-note-taker-panel"
        aria-label="Call notes"
        css={noteTakerPanelStyles}
        style={
          isNull(panelTarget)
            ? {
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: 380,
                maxWidth: '100vw',
                zIndex: 'calc(var(--z-index-video, 10000) + 1)',
                boxShadow: '-12px 0 40px rgba(0,0,0,.12)',
              }
            : undefined
        }
      >
        <header className="notes-header">
          <span className="notes-mark">
            <EditDocumentIcon color="currentColor" width={18} height={18} />
          </span>
          <div>
            <div className="notes-eyebrow">EXPERIMENTAL</div>
            <h2>Call notes</h2>
          </div>
          <button
            type="button"
            className="notes-close"
            aria-label="Close call notes"
            title="Close call notes"
            onClick={closePanel}
          >
            <CloseIcon color="currentColor" width={14} height={14} />
          </button>
        </header>
        <div className="notes-privacy">
          <LockIcon color="currentColor" width={12} height={12} /> On-device · only visible to you
        </div>
        <div className="notes-toolbar">
          <button
            type="button"
            className="notes-primary"
            disabled={finishing || (!busy && isUndefined(call))}
            onClick={() => {
              return void (busy ? stop() : start());
            }}
          >
            {busy ? 'Stop note taker' : 'Enable note taker'}
          </button>
          <button
            type="button"
            className="notes-export"
            disabled={entries.length === 0}
            aria-label="Export Markdown"
            title="Export Markdown"
            onClick={download}
          >
            <DownloadIcon color="currentColor" width={14} height={14} /> Export
          </button>
        </div>
        <div className="notes-state">
          <span className="notes-state-label">
            {isTranscribing && <span className="notes-live-dot" />}
            {stateLabel}
          </span>
          <span className="notes-model">
            {modelLabel} · {language.toUpperCase()}
          </span>
        </div>
        <div
          className="notes-transcript"
          ref={transcriptRef}
          onScroll={event => {
            const element = event.currentTarget;
            const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < FOLLOW_SCROLL_THRESHOLD;
            if (atBottom) {
              followTranscript.current = true;
            } else if (element.scrollTop < previousScrollTop.current) {
              followTranscript.current = false;
            }
            previousScrollTop.current = element.scrollTop;
          }}
        >
          {entries.length === 0 && liveEntries.length === 0 && (
            <div className="notes-empty">
              <span className="notes-empty-icon">
                <EditDocumentIcon color="currentColor" width={26} height={26} />
              </span>
              <strong>{isTranscribing ? 'Listening to the conversation' : 'Stay in the conversation'}</strong>
              <p>
                {isTranscribing
                  ? 'Words will appear here as people speak. Live drafts improve as more context arrives.'
                  : 'Capture the conversation as private, live notes. Let everyone know before you start.'}
              </p>
            </div>
          )}
          {entries.map((entry, index) => {
            return <TranscriptTurn key={index} entry={entry} />;
          })}
          <div aria-live="polite" aria-label="Live transcript preview">
            {liveEntries.map(entry => {
              return <TranscriptTurn key={entry.speaker} entry={entry} live />;
            })}
          </div>
        </div>
        <p className="notes-message" role="status">
          {status}
        </p>
        {performanceInfo.length > 0 && <p className="notes-message">{performanceInfo}</p>}
        <details className="notes-settings">
          <summary>Transcription settings</summary>
          <div className="notes-settings-grid">
            <label>
              Speech model
              <select
                aria-label="Speech model"
                disabled={busy}
                value={model}
                onChange={event => {
                  const selected = speechModelIds.find(id => {
                    return id === event.target.value;
                  });
                  if (!isUndefined(selected)) {
                    setModel(selected);
                  }
                }}
              >
                {speechModelIds.map(id => {
                  return (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Language
              <select
                value={language}
                disabled={busy}
                onChange={event => {
                  const selected = speechLanguageSchema.safeParse(event.target.value);
                  if (selected.success) {
                    setLanguage(selected.data);
                  }
                }}
              >
                <option value="en">English</option>
                <option value="de">German</option>
                <option value="fa">Persian</option>
                <option value="fr">French</option>
                <option value="auto">Detect automatically</option>
              </select>
            </label>
            <label className="notes-wide">
              Acceleration
              <select
                value={device}
                disabled={busy}
                onChange={event => {
                  const selected = speechDeviceSchema.safeParse(event.target.value);
                  if (selected.success) {
                    setDevice(selected.data);
                  }
                }}
              >
                <option value="auto">GPU preferred, CPU fallback</option>
                <option value="webgpu">GPU only (WebGPU)</option>
                <option value="wasm">CPU (WASM)</option>
              </select>
            </label>
          </div>
          <p className="notes-settings-hint">
            Models are served by this webapp and downloaded only when enabled. Audio stays on this device. No summaries
            yet.
          </p>
        </details>
      </aside>
    </CacheProvider>,
    panelTarget ?? targetDocument?.body ?? document.body,
  );
}
