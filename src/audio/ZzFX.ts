// ZzFX - Zuper Zmall Zound Zynth - MIT License - Copyright 2019 Frank Force

export class ZzFX {
    static x: AudioContext | null = null;

    // Play a sound from a ZzFX array
    static play(...parameters: any[]) {
        // Initialize audio context on first play
        if (!this.x) {
            this.x = new (window.AudioContext || (window as any).webkitAudioContext)();
            console.log("AudioContext Initialized. State:", this.x.state);
        }

        // Resume if suspended (browser security requirement)
        if (this.x.state === 'suspended') {
            this.x.resume().then(() => {
                console.log("AudioContext Resumed.");
            });
        }

        const [
            volume = 1, _randomness = .05, frequency = 220, attack = 0, sustain = 0,
            release = .1, _shape = 0, _shapeCurve = 1, _desire = 0, _delay = 0,
            _sustainVolume = 1, _sustainRandomness = 0, _filter = 0, noise = 0,
            _repeat = 0, echo = 0, echoDelay = 0, slide = 0, slideStep = 0,
            _reverb = 0
        ] = parameters;

        const sampleRate = 44100;
        const length = Math.max(1, Math.floor((attack + sustain + release) * sampleRate));
        const buffer = this.x.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; ++i) {
            let t = i / sampleRate;
            let s = 1;

            // Apply volume envelope
            if (t < attack) s = t / attack;
            else if (t < attack + sustain) s = 1;
            else if (t < attack + sustain + release) s = 1 - (t - attack - sustain) / release;

            // Oscillator
            const f = frequency * (1 + slide * t + slideStep * t * t);
            let v = Math.sin(2 * Math.PI * f * t);

            // Noise
            if (noise) v = v * (1 - noise) + (Math.random() * 2 - 1) * noise;

            // Echo
            if (echo && i > echoDelay * sampleRate) {
                const echoIdx = Math.floor(i - echoDelay * sampleRate);
                v += data[echoIdx] * echo;
            }

            data[i] = v * s * volume;
        }

        const source = this.x.createBufferSource();
        source.buffer = buffer;
        source.connect(this.x.destination);
        source.start();
        return source;
    }
}
