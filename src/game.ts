import { Hero } from './entities/Hero';
import { Enemy } from './entities/Enemy';
import { Bomb, BombState } from './entities/Bomb';
import { Bullet } from './entities/Bullet';
import { Renderer } from './renderer';
import { ConfigManager } from './config';
import { WaveManager } from './managers/WaveManager';
import { InputManager } from './input';
import { Coin } from './entities/Coin';
import { AudioManager } from './audio/AudioManager';

export class Game {
    private lastTime: number = 0;
    public renderer: Renderer;
    private isRunning: boolean = false;

    public hero: Hero;
    public enemies: Enemy[] = [];
    public bombs: Bomb[] = []; // Detached bombs
    public bullets: Bullet[] = [];
    public coins: Coin[] = [];

    public score: number = 0;
    public coinCount: number = 0; // Currency for shop

    private shopCooldown: number = 0;
    public hitStopTimer: number = 0;

    public deathPauseTimer: number = 0;
    public deathHighlightTimer: number = 0;
    private isDeathSequenceStarted: boolean = false;

    public waveManager: WaveManager;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        console.log("Game Initialized");

        this.hero = new Hero(0, 0);
        this.waveManager = new WaveManager(this);
    }

    public start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    private loop(time: number) {
        if (!this.isRunning) return;

        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
        } else if (this.deathPauseTimer > 0) {
            this.deathPauseTimer -= dt;
            // Allow explosions (particles) to finish
            for (const bomb of this.bombs) {
                if (bomb.state === BombState.EXPLODING) bomb.update(dt, this);
            }
        } else {
            this.update(dt);
        }

        if (this.deathHighlightTimer > 0) {
            this.deathHighlightTimer -= dt;
        }

        this.renderer.render(this);

        requestAnimationFrame((t) => this.loop(t));
    }

    public restart() {
        this.hero = new Hero(0, 0);
        this.enemies = [];
        this.bombs = [];
        this.bullets = [];
        this.coins = [];
        this.score = 0;
        this.coinCount = 0;
        this.waveManager = new WaveManager(this);
        this.isDeathSequenceStarted = false;
        this.deathPauseTimer = 0;
        this.deathHighlightTimer = 0;
        console.log("Game Restarted");
    }

    public collectCoin(coin: Coin) {
        coin.isDead = true;
        // Let's rely on filter/splice
        const idx = this.coins.indexOf(coin);
        if (idx >= 0) {
            this.coins.splice(idx, 1);
            this.score += 100 * coin.value;
            this.coinCount += coin.value;
            AudioManager.playBuy();
            console.log(`Coin Collected! Total: ${this.coinCount}, Score: ${this.score}`);
        }
    }

    private buyUpgrade(type: string, cost: number) {
        if (this.coinCount >= cost) {
            const config = ConfigManager.getConfig();
            this.coinCount -= cost;
            this.shopCooldown = 0.3; // Prevent accidental double buy
            AudioManager.playBuy();

            switch (type) {
                case 'damage':
                    config.blaster.bullet_damage += config.blaster.upgrades.damage_increment;
                    console.log(`Upgraded Damage: ${config.blaster.bullet_damage}`);
                    break;
                case 'firerate':
                    config.blaster.fire_rate = Math.max(0.05, config.blaster.fire_rate - 0.05);
                    console.log(`Upgraded Fire Rate: ${config.blaster.fire_rate}`);
                    break;
                case 'multishot':
                    this.hero.multishot += config.blaster.upgrades.multishot_increment;
                    console.log(`Upgraded Multishot: ${this.hero.multishot}`);
                    break;
                case 'stamina':
                    this.hero.maxStamina += 60;
                    this.hero.stamina = this.hero.maxStamina; // Fill it up too
                    console.log(`Upgraded Stamina: ${this.hero.maxStamina}`);
                    break;
            }
        } else {
            console.log("Not enough money!");
            this.shopCooldown = 0.3;
        }
    }

    private update(dt: number) {
        if (this.shopCooldown > 0) this.shopCooldown -= dt;

        if (this.hero.isDead) {
            if (!this.isDeathSequenceStarted) {
                this.isDeathSequenceStarted = true;
                this.deathPauseTimer = 0.3; // FREEZE THE WORLD
                this.deathHighlightTimer = 0.7; // HIGHLIGHT
            }

            // Check for restart
            const input = InputManager.getInstance();
            if (input.keys[' ']) {
                this.restart();
            }
            return;
        }

        // Shop Logic (Intermission Only)
        // Check if we are in Shop or Ready state
        if (this.waveManager.isShopOpen || this.waveManager.isReady) {
            const input = InputManager.getInstance();

            // Allow upgrades only if Shop is strictly open (not just Ready to start game)
            if (this.waveManager.isShopOpen && this.shopCooldown <= 0) {
                // 1. Damage Up (Cost: 60)
                if (input.keys['1']) {
                    this.buyUpgrade('damage', 60);
                }
                // 2. Fire Rate Up (Cost: 90)
                else if (input.keys['2']) {
                    this.buyUpgrade('firerate', 90);
                }
                // 3. Multishot (Cost: 4x Base)
                else if (input.keys['3']) {
                    const config = ConfigManager.getConfig();
                    this.buyUpgrade('multishot', config.economy.upgrades.cost_base * 4);
                }
                // 4. Stamina +60 (Cost: 100)
                else if (input.keys['4']) {
                    this.buyUpgrade('stamina', 100);
                }
            }

            // SPACE to Trigger Next Phase (Start Countdown)
            // Works for both READY (Start game) and SHOP (Next Wave)
            if (input.keys[' '] && this.shopCooldown <= 0) {
                this.waveManager.triggerNextPhase();
                this.shopCooldown = 0.5; // Cooldown
            }
        }

        // Only update Hero (Move/Shoot) if Wave is Active
        if (this.waveManager.isWaveActive) {
            this.hero.update(dt, this);
        }

        // Always update wave manager (handles state transitions, timers)
        this.waveManager.update(dt);

        // Update Enemies
        // Reverse loop for safe removal
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, this);
            if (enemy.isDead) {
                this.enemies.splice(i, 1);

                // Drop Coin
                const config = ConfigManager.getConfig();
                const coinsDropped = config.economy.coins_drop_base;
                for (let j = 0; j < coinsDropped; j++) {
                    const cx = enemy.x + (Math.random() - 0.5) * 1.0;
                    const cy = enemy.y + (Math.random() - 0.5) * 1.0;
                    this.coins.push(new Coin(cx, cy, 1));
                }

                // Score for kill
                this.score += 50;
            }
        }

        // Update Detached Bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.update(dt, this);
            if (bomb.state === BombState.DEAD) {
                this.bombs.splice(i, 1);
            }
        }

        // Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt, this);
            if (bullet.isDead) {
                this.bullets.splice(i, 1);
            }
        }

        // Update Coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.update(dt, this);
        }
    }

    public getEntities() {
        return {
            hero: this.hero,
            enemies: this.enemies,
            bombs: this.bombs,
            bullets: this.bullets,
            coins: this.coins
        };
    }
}
