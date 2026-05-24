# Audio Analyser
An extension for [Xcratch](https://xcratch.github.io/) to analyze audio data from microphone.

This extension add extra-blocks to analyze time and frequency domain for waveform and spectrum analysis.


## ✨ What You Can Do With This Extension

Play [Example Project](https://xcratch.github.io/editor/#https://yokobond.github.io/xcx-audio-analyser/projects/example.sb3) to look at what you can do with "Audio Analyser" extension. 
<iframe src="https://xcratch.github.io/editor/player#https://yokobond.github.io/xcx-audio-analyser/projects/example.sb3" width="540px" height="460px" allow="microphone"></iframe>

## 🧩 Blocks

Here are the blocks provided by this extension:

### Command Blocks

* **`sample waveform data by resolution [FFT_WINDOW]`**
  * Samples audio waveform data from the microphone in the time domain (for waveform analysis).
  * `FFT_WINDOW`: Select the resolution (512 to 4096) to sample. Larger values capture longer audio chunks but lower time resolution.

* **`sample frequency data by resolution [FFT_WINDOW]`**
  * Samples audio spectrum data from the microphone in the frequency domain (for spectral analysis).
  * `FFT_WINDOW`: Select the resolution (512 to 4096) to sample. Larger values provide higher frequency resolution (finer frequency bins) but slower time response.

* **`stop sampling`**
  * Stops audio sampling from the microphone and releases the media stream resources. This turns off the browser's microphone indicator (e.g. red recording dot).

* **`set min decibel of frequency analyser to [DECIBEL]`**
  * Sets the minimum decibel value of the analyser. If the value is greater than or equal to the current maximum decibel, it is automatically clamped to `(maximum decibel - 1)` to avoid Web Audio API errors.

* **`set max decibel of frequency analyser to [DECIBEL]`**
  * Sets the maximum decibel value of the analyser. If the value is less than or equal to the current minimum decibel, it is automatically clamped to `(minimum decibel + 1)` to avoid Web Audio API errors.

### Reporter Blocks

* **`pitch (Hz) by resolution [FFT_WINDOW]`**
  * Returns the estimated pitch (fundamental frequency) in Hz from the audio input using the autocorrelation method (ACF2+ algorithm). If the pitch cannot be detected (e.g., silence), it returns an empty string (`""`).
  * `FFT_WINDOW`: Select the resolution (512 to 4096) to analyze. Larger values improve low-frequency accuracy (recommended 2048 for human voice), while smaller values improve response time. If the audio sampling has not been started yet, it automatically starts sampling with the specified resolution.

* **`pitch volume`**
  * Returns the volume level (0 to 100) at the last pitch detection. This block returns the cached RMS (Root Mean Square) value calculated during the `pitch (Hz) by resolution [FFT_WINDOW]` block execution without triggering additional audio capture.
  * The value ranges from `0` (complete silence) to `100` (clipped/extreme loud input). For a maximum-volume non-clipped sine wave, the value is around `70.8`.

* **`level of frequency [FREQUENCY] Hz`**
  * Returns the volume level (0 to 100) at the specified frequency (Hz) from the sampled frequency domain data.

* **`min decibel of frequency analyser`**
  * Returns the minimum decibel value of the analyser (default: `-90`).

* **`max decibel of frequency analyser`**
  * Returns the maximum decibel value of the analyser (default: `-10`).

* **`level of waveform at [INDEX]`**
  * Returns the waveform amplitude level (-50 to 50) at the specified 1-based index from the sampled time domain data.

* **`data length of waveform`**
  * Returns the length of the sampled time domain data (which corresponds to the FFT window size).


## How to Use in Xcratch

This extension can be used with other extension in [Xcratch](https://xcratch.github.io/). 
1. Open [Xcratch Editor](https://xcratch.github.io/editor)
2. Click 'Add Extension' button
3. Select 'Extension Loader' extension
4. Type the module URL in the input field 
```
https://yokobond.github.io/xcx-audio-analyser/dist/xcxAudioAnalyser.mjs
```
5. Click 'OK' button
6. Now you can use the blocks of this extension


## Development

### Install Dependencies

```sh
npm install
```

### Setup Development Environment

Change ```vmSrcOrg``` to your local ```scratch-vm``` directory in ```./scripts/setup-dev.js``` then run setup-dev script to setup development environment.

```sh
npm run setup-dev
```

### Bundle into a Module

Run build script to bundle this extension into a module file which could be loaded on Xcratch.

```sh
npm run build
```

### Watch and Bundle

Run watch script to watch the changes of source files and bundle automatically.

```sh
npm run watch
```

### Test

Run test script to test this extension.

```sh
npm run test
```


## 🏠 Home Page

Open this page from [https://yokobond.github.io/xcx-audio-analyser/](https://yokobond.github.io/xcx-audio-analyser/)


## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/yokobond/xcx-audio-analyser/issues). 
