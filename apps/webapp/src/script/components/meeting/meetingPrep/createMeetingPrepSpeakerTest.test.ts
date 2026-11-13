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

import {createMeetingPrepSpeakerTest, MEETING_PREP_SPEAKER_TEST_SOURCE} from './createMeetingPrepSpeakerTest';
import {meetingPrepSpeakerTestErrors} from './meetingPrepTypes';

type FakeAudio = {
  readonly element: HTMLAudioElement;
  readonly sinkIds: readonly string[];
  readonly emit: (type: 'ended' | 'pause' | 'error') => void;
};

const createFakeAudio = ({
  play = () => {
    return Promise.resolve();
  },
  setSinkIdResult = () => {
    return Promise.resolve();
  },
}: {
  readonly play?: () => Promise<void>;
  readonly setSinkIdResult?: () => Promise<void>;
} = {}): FakeAudio => {
  const sinkIds: string[] = [];
  const element = new Audio();
  element.play = play;
  element.setSinkId = (sinkId: string): Promise<void> => {
    sinkIds.push(sinkId);
    return setSinkIdResult();
  };
  return {
    element,
    sinkIds,
    emit: type => {
      element.dispatchEvent(new Event(type));
    },
  };
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('createMeetingPrepSpeakerTest', () => {
  it('plays the ready sound on the chosen speaker and settles when it ends', async () => {
    const fake = createFakeAudio();
    const sources: string[] = [];
    const pending = createMeetingPrepSpeakerTest(source => {
      sources.push(source);
      return fake.element;
    })('speaker-2');

    await flush();
    fake.emit('ended');

    expect((await pending).isOk).toBe(true);
    expect(sources).toEqual([MEETING_PREP_SPEAKER_TEST_SOURCE]);
    expect(fake.sinkIds).toEqual(['speaker-2']);
  });

  it('does not route the default output, which Firefox does not know by that id', async () => {
    const fake = createFakeAudio();
    const pending = createMeetingPrepSpeakerTest(() => {
      return fake.element;
    })('default');
    await flush();
    fake.emit('ended');
    await pending;

    expect(fake.sinkIds).toEqual([]);
  });

  it('plays on the default output when the browser refuses the chosen one', async () => {
    const play = jest.fn(() => {
      return Promise.resolve();
    });
    const fake = createFakeAudio({
      play,
      setSinkIdResult: () => {
        return Promise.reject(new Error('NotAllowedError'));
      },
    });
    const pending = createMeetingPrepSpeakerTest(() => {
      return fake.element;
    })('speaker-2');

    await flush();
    fake.emit('ended');

    expect((await pending).isOk).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('settles when playback stops early, so the button does not stay on "Playing"', async () => {
    const fake = createFakeAudio();
    const pending = createMeetingPrepSpeakerTest(() => {
      return fake.element;
    })('speaker-1');
    await flush();
    fake.emit('pause');

    expect((await pending).isOk).toBe(true);
  });

  it('fails when playback is refused or breaks', async () => {
    const refused = createFakeAudio({
      play: () => {
        return Promise.reject(new Error('NotAllowedError'));
      },
    });
    const refusedResult = await createMeetingPrepSpeakerTest(() => {
      return refused.element;
    })('speaker-1');
    expect(refusedResult.isErr && refusedResult.error).toBe(meetingPrepSpeakerTestErrors.playbackFailed);

    const broken = createFakeAudio();
    const pending = createMeetingPrepSpeakerTest(() => {
      return broken.element;
    })('speaker-1');
    await flush();
    broken.emit('error');
    expect((await pending).isErr).toBe(true);
  });
});
