import { ZzFX } from './ZzFX';

export class AudioManager {
    private static sounds = {
        shoot: [.5, .1, 600, .01, 0, .1, 0, 1.5, 0, 0, 1, 0, 0, .25, 0, 0, 0, -.5, 0, 0], // Laser
        explode: [1, .2, 50, .01, .1, .5, 4, 1, 0, 0, 0, 0, 0, .8, 0, .1, .1, 0, 0, .5], // Boom
        coin: [.5, 0, 1400, , .02, .05, 1, 1], // Quick Ding
        hit: [1, .1, 200, .01, .05, .3, 4, 0, 0, 0, 0, 0, 0, .5, 0, .1, .1, .9, .05], // Impact
        jackpot: [2, .1, 1000, .1, .2, .5, 1, 3, 0, 0, 100, .1, .1, 0, 0, 0, 0, 1.2, .1, 0], // Jackpot Chime
        buy: [.6, 0, 400, .05, .2, .3, 0, 1.5, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, .5], // Register
        reload: [1.3, .1, 200, .01, .05, .2, 4, 1.5, 0, 0, 50, .05, .05, 0, .1, 0, 0, .8, .05, 0], // Mechanical Rack/Click
        death: [1.5, .1, 50, .1, .5, .8, 4, 2, 0, 0, 0, 0, .25, .8, 0, .2, .2, -.5, .05, .5] // Sliding down / dying
    };

    static play(soundName: keyof typeof AudioManager.sounds) {
        try {
            ZzFX.play(...this.sounds[soundName]);
        } catch (e) {
            console.warn("Audio play failed:", e);
        }
    }

    static playShoot() { this.play('shoot'); }
    static playExplosion() { this.play('explode'); }
    static playCoin() { this.play('coin'); }
    static playHit() { this.play('hit'); }
    static playJackpot() { this.play('jackpot'); }
    static playBuy() { this.play('buy'); }
    static playReload() { this.play('reload'); }
    static playDeath() { this.play('death'); }

    private static audioCtx: AudioContext | null = null;

    static playRickRollSequence(notes: { freq: number, dur: number }[]) {
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = this.audioCtx;
            let currentTime = ctx.currentTime + 0.1;

            notes.forEach(note => {
                if (note.freq > 0) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'square'; // 8-bit sound
                    osc.frequency.setValueAtTime(note.freq, currentTime);

                    gain.gain.setValueAtTime(0.1, currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + note.dur - 0.05);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(currentTime);
                    osc.stop(currentTime + note.dur);
                }
                currentTime += note.dur; // Move forward in time for next note
            });
        } catch (e) {
            console.error("Audio error", e);
        }
    }
}
