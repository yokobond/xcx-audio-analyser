import BlockType from '../../extension-support/block-type';
import ArgumentType from '../../extension-support/argument-type';
import Cast from '../../util/cast';
import log from '../../util/log';
import translations from './translations.json';
import blockIcon from './block-icon.png';

/**
 * List of FFT window sizes.
 * @type {number[]}
 */
const FFT_WINDOW_LIST = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

/**
 * Formatter which is used for translation.
 * This will be replaced which is used in the runtime.
 * @param {object} messageData - format-message object
 * @returns {string} - message for the locale
 */
let formatMessage = messageData => messageData.default;

/**
 * Setup format-message for this extension.
 */
const setupTranslations = () => {
    const localeSetup = formatMessage.setup();
    if (localeSetup && localeSetup.translations[localeSetup.locale]) {
        Object.assign(
            localeSetup.translations[localeSetup.locale],
            translations[localeSetup.locale]
        );
    }
};

const EXTENSION_ID = 'xcxAudioAnalyser';

/**
 * URL to get this extension as a module.
 * When it was loaded as a module, 'extensionURL' will be replaced a URL which is retrieved from.
 * @type {string}
 */
let extensionURL = 'https://yokobond.github.io/xcx-audio-analyser/dist/xcxAudioAnalyser.mjs';

/**
 * Scratch 3.0 blocks for example of Xcratch.
 */
class ExtensionBlocks {
    /**
     * A translation object which is used in this class.
     * @param {FormatObject} formatter - translation object
     */
    static set formatMessage (formatter) {
        formatMessage = formatter;
        if (formatMessage) setupTranslations();
    }

    /**
     * @return {string} - the name of this extension.
     */
    static get EXTENSION_NAME () {
        return formatMessage({
            id: 'xcxAudioAnalyser.name',
            default: 'Audio Analyser',
            description: 'name of the extension'
        });
    }

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID () {
        return EXTENSION_ID;
    }

    /**
     * URL to get this extension.
     * @type {string}
     */
    static get extensionURL () {
        return extensionURL;
    }

    /**
     * Set URL to get this extension.
     * The extensionURL will be changed to the URL of the loading server.
     * @param {string} url - URL
     */
    static set extensionURL (url) {
        extensionURL = url;
    }

    /**
     * Construct a set of blocks for Audio Analyser.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;

        if (runtime.formatMessage) {
            // Replace 'formatMessage' to a formatter which is used in the runtime.
            formatMessage = runtime.formatMessage;
        }

        /**
         * Audio context.
         * @type {AudioContext}
         */
        this.audioContext = null;

        /**
         * Media stream from getUserMedia.
         * @type {MediaStream}
         */
        this.stream = null;

        /**
         * Audio source node.
         * @type {MediaStreamAudioSourceNode}
         */
        this.soundSource = null;

        /**
         * Analyser node.
         * @type {AnalyserNode}
         */
        this.analyser = null;

        /**
         * Frequency data.
         * @type {Uint8Array}
         */
        this.frequencyData = null;

        /**
         * Time data.
         * @type {Uint8Array}
         */
        this.timeData = null;

        /**
         * Maximum decibel for frequency analyser.
         * @type {number|null}
         */
        this.maxDecibels = null;

        /**
         * Minimum decibel for frequency analyser.
         * @type {number|null}
         */
        this.minDecibels = null;

        // Cleanup resources when Scratch project stops.
        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', () => this.stopSampling());
        }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        setupTranslations();
        return {
            id: ExtensionBlocks.EXTENSION_ID,
            name: ExtensionBlocks.EXTENSION_NAME,
            extensionURL: ExtensionBlocks.extensionURL,
            blockIconURI: blockIcon,
            showStatusButton: false,
            blocks: [
                {
                    opcode: 'getPitch',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.getPitch',
                        default: 'pitch (Hz) by [FFT_WINDOW] windows',
                        description: 'get pitch from audio input'
                    }),
                    func: 'getPitch',
                    arguments: {
                        FFT_WINDOW: {
                            type: ArgumentType.STRING,
                            menu: 'fftWindowMenu',
                            defaultValue: '2048'
                        }
                    }
                },
                {
                    opcode: 'sampleSoundData',
                    blockType: BlockType.COMMAND,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.sampleSoundData',
                        default: 'sample sound [DOMAIN] by [FFT_WINDOW] windows',
                        description: 'get sound data for FFT'
                    }),
                    func: 'sampleSoundData',
                    arguments: {
                        DOMAIN: {
                            type: ArgumentType.STRING,
                            menu: 'domainMenu',
                            defaultValue: 'time'
                        },
                        FFT_WINDOW: {
                            type: ArgumentType.STRING,
                            menu: 'fftWindowMenu',
                            defaultValue: '2048'
                        }
                    }
                },
                {
                    opcode: 'stopSampling',
                    blockType: BlockType.COMMAND,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.stopSampling',
                        default: 'stop sampling',
                        description: 'stop audio sampling'
                    }),
                    func: 'stopSampling',
                    arguments: {}
                },
                {
                    opcode: 'frequencyLevel',
                    blockType: BlockType.REPORTER,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.frequencyLevel',
                        default: 'level of frequency [FREQUENCY] Hz',
                        description: 'get level of frequency'
                    }),
                    func: 'frequencyLevel',
                    arguments: {
                        FREQUENCY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 440
                        }
                    }
                },
                {
                    opcode: 'frequencyDomainMin',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.frequencyDomainMin',
                        default: 'min decibel of frequency analyser',
                        description: 'get min decibel of frequency analyser'
                    }),
                    func: 'frequencyDomainMin',
                    arguments: {}
                },
                {
                    opcode: 'frequencyDomainMax',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.frequencyDomainMax',
                        default: 'max decibel of frequency analyser',
                        description: 'get max decibel of frequency analyser'
                    }),
                    func: 'frequencyDomainMax',
                    arguments: {}
                },
                {
                    opcode: 'setFrequencyDomainMin',
                    blockType: BlockType.COMMAND,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.setFrequencyDomainMin',
                        default: 'set min decibel of frequency analyser to [DECIBEL]',
                        description: 'set min decibel of frequency analyser'
                    }),
                    func: 'setFrequencyDomainMin',
                    arguments: {
                        DECIBEL: {
                            type: ArgumentType.NUMBER,
                            defaultValue: -100
                        }
                    }
                },
                {
                    opcode: 'setFrequencyDomainMax',
                    blockType: BlockType.COMMAND,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.setFrequencyDomainMax',
                        default: 'set max decibel of frequency analyser to [DECIBEL]',
                        description: 'set max decibel of frequency analyser'
                    }),
                    func: 'setFrequencyDomainMax',
                    arguments: {
                        DECIBEL: {
                            type: ArgumentType.NUMBER,
                            defaultValue: -30
                        }
                    }
                },
                {
                    opcode: 'waveformLevel',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.waveformLevel',
                        default: 'level of waveform at [INDEX]',
                        description: 'get level of waveform'
                    }),
                    func: 'waveformLevel',
                    arguments: {
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'waveformDataLength',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    blockAllThreads: false,
                    text: formatMessage({
                        id: 'xcxAudioAnalyser.waveformDataLength',
                        default: 'data length of waveform',
                        description: 'get length of waveform data'
                    }),
                    func: 'waveformDataLength',
                    arguments: {}
                }
            ],
            menus: {
                domainMenu: {
                    acceptReporters: false,
                    items: 'getDomainMenu'
                },
                fftWindowMenu: {
                    acceptReporters: true,
                    items: 'getFFTWindowMenu'
                }
            }
        };
    }

    getDomainMenu () {
        const menu = [
            {
                text: formatMessage({
                    id: 'xcxAudioAnalyser.timeDomain',
                    default: 'time domain',
                    description: 'time domain'
                }),
                value: 'time'
            },
            {
                text: formatMessage({
                    id: 'xcxAudioAnalyser.frequencyDomain',
                    default: 'frequency domain',
                    description: 'frequency domain'
                }),
                value: 'frequency'
            }
        ];
        return menu;
    }

    /**
     * Get FFT window menu.
     * @return {array} FFT window menu
     */
    getFFTWindowMenu () {
        const menu = [];
        for (const fftWindow of FFT_WINDOW_LIST) {
            menu.push({
                text: String(fftWindow),
                value: String(fftWindow)
            });
        }
        return menu;
    }

    /**
     * Get audio context.
     * If audio context is not created, create it.
     * @param {object} options - options for constructor of AudioContext
     * @return {AudioContext} audio context
     */
    getAudioContext (options) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)(options);
        }
        return this.audioContext;
    }

    /**
     * Get sound source.
     * If sound source is not created, create it.
     * @return {Promise<MediaStreamAudioSourceNode>} sound source
     */
    async getSoundSource () {
        if (!this.soundSource) {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            this.stream = stream;
            this.soundSource = this.getAudioContext().createMediaStreamSource(stream);
        }
        return this.soundSource;
    }

    /**
     * Get analyser node.
     * If analyser node is not created, create it.
     * @return {Promise<AnalyserNode>} analyser
     */
    async getAnalyser () {
        if (!this.analyser) {
            const source = await this.getSoundSource();
            this.analyser = this.getAudioContext().createAnalyser();

            // Apply stored decibel values safely
            if (this.minDecibels !== null && this.maxDecibels !== null) {
                // If both are set, first ensure they are valid relative to each other.
                if (this.maxDecibels <= this.minDecibels) {
                    log.warn(
                        `Stored maxDecibels (${this.maxDecibels}) must be ` +
                        `greater than minDecibels (${this.minDecibels}). ` +
                        `Clamping minDecibels to ${this.maxDecibels - 1}.`
                    );
                    this.minDecibels = this.maxDecibels - 1;
                }
                
                // Apply in an order that won't throw exception
                if (this.maxDecibels > this.analyser.minDecibels) {
                    this.analyser.maxDecibels = this.maxDecibels;
                    this.analyser.minDecibels = this.minDecibels;
                } else {
                    this.analyser.minDecibels = this.minDecibels;
                    this.analyser.maxDecibels = this.maxDecibels;
                }
            } else if (this.minDecibels !== null) {
                if (this.minDecibels < this.analyser.maxDecibels) {
                    this.analyser.minDecibels = this.minDecibels;
                } else {
                    log.warn(
                        `Stored minDecibels (${this.minDecibels}) must be ` +
                        `less than current maxDecibels (${this.analyser.maxDecibels}). ` +
                        `Clamping minDecibels.`
                    );
                    this.minDecibels = this.analyser.maxDecibels - 1;
                    this.analyser.minDecibels = this.minDecibels;
                }
            } else if (this.maxDecibels !== null) {
                if (this.maxDecibels > this.analyser.minDecibels) {
                    this.analyser.maxDecibels = this.maxDecibels;
                } else {
                    log.warn(
                        `Stored maxDecibels (${this.maxDecibels}) must be ` +
                        `greater than current minDecibels (${this.analyser.minDecibels}). ` +
                        `Clamping maxDecibels.`
                    );
                    this.maxDecibels = this.analyser.minDecibels + 1;
                    this.analyser.maxDecibels = this.maxDecibels;
                }
            }

            source.connect(this.analyser);
        }
        return this.analyser;
    }

    /**
     * Get sound data for FFT.
     * @param {object} args - arguments for the block
     * @param {string} args.FFT_WINDOW - FFT window size.
     * @returns {Promise<string>} - a promise which resolves when sound data is sampled.
     */
    async sampleSoundData (args) {
        const domain = Cast.toString(args.DOMAIN);
        const windowSize = Cast.toNumber(args.FFT_WINDOW);
        let fftSize = FFT_WINDOW_LIST[0];
        for (let index = 1; index < FFT_WINDOW_LIST.length; index++) {
            fftSize = FFT_WINDOW_LIST[index];
            if (fftSize >= windowSize) {
                break;
            }
        }
        try {
            const context = this.getAudioContext();
            if (context.state === 'suspended') {
                await context.resume();
            }
            const analyser = await this.getAnalyser();
            if (analyser.fftSize !== fftSize) {
                analyser.fftSize = fftSize;
            }
            if (domain === 'frequency') {
                const bufferLength = analyser.frequencyBinCount;
                if (!this.frequencyData || this.frequencyData.length !== bufferLength) {
                    this.frequencyData = new Uint8Array(bufferLength);
                }
                this.analyser.getByteFrequencyData(this.frequencyData);
                return `frequency domain with FFT Window: ${fftSize} on sample rate: ${this.audioContext.sampleRate}`;
            } else if (domain === 'time') {
                if (!this.timeData || this.timeData.length !== fftSize) {
                    this.timeData = new Uint8Array(fftSize);
                }
                this.analyser.getByteTimeDomainData(this.timeData);
                return `time domain with FFT Window: ${fftSize} on sample rate: ${this.audioContext.sampleRate}`;
            }
        } catch (e) {
            log.error(e);
            return e.message;
        }
    }

    /**
     * Stop sampling sound data and release audio resources.
     */
    stopSampling () {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.soundSource) {
            this.soundSource.disconnect();
            this.soundSource = null;
        }
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        this.frequencyData = null;
        this.timeData = null;
    }

    /**
     * Get frequency level.
     * @param {object} args - arguments for the block
     * @param {number} args.FREQUENCY - frequency
     * @returns {number} frequency level
     */
    frequencyLevel (args) {
        if (!this.frequencyData) {
            return 0;
        }
        const frequency = Cast.toNumber(args.FREQUENCY);
        const sampleRate = this.audioContext.sampleRate;
        const resolution = (sampleRate / 2) / this.frequencyData.length;
        const index = Math.trunc(frequency / resolution);
        if (index < 0) {
            return 0;
        }
        if (index >= this.frequencyData.length) {
            return 0;
        }
        const level = 100 * this.frequencyData[index] / 255;
        return level;
    }

    /**
     * Get minimum decibel for frequency domain.
     * @returns {number} minimum decibel
     */
    frequencyDomainMin () {
        if (!this.analyser) {
            return 0;
        }
        return this.analyser.minDecibels;
    }

    /**
     * Get maximum decibel for frequency domain.
     * @returns {number} maximum decibel
     */
    frequencyDomainMax () {
        if (!this.analyser) {
            return 0;
        }
        return this.analyser.maxDecibels;
    }

    /**
     * Set minimum decibel for frequency domain.
     * @param {object} args - arguments for the block
     * @param {number} args.DECIBEL - minimum decibel
     */
    setFrequencyDomainMin (args) {
        const decibel = Cast.toNumber(args.DECIBEL);

        if (this.analyser) {
            const currentMax = this.analyser.maxDecibels;
            if (decibel >= currentMax) {
                log.warn(
                    `minDecibels (${decibel}) must be less than ` +
                    `maxDecibels (${currentMax}). Clamping to ${currentMax - 1}.`
                );
                this.minDecibels = currentMax - 1;
            } else {
                this.minDecibels = decibel;
            }
            try {
                this.analyser.minDecibels = this.minDecibels;
            } catch (e) {
                log.error(e);
            }
        } else {
            this.minDecibels = decibel;
        }
    }

    /**
     * Set maximum decibel for frequency domain.
     * @param {object} args - arguments for the block
     * @param {number} args.DECIBEL - maximum decibel
     */
    setFrequencyDomainMax (args) {
        const decibel = Cast.toNumber(args.DECIBEL);

        if (this.analyser) {
            const currentMin = this.analyser.minDecibels;
            if (decibel <= currentMin) {
                log.warn(
                    `maxDecibels (${decibel}) must be greater than ` +
                    `minDecibels (${currentMin}). Clamping to ${currentMin + 1}.`
                );
                this.maxDecibels = currentMin + 1;
            } else {
                this.maxDecibels = decibel;
            }
            try {
                this.analyser.maxDecibels = this.maxDecibels;
            } catch (e) {
                log.error(e);
            }
        } else {
            this.maxDecibels = decibel;
        }
    }

    /**
     * Get waveform level at the window index.
     * @param {object} args - arguments for the block
     * @param {number} args.INDEX - 1-based index of the window
     * @returns {number} waveform level
     */
    waveformLevel (args) {
        if (!this.timeData) {
            return 0;
        }
        const index = Math.trunc(Cast.toNumber(args.INDEX)) - 1;
        if (index < 0) {
            return 0;
        }
        if (index >= this.timeData.length) {
            return 0;
        }
        const level = (100 * this.timeData[index] / 255) - 50;
        return level;
    }

    /**
     * Get length of waveform data.
     * @returns {number} length of waveform data
     */
    waveformDataLength () {
        if (!this.timeData) {
            return 0;
        }
        return this.timeData.length;
    }

    /**
     * Estimate pitch from time domain data using Autocorrelation (ACF2+ algorithm).
     * @param {Float32Array} buf - time domain data buffer
     * @param {number} sampleRate - sample rate
     * @returns {number} estimated pitch in Hz, or -1 if not detected
     */
    autoCorrelate (buf, sampleRate) {
        const SIZE = buf.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            const val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) { // not enough signal
            return -1;
        }

        let r1 = 0;
        let r2 = SIZE - 1;
        const thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buf[i]) < thres) {
                r1 = i;
                break;
            }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buf[SIZE - i]) < thres) {
                r2 = SIZE - i;
                break;
            }
        }

        const slicedBuf = buf.slice(r1, r2);
        const slicedSize = slicedBuf.length;

        // Auto-correlation
        const c = new Float32Array(slicedSize);
        for (let i = 0; i < slicedSize; i++) {
            for (let j = 0; j < slicedSize - i; j++) {
                c[i] = c[i] + (slicedBuf[j] * slicedBuf[j + i]);
            }
        }

        // Find the first peak
        let d = 0;
        while (c[d] > c[d + 1]) {
            d++;
        }
        let maxval = -1;
        let maxpos = -1;
        for (let i = d; i < slicedSize; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        // Interpolation
        if (T0 > 0 && T0 < slicedSize - 1) {
            const x1 = c[T0 - 1];
            const x2 = c[T0];
            const x3 = c[T0 + 1];
            const a = (x1 + x3 - (2 * x2)) / 2;
            const b = (x3 - x1) / 2;
            if (a !== 0) {
                T0 = T0 - (b / (2 * a));
            }
        }

        return T0 > 0 ? sampleRate / T0 : -1;
    }

    /**
     * Get detected pitch from audio input.
     * @param {object} args - arguments for the block
     * @param {string} args.FFT_WINDOW - FFT window size.
     * @returns {Promise<number|string>} - a promise which resolves to the pitch (Hz) or empty string.
     */
    async getPitch (args) {
        const windowSize = Cast.toNumber(args.FFT_WINDOW);
        let fftSize = FFT_WINDOW_LIST[0];
        for (let index = 1; index < FFT_WINDOW_LIST.length; index++) {
            fftSize = FFT_WINDOW_LIST[index];
            if (fftSize >= windowSize) {
                break;
            }
        }

        try {
            const context = this.getAudioContext();
            if (context.state === 'suspended') {
                await context.resume();
            }
            const analyser = await this.getAnalyser();

            if (analyser.fftSize !== fftSize) {
                analyser.fftSize = fftSize;
            }
            if (!this.pitchBuffer || this.pitchBuffer.length !== fftSize) {
                this.pitchBuffer = new Float32Array(fftSize);
            }

            if (analyser.getFloatTimeDomainData) {
                analyser.getFloatTimeDomainData(this.pitchBuffer);
            } else {
                const byteData = new Uint8Array(fftSize);
                analyser.getByteTimeDomainData(byteData);
                for (let i = 0; i < fftSize; i++) {
                    this.pitchBuffer[i] = (byteData[i] - 128) / 128;
                }
            }

            const pitch = this.autoCorrelate(this.pitchBuffer, context.sampleRate);
            if (pitch === -1) {
                return '';
            }
            return pitch;
        } catch (e) {
            log.error(e);
            return '';
        }
    }
}

export {ExtensionBlocks as default, ExtensionBlocks as blockClass};
