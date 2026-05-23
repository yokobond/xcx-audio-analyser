import { blockClass } from "../../src/vm/extensions/block/index.js";

describe("blockClass", () => {
    let runtime;
    let originalWindow;
    let originalNavigator;
    let mockAudioContextInstance;
    let mockAnalyserInstance;
    let mockStream;
    let mockSourceInstance;
    let createMockFormatter;

    beforeAll(() => {
        originalWindow = global.window;
        originalNavigator = global.navigator;

        mockStream = {
            getTracks: jest.fn().mockReturnValue([
                { stop: jest.fn() }
            ])
        };

        mockSourceInstance = {
            connect: jest.fn(),
            disconnect: jest.fn()
        };

        mockAnalyserInstance = {
            fftSize: 2048,
            frequencyBinCount: 1024,
            minDecibels: -90,
            maxDecibels: -10,
            getByteFrequencyData: jest.fn(array => {
                for (let i = 0; i < array.length; i++) {
                    array[i] = i % 256;
                }
            }),
            getByteTimeDomainData: jest.fn(array => {
                for (let i = 0; i < array.length; i++) {
                    array[i] = i % 256;
                }
            }),
            getFloatTimeDomainData: jest.fn(array => {
                array.fill(0);
            }),
            connect: jest.fn(),
            disconnect: jest.fn()
        };

        mockAudioContextInstance = {
            sampleRate: 44100,
            state: 'running',
            resume: jest.fn().mockResolvedValue(),
            createMediaStreamSource: jest.fn().mockReturnValue(mockSourceInstance),
            createAnalyser: jest.fn().mockReturnValue(mockAnalyserInstance)
        };

        const MockAudioContext = jest.fn().mockImplementation(() => mockAudioContextInstance);

        global.window = {
            AudioContext: MockAudioContext
        };

        global.navigator = {
            mediaDevices: {
                getUserMedia: jest.fn().mockResolvedValue(mockStream)
            }
        };

        createMockFormatter = (impl) => {
            const formatter = jest.fn(impl);
            formatter.setup = jest.fn().mockReturnValue({
                translations: {
                    en: {},
                    ja: {}
                },
                locale: "en"
            });
            return formatter;
        };
    });

    afterAll(() => {
        global.window = originalWindow;
        global.navigator = originalNavigator;
    });

    beforeEach(() => {
        runtime = {
            formatMessage: createMockFormatter(msg => msg.default),
            on: jest.fn()
        };
        jest.clearAllMocks();
        mockAnalyserInstance.fftSize = 2048;
        mockAnalyserInstance.minDecibels = -90;
        mockAnalyserInstance.maxDecibels = -10;
        mockAudioContextInstance.state = 'running';
    });

    test("should create an instance of blockClass", () => {
        const block = new blockClass(runtime);
        expect(block).toBeInstanceOf(blockClass);
    });

    test("static properties and setters", () => {
        const customFormatter = createMockFormatter(msg => `custom_${msg.default}`);
        blockClass.formatMessage = customFormatter;
        expect(blockClass.EXTENSION_NAME).toBe("custom_Audio Analyser");
        expect(customFormatter).toHaveBeenCalled();

        blockClass.formatMessage = createMockFormatter(msg => msg.default);
        expect(blockClass.EXTENSION_NAME).toBe("Audio Analyser");

        expect(blockClass.EXTENSION_ID).toBe("xcxAudioAnalyser");

        const originalUrl = blockClass.extensionURL;
        blockClass.extensionURL = "https://example.com/test.mjs";
        expect(blockClass.extensionURL).toBe("https://example.com/test.mjs");
        blockClass.extensionURL = originalUrl;
    });

    test("getInfo returns metadata", () => {
        const block = new blockClass(runtime);
        const info = block.getInfo();
        expect(info.id).toBe("xcxAudioAnalyser");
        expect(info.name).toBe("Audio Analyser");
        expect(Array.isArray(info.blocks)).toBe(true);
        expect(info.blocks.length).toBeGreaterThan(0);
        expect(info.menus).toBeDefined();
        expect(info.menus.domainMenu).toBeDefined();
        expect(info.menus.fftWindowMenu).toBeDefined();
    });

    test("menu helper methods", () => {
        const block = new blockClass(runtime);
        const domainMenu = block.getDomainMenu();
        expect(domainMenu).toEqual([
            { text: "time domain", value: "time" },
            { text: "frequency domain", value: "frequency" }
        ]);

        const fftMenu = block.getFFTWindowMenu();
        expect(fftMenu).toContainEqual({ text: "2048", value: "2048" });
        expect(fftMenu.length).toBe(11);
    });

    test("getAudioContext should create and reuse AudioContext", () => {
        const block = new blockClass(runtime);
        expect(block.audioContext).toBeNull();

        const ctx = block.getAudioContext({ latencyHint: "interactive" });
        expect(ctx).toBe(mockAudioContextInstance);
        expect(global.window.AudioContext).toHaveBeenCalledWith({ latencyHint: "interactive" });
        expect(block.audioContext).toBe(mockAudioContextInstance);

        const ctx2 = block.getAudioContext();
        expect(ctx2).toBe(mockAudioContextInstance);
        expect(global.window.AudioContext).toHaveBeenCalledTimes(1);
    });

    test("getSoundSource should call getUserMedia and createMediaStreamSource", async () => {
        const block = new blockClass(runtime);
        expect(block.soundSource).toBeNull();

        const source = await block.getSoundSource();
        expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(mockAudioContextInstance.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
        expect(source).toBe(mockSourceInstance);
        expect(block.soundSource).toBe(mockSourceInstance);

        const source2 = await block.getSoundSource();
        expect(source2).toBe(mockSourceInstance);
        expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    });

    test("getAnalyser should create analyser and connect source", async () => {
        const block = new blockClass(runtime);
        expect(block.analyser).toBeNull();

        const analyser = await block.getAnalyser();
        expect(mockAudioContextInstance.createAnalyser).toHaveBeenCalled();
        expect(mockSourceInstance.connect).toHaveBeenCalledWith(mockAnalyserInstance);
        expect(analyser).toBe(mockAnalyserInstance);
        expect(block.analyser).toBe(mockAnalyserInstance);

        const analyser2 = await block.getAnalyser();
        expect(analyser2).toBe(mockAnalyserInstance);
        expect(mockAudioContextInstance.createAnalyser).toHaveBeenCalledTimes(1);
    });

    test("sampleSoundData with frequency domain and custom FFT window size", async () => {
        const block = new blockClass(runtime);
        
        const result = await block.sampleSoundData({
            DOMAIN: "frequency",
            FFT_WINDOW: 2000
        });

        expect(mockAnalyserInstance.fftSize).toBe(2048);
        expect(mockAnalyserInstance.getByteFrequencyData).toHaveBeenCalled();
        expect(block.frequencyData).toBeInstanceOf(Uint8Array);
        expect(result).toBe("frequency domain with FFT Window: 2048 on sample rate: 44100");
    });

    test("sampleSoundData with time domain and small FFT window size", async () => {
        const block = new blockClass(runtime);
        
        const result = await block.sampleSoundData({
            DOMAIN: "time",
            FFT_WINDOW: 50
        });

        expect(mockAnalyserInstance.fftSize).toBe(64);
        expect(mockAnalyserInstance.getByteTimeDomainData).toHaveBeenCalled();
        expect(block.timeData).toBeInstanceOf(Uint8Array);
        expect(result).toBe("time domain with FFT Window: 64 on sample rate: 44100");
    });

    test("sampleSoundData returns error message when userMedia fails", async () => {
        const block = new blockClass(runtime);
        const error = new Error("Permission denied");
        global.navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(error);

        const result = await block.sampleSoundData({
            DOMAIN: "time",
            FFT_WINDOW: 2048
        });

        expect(result).toBe("Permission denied");
    });

    test("frequencyLevel returns correct level and handles edge cases", () => {
        const block = new blockClass(runtime);
        
        expect(block.frequencyLevel({ FREQUENCY: 440 })).toBe(0);

        block.audioContext = mockAudioContextInstance;
        block.frequencyData = new Uint8Array([51, 102, 153, 204]);

        expect(block.frequencyLevel({ FREQUENCY: 0 })).toBe(20);
        expect(block.frequencyLevel({ FREQUENCY: 6000 })).toBe(40);
        
        expect(block.frequencyLevel({ FREQUENCY: -6000 })).toBe(0);
        expect(block.frequencyLevel({ FREQUENCY: 30000 })).toBe(0);
    });

    test("frequencyDomainMin and frequencyDomainMax return analyser values", async () => {
        const block = new blockClass(runtime);
        expect(block.frequencyDomainMin()).toBe(0);
        expect(block.frequencyDomainMax()).toBe(0);

        await block.getAnalyser();
        expect(block.frequencyDomainMin()).toBe(-90);
        expect(block.frequencyDomainMax()).toBe(-10);
    });

    test("setFrequencyDomainMin and setFrequencyDomainMax set values and clip invalid inputs", async () => {
        const block = new blockClass(runtime);
        await block.getAnalyser();

        // Check initial state
        expect(block.frequencyDomainMin()).toBe(-90);
        expect(block.frequencyDomainMax()).toBe(-10);

        // Set valid values
        block.setFrequencyDomainMin({ DECIBEL: -80 });
        expect(block.frequencyDomainMin()).toBe(-80);

        block.setFrequencyDomainMax({ DECIBEL: -20 });
        expect(block.frequencyDomainMax()).toBe(-20);

        // Guard test for Max: set max <= min (-80) -> should clip to min + 1 (-79)
        block.setFrequencyDomainMax({ DECIBEL: -85 });
        expect(block.frequencyDomainMax()).toBe(-79);

        // Guard test for Min: set min >= max (-79) -> should clip to max - 1 (-80)
        block.setFrequencyDomainMin({ DECIBEL: -70 });
        expect(block.frequencyDomainMin()).toBe(-80);
    });

    test("safe initialization order when both min/max decibels are set before analyser creation", async () => {
        const block = new blockClass(runtime);
        
        // Setting values before analyser is created
        block.setFrequencyDomainMin({ DECIBEL: -20 });
        block.setFrequencyDomainMax({ DECIBEL: -10 });

        await block.getAnalyser();

        expect(block.frequencyDomainMin()).toBe(-20);
        expect(block.frequencyDomainMax()).toBe(-10);
    });

    test("waveformLevel and waveformDataLength return correct values", () => {
        const block = new blockClass(runtime);
        expect(block.waveformLevel({ INDEX: 1 })).toBe(0);
        expect(block.waveformDataLength()).toBe(0);

        block.timeData = new Uint8Array([128, 255, 0]);

        expect(block.waveformDataLength()).toBe(3);
        
        expect(block.waveformLevel({ INDEX: 1 })).toBeCloseTo(0.196, 2);
        expect(block.waveformLevel({ INDEX: 2 })).toBe(50);
        expect(block.waveformLevel({ INDEX: 3 })).toBe(-50);

        expect(block.waveformLevel({ INDEX: 0 })).toBe(0);
        expect(block.waveformLevel({ INDEX: 4 })).toBe(0);
    });

    test("stopSampling should release stream tracks and nodes", async () => {
        const block = new blockClass(runtime);
        await block.sampleSoundData({ DOMAIN: "time", FFT_WINDOW: 2048 });
        
        expect(block.stream).toBe(mockStream);
        expect(block.soundSource).toBe(mockSourceInstance);
        expect(block.analyser).toBe(mockAnalyserInstance);
        expect(block.timeData).toBeInstanceOf(Uint8Array);

        const stopSpy = mockStream.getTracks()[0].stop;
        block.stopSampling();

        expect(stopSpy).toHaveBeenCalled();
        expect(block.stream).toBeNull();
        expect(block.soundSource).toBeNull();
        expect(block.analyser).toBeNull();
        expect(block.timeData).toBeNull();
        expect(block.frequencyData).toBeNull();
    });

    test("should handle PROJECT_STOP_ALL event and trigger stopSampling", () => {
        const block = new blockClass(runtime);
        expect(runtime.on).toHaveBeenCalledWith("PROJECT_STOP_ALL", expect.any(Function));
        
        const stopAllHandler = runtime.on.mock.calls.find(call => call[0] === "PROJECT_STOP_ALL")[1];
        
        const stopSamplingSpy = jest.spyOn(block, "stopSampling");
        stopAllHandler();
        expect(stopSamplingSpy).toHaveBeenCalled();
    });

    test("should resume AudioContext if it is suspended", async () => {
        const block = new blockClass(runtime);
        mockAudioContextInstance.state = "suspended";
        
        await block.sampleSoundData({ DOMAIN: "time", FFT_WINDOW: 2048 });
        expect(mockAudioContextInstance.resume).toHaveBeenCalled();
    });

    test("should reuse Uint8Array buffers if size did not change", async () => {
        const block = new blockClass(runtime);
        await block.sampleSoundData({ DOMAIN: "time", FFT_WINDOW: 2048 });
        const firstBuffer = block.timeData;

        await block.sampleSoundData({ DOMAIN: "time", FFT_WINDOW: 2048 });
        const secondBuffer = block.timeData;

        expect(firstBuffer).toBe(secondBuffer);

        await block.sampleSoundData({ DOMAIN: "time", FFT_WINDOW: 512 });
        const thirdBuffer = block.timeData;

        expect(thirdBuffer).not.toBe(firstBuffer);
    });

    test("getPitch should estimate correct frequency from sine wave", async () => {
        const block = new blockClass(runtime);
        
        // Mock a 440Hz sine wave in getFloatTimeDomainData
        const sampleRate = 44100;
        const frequency = 440;
        mockAnalyserInstance.getFloatTimeDomainData.mockImplementation(array => {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
            }
        });

        const pitch = await block.getPitch({ FFT_WINDOW: 2048 });
        // Since autocorrelation might have small interpolation/calculation error, check if it's close to 440Hz.
        expect(pitch).toBeCloseTo(440, 1);
    });

    test("getPitch should return empty string when there is not enough signal (silent)", async () => {
        const block = new blockClass(runtime);
        
        // Mock zero signal
        mockAnalyserInstance.getFloatTimeDomainData.mockImplementation(array => {
            array.fill(0);
        });

        const pitch = await block.getPitch({ FFT_WINDOW: 2048 });
        expect(pitch).toBe("");
    });

    test("getPitch should fallback to getByteTimeDomainData if getFloatTimeDomainData is not available", async () => {
        const block = new blockClass(runtime);
        
        // Temporarily delete getFloatTimeDomainData from the analyser instance
        const originalGetFloat = mockAnalyserInstance.getFloatTimeDomainData;
        delete mockAnalyserInstance.getFloatTimeDomainData;
        
        try {
            // Mock getByteTimeDomainData to return silence (all values = 128)
            mockAnalyserInstance.getByteTimeDomainData.mockImplementation(array => {
                array.fill(128);
            });
            
            const pitch = await block.getPitch({ FFT_WINDOW: 2048 });
            expect(pitch).toBe("");
            expect(mockAnalyserInstance.getByteTimeDomainData).toHaveBeenCalled();
        } finally {
            mockAnalyserInstance.getFloatTimeDomainData = originalGetFloat;
        }
    });

    test("getPitch should reuse pitchBuffer if size did not change", async () => {
        const block = new blockClass(runtime);
        
        await block.getPitch({ FFT_WINDOW: 2048 });
        const firstBuffer = block.pitchBuffer;
        expect(firstBuffer).toBeInstanceOf(Float32Array);
        expect(firstBuffer.length).toBe(2048);

        await block.getPitch({ FFT_WINDOW: 2048 });
        const secondBuffer = block.pitchBuffer;
        expect(firstBuffer).toBe(secondBuffer);
    });

    test("getPitch should resize pitchBuffer and update analyser.fftSize when FFT_WINDOW changes", async () => {
        const block = new blockClass(runtime);
        
        await block.getPitch({ FFT_WINDOW: 2048 });
        expect(mockAnalyserInstance.fftSize).toBe(2048);
        const firstBuffer = block.pitchBuffer;
        expect(firstBuffer.length).toBe(2048);

        await block.getPitch({ FFT_WINDOW: 512 });
        expect(mockAnalyserInstance.fftSize).toBe(512);
        const secondBuffer = block.pitchBuffer;
        expect(secondBuffer.length).toBe(512);
        expect(firstBuffer).not.toBe(secondBuffer);
    });
});
