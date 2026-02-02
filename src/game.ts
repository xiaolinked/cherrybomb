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
import { Obstacle, ObstacleType } from './entities/Obstacle';

export interface UpgradeOption {
    type: 'damage' | 'firerate' | 'multishot' | 'health' | 'stamina';
    name: string;
    description: string;
    cost: number;
}

export class Game {
    private lastTime: number = 0;
    public renderer: Renderer;
    private isRunning: boolean = false;

    public hero: Hero;
    public enemies: Enemy[] = [];
    public bombs: Bomb[] = [];
    public bullets: Bullet[] = [];
    public coins: Coin[] = [];
    public obstacles: Obstacle[] = [];
    private generatedChunks: Set<string> = new Set();
    private readonly CHUNK_SIZE = 15;

    public score: number = 0;
    public coinCount: number = 0;
    public currentShopOptions: UpgradeOption[] = [];

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
        this.generateUpgradeOptions();
        // Procedural will handle initial spawn
    }

    private updateProceduralGeneration() {
        const config = ConfigManager.getConfig();
        const density = config.arena.obstacle_density || 0.02;

        const heroChunkX = Math.floor(this.hero.x / this.CHUNK_SIZE);
        const heroChunkY = Math.floor(this.hero.y / this.CHUNK_SIZE);

        for (let x = heroChunkX - 2; x <= heroChunkX + 2; x++) {
            for (let y = heroChunkY - 2; y <= heroChunkY + 2; y++) {
                const chunkId = `${x},${y}`;
                if (!this.generatedChunks.has(chunkId)) {
                    this.generateChunk(x, y, density);
                    this.generatedChunks.add(chunkId);
                }
            }
        }
    }

    private generateChunk(cx: number, cy: number, density: number) {
        // Reduced density for "less rocks"
        const finalDensity = density * 0.7;
        const count = Math.floor(this.CHUNK_SIZE * this.CHUNK_SIZE * finalDensity);

        for (let i = 0; i < count; i++) {
            // Hero starting area safety
            const rx = cx * this.CHUNK_SIZE + Math.random() * this.CHUNK_SIZE;
            const ry = cy * this.CHUNK_SIZE + Math.random() * this.CHUNK_SIZE;

            if (Math.abs(rx) < 5 && Math.abs(ry) < 5) continue;

            const radius = 1.0 + Math.random() * 1.5; // Bigger obstacles (1.0 to 2.5)

            // --- Overlap Prevention ---
            let overlap = false;
            for (const obs of this.obstacles) {
                const dx = obs.x - rx;
                const dy = obs.y - ry;
                const distSq = dx * dx + dy * dy;
                const minDist = (radius + obs.radius) + 1.0; // Radius + Padding
                if (distSq < minDist * minDist) {
                    overlap = true;
                    break;
                }
            }
            if (overlap) continue;

            const type = Math.random() > 0.5 ? ObstacleType.PILLAR : ObstacleType.ROCK;
            this.obstacles.push(new Obstacle(rx, ry, type, radius));
        }
    }

    public checkObstacleCollision(entity: any, _dt: number): boolean {
        let collided = false;
        for (const obs of this.obstacles) {
            const dx = entity.x - obs.x;
            const dy = entity.y - obs.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = entity.radius + obs.radius;

            if (dist < minDist) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                entity.x += nx * overlap;
                entity.y += ny * overlap;
                collided = true;
            }
        }
        return collided;
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
        this.obstacles = [];
        this.generatedChunks.clear();
        this.score = 0;
        this.coinCount = 0;
        this.waveManager = new WaveManager(this);
        this.isDeathSequenceStarted = false;
        this.deathPauseTimer = 0;
        this.deathHighlightTimer = 0;
        this.generateUpgradeOptions();
        console.log("Game Restarted");
    }

    public collectCoin(coin: Coin) {
        coin.isDead = true;
        const idx = this.coins.indexOf(coin);
        if (idx >= 0) {
            this.coins.splice(idx, 1);

            const multiplier = coin.isLucky ? 3 : 1;
            const gainedCoins = coin.value * multiplier;

            this.score += 100 * gainedCoins;
            this.coinCount += gainedCoins;

            if (coin.isLucky) {
                AudioManager.playJackpot();
            } else {
                AudioManager.playCoin();
            }
            console.log(`Coin Collected! Total: ${this.coinCount}, Score: ${this.score} ${coin.isLucky ? '(LUCKY 3X!)' : ''}`);
        }
    }

    private buyUpgrade(index: number) {
        const opt = this.currentShopOptions[index];
        if (!opt) return;

        if (this.coinCount >= opt.cost) {
            const config = ConfigManager.getConfig();
            this.coinCount -= opt.cost;
            this.shopCooldown = 0.3;
            AudioManager.playBuy();

            switch (opt.type) {
                case 'damage':
                    config.blaster.bullet_damage += config.blaster.upgrades.damage_increment;
                    break;
                case 'firerate':
                    config.blaster.fire_rate = Math.max(0.05, config.blaster.fire_rate - 0.05);
                    break;
                case 'multishot':
                    this.hero.multishot += config.blaster.upgrades.multishot_increment;
                    break;
                case 'health':
                    this.hero.maxHp += config.hero.hp.upgrade_increment;
                    this.hero.hp = this.hero.maxHp;
                    break;
                case 'stamina':
                    this.hero.maxStamina += 60;
                    this.hero.stamina = this.hero.maxStamina;
                    break;
            }

            // Remove item from shop
            this.currentShopOptions[index] = null as any;
        } else {
            this.shopCooldown = 0.3;
        }
    }

    private update(dt: number) {
        this.updateProceduralGeneration();
        if (this.shopCooldown > 0) this.shopCooldown -= dt;

        if (this.hero.isDead) {
            if (!this.isDeathSequenceStarted) {
                this.isDeathSequenceStarted = true;
                this.deathPauseTimer = 0.3;
                this.deathHighlightTimer = 0.7;
            }
            const input = InputManager.getInstance();

            // Check for RESTART click
            if (input.isNewClick()) {
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2 + 80; // Match Renderer position

                // Button 200x60
                if (Math.abs(mx - cx) < 100 && Math.abs(my - cy) < 30) {
                    this.restart();
                }
            }

            // Still allow space for non-mobile preferrers
            if (input.keys[' ']) this.restart();
            return;
        }

        if (this.waveManager.isShopOpen || this.waveManager.isReady) {
            const input = InputManager.getInstance();

            // Handle Button Clicks
            if (input.isNewClick()) {
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const cx = window.innerWidth / 2;
                const h = window.innerHeight;

                if (this.waveManager.isReady) {
                    if (Math.abs(mx - cx) < 140 && Math.abs(my - h / 2) < 27.5) {
                        this.waveManager.triggerNextPhase();
                        this.shopCooldown = 0.5;
                        return;
                    }
                } else if (this.waveManager.isShopOpen && this.shopCooldown <= 0) {
                    if (Math.abs(mx - cx) < 110 && Math.abs(my - 85) < 22.5) {
                        this.waveManager.triggerNextPhase();
                        this.shopCooldown = 0.5;
                        return;
                    }
                }
            }

            if (this.waveManager.isShopOpen && this.shopCooldown <= 0) {
                // Keyboard Input
                for (let i = 0; i < 3; i++) {
                    const opt = this.currentShopOptions[i];
                    if (opt && input.keys[(i + 1).toString()]) {
                        this.buyUpgrade(i);
                    }
                }

                // Mouse Input (Clickable Cards)
                if (input.isNewClick()) {
                    const mx = input.mouse.x;
                    const my = input.mouse.y;
                    const cx = window.innerWidth / 2;
                    const startY = 150;
                    const cardWidth = 200;
                    const cardHeight = 120;
                    const spacing = 20;
                    const totalWidth = (cardWidth * 3) + (spacing * 2);
                    const startX = cx - totalWidth / 2;

                    for (let i = 0; i < 3; i++) {
                        const opt = this.currentShopOptions[i];
                        if (!opt) continue;

                        const x = startX + i * (cardWidth + spacing);
                        const y = startY;

                        if (mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight) {
                            this.buyUpgrade(i);
                            break; // Handle one click at a time
                        }
                    }
                }
            }
            return;
        }

        this.waveManager.update(dt);

        // Restrict Hero movement during non-wave/countdown states
        if (this.waveManager.isWaveActive) {
            this.hero.update(dt, this);
            this.checkObstacleCollision(this.hero, dt);
        } else {
            // Still allow rotation/aiming if needed? 
            // Hero.update handles position + input. 
            // We can call hero.update but pass a flag or just keep it frozen.
            // Frozen is clearer for "don't let that happen".
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Cleanup: Despawn if too far from hero
            const dx = enemy.x - this.hero.x;
            const dy = enemy.y - this.hero.y;
            if (dx * dx + dy * dy > 40 * 40) {
                this.enemies.splice(i, 1);
                continue;
            }

            enemy.update(dt, this);
            this.checkObstacleCollision(enemy, dt);
            if (enemy.isDead) {
                this.enemies.splice(i, 1);
                const config = ConfigManager.getConfig();
                const coinsDropped = config.economy.coins_drop_base;
                for (let j = 0; j < coinsDropped; j++) {
                    const cx = enemy.x + (Math.random() - 0.5) * 1.0;
                    const cy = enemy.y + (Math.random() - 0.5) * 1.0;
                    const isLucky = Math.random() < 0.05;
                    this.coins.push(new Coin(cx, cy, 1, isLucky));
                }
                this.score += 50;
            }
        }

        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.update(dt, this);
            if (bomb.state === BombState.DEAD) this.bombs.splice(i, 1);
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt, this);
            if (bullet.isDead) this.bullets.splice(i, 1);
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.update(dt, this);
            if (this.hero.distanceTo(coin) < 0.5) this.collectCoin(coin);

            // Cleanup Coins
            const dx = coin.x - this.hero.x;
            const dy = coin.y - this.hero.y;
            if (dx * dx + dy * dy > 50 * 50) this.coins.splice(i, 1);
        }

        // Cleanup Obstacles
        if (this.obstacles.length > 300) {
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                const dx = obs.x - this.hero.x;
                const dy = obs.y - this.hero.y;
                if (dx * dx + dy * dy > 80 * 80) this.obstacles.splice(i, 1);
            }
        }
    }

    public generateUpgradeOptions() {
        const pool: UpgradeOption[] = [
            { type: 'damage', name: 'Raw Power', description: '+2 Damage', cost: 25 },
            { type: 'firerate', name: 'Rapid Fire', description: 'Faster Shoots', cost: 40 },
            { type: 'multishot', name: 'Multishot', description: '+1 Bullet/Shot', cost: 60 },
            { type: 'health', name: 'Vitality', description: '+50 Max HP', cost: 30 },
            { type: 'stamina', name: 'Endurance', description: '+60 Max Stamina', cost: 25 }
        ];
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        this.currentShopOptions = shuffled.slice(0, 3);
    }

    public getEntities() {
        return {
            hero: this.hero,
            enemies: this.enemies,
            bombs: this.bombs,
            bullets: this.bullets,
            coins: this.coins,
            obstacles: this.obstacles
        };
    }
}
