import { Game } from "../game";
import { ConfigManager } from "../config";
import { Enemy } from "../entities/Enemy";

export enum WaveState {
    READY,      // Before Wave 1
    COUNTDOWN,  // 3..2..1 before wave
    WAVE,       // Playing
    SHOP        // Intermission
}

export class WaveManager {
    private game: Game;
    public currentWave: number = 0;

    public state: WaveState = WaveState.READY;
    public stateTimer: number = 0; // Generic timer for countdown/wave

    private spawnTimer: number = 0;

    constructor(game: Game) {
        this.game = game;
    }

    public update(dt: number) {
        switch (this.state) {
            case WaveState.READY:
                // Wait for external Space input
                break;
            case WaveState.COUNTDOWN:
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.startWave();
                }
                break;
            case WaveState.WAVE:
                this.stateTimer -= dt; // Wave Duration
                if (this.stateTimer <= 0) {
                    this.endWave();
                } else {
                    this.handleSpawning(dt);
                }
                break;
            case WaveState.SHOP:
                // Wait for external Space input
                break;
        }
    }

    // Called by Game.ts on Space
    public triggerNextPhase() {
        if (this.state === WaveState.READY) {
            this.startCountdown();
        } else if (this.state === WaveState.SHOP) {
            this.startCountdown();
        }
    }

    private startCountdown() {
        this.state = WaveState.COUNTDOWN;
        this.stateTimer = 2.0; // 2 seconds
        console.log("Countdown Started");
    }

    private startWave() {
        this.currentWave++;
        this.state = WaveState.WAVE;
        const config = ConfigManager.getConfig();

        // Duration: Linear increase
        this.stateTimer = config.game_flow.wave_base_duration + (this.currentWave - 1) * config.game_flow.wave_duration_growth;

        console.log(`Wave ${this.currentWave} Started! Duration: ${this.stateTimer.toFixed(1)}s`);
    }

    private endWave() {
        this.state = WaveState.SHOP;
        console.log("Wave Ended! Shop Open.");

        // Auto-Heal Hero & Refill Stamina
        this.game.hero.hp = this.game.hero.maxHp;
        this.game.hero.stamina = this.game.hero.maxStamina;
        console.log("Hero HP & Stamina Restored.");

        // Clear Enemies, Bombs, and Coins
        this.game.enemies = [];
        this.game.bombs = [];
        this.game.coins = [];

        this.game.generateUpgradeOptions();
    }

    private handleSpawning(dt: number) {
        const config = ConfigManager.getConfig();

        // Target Count Scaling
        const targetCount = Math.floor(config.game_flow.wave_enemy_count_base * Math.pow(config.game_flow.wave_enemy_count_scaling, this.currentWave - 1));

        // Spawn if below cap
        if (this.game.enemies.length < targetCount) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnEnemy();
                this.spawnTimer = config.enemy.spawn.spawn_delay;
            }
        }
    }

    private spawnEnemy() {
        const config = ConfigManager.getConfig();
        const halfSize = config.arena.size / 2 - 1.5; // Stay within arena with margin

        // Random Position: Attempt to spawn at safe distance
        const angle = Math.random() * Math.PI * 2;
        const dist = config.enemy.spawn.min_distance_from_hero + Math.random() * (config.enemy.spawn.max_distance_from_hero - config.enemy.spawn.min_distance_from_hero);

        let x = this.game.hero.x + Math.cos(angle) * dist;
        let y = this.game.hero.y + Math.sin(angle) * dist;

        // Clamp to Arena
        x = Math.max(-halfSize, Math.min(halfSize, x));
        y = Math.max(-halfSize, Math.min(halfSize, y));

        const enemy = new Enemy(x, y);

        // Apply Wave Scaling
        if (this.currentWave > 1) {
            const hpMult = Math.pow(config.enemy.scaling.hp_per_wave, this.currentWave - 1);
            const shieldMult = Math.pow(config.enemy.scaling.shield_per_wave, this.currentWave - 1);

            enemy.maxHp *= hpMult;
            enemy.hp = enemy.maxHp;
            enemy.maxShield *= shieldMult;
            enemy.shield = enemy.maxShield;
        }

        this.game.enemies.push(enemy);
    }

    // Helpers for other classes
    public get isWaveActive(): boolean {
        return this.state === WaveState.WAVE;
    }

    public get isShopOpen(): boolean {
        return this.state === WaveState.SHOP;
    }

    public get isCountdown(): boolean {
        return this.state === WaveState.COUNTDOWN;
    }

    public get isReady(): boolean {
        return this.state === WaveState.READY;
    }
}
