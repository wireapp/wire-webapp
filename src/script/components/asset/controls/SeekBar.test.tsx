import {act} from '@testing-library/react';
import TestPage from 'Util/test/TestPage';
import SeekBar, {SeekBarCSS, SeekBarProps} from './SeekBar';

class SeekBarPage extends TestPage<SeekBarProps> {
  constructor(props?: SeekBarProps) {
    super(SeekBar, props);
  }

  getSeekBar = () => this.get('input[data-uie-name="asset-control-media-seek-bar"]');
  getProgress = (): string => (this.getSeekBar().props().style as SeekBarCSS)['--seek-bar-progress'];
}

describe('SeekBar', () => {
  it('shows how much of an audio asset has been already played', async () => {
    const createAudioElement = (currentTime: number, maxTime: number) => {
      const audioElement = document.createElement('audio');
      Object.defineProperty(audioElement, 'duration', {get: () => maxTime});
      audioElement.currentTime = currentTime;
      return audioElement;
    };

    const checkProgress = (currentTime: number, expectation: string) => {
      audioElement.currentTime = currentTime;

      act(() => {
        audioElement.dispatchEvent(new Event('timeupdate'));
      });

      testPage.update();

      expect(testPage.getProgress()).toEqual(expectation);
    };

    const audioElement = createAudioElement(25, 100);

    const testPage = new SeekBarPage({
      dark: false,
      disabled: false,
      src: audioElement,
    });

    expect(testPage.getProgress()).toEqual('0%');

    checkProgress(50, '50%');
    checkProgress(75, '75%');
    checkProgress(100, '100%');
    checkProgress(200, '100%');
  });
});
