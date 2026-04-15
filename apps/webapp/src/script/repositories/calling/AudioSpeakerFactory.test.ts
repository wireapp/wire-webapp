describe('AudioSpeakerFactory', () => {
  let mockBaseElement: HTMLElement;
  let mockStream: MediaStream;
  let playMock: jest.Mock;
  let AudioSpeakerFactory: any;

  beforeEach(() => {
    jest.resetModules();

    mockBaseElement = document.createElement('div');
    mockBaseElement.id = 'calling-audio-speaker-elements';
    document.body.appendChild(mockBaseElement);

    mockStream = {} as MediaStream;

    playMock = jest.fn().mockResolvedValue(undefined);

    (global as any).Audio = jest.fn(() => {
      const audio = document.createElement('audio');

      Object.defineProperty(audio, 'play', {
        value: playMock,
        writable: true,
      });

      return audio;
    });

    AudioSpeakerFactory = require('./AudioSpeakerFactory').AudioSpeakerFactory;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('creates new audio element and appends it to base element', () => {
    const audioElement = AudioSpeakerFactory.createNewCallingAudioSpeaker(mockStream);

    expect(audioElement).toBeDefined();
    expect(audioElement.srcObject).toBe(mockStream);
    expect(playMock).toHaveBeenCalled();
    expect(mockBaseElement.children.length).toBe(1);
  });

  it('throws error if base element does not exist', () => {
    document.body.innerHTML = '';
    jest.resetModules();
    AudioSpeakerFactory = require('./AudioSpeakerFactory').AudioSpeakerFactory;

    expect(() => AudioSpeakerFactory.createNewCallingAudioSpeaker(mockStream)).toThrow(
      'Audio element could not be crated!',
    );
  });
});
