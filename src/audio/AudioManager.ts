import { ZzFX } from './ZzFX';

export class AudioManager {
    private static sounds = {
        shoot: [.5, .1, 600, .01, 0, .1, 0, 1.5, 0, 0, 1, 0, 0, .25, 0, 0, 0, -.5, 0, 0], // Laser
        explode: [1, .2, 50, .01, .1, .5, 4, 1, 0, 0, 0, 0, 0, .8, 0, .1, .1, 0, 0, .5], // Boom
        coin: [.8, .1, 1000, .01, .1, .2, 0, 1.5, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0], // Chime
        buy: [.6, 0, 400, .05, .2, .3, 0, 1.5, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, .5] // Register
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
    static playBuy() { this.play('buy'); }
}
