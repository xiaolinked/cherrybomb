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
    }

    private updateProceduralGeneration() {
        const config = ConfigManager.getConfig();
        const density = config.arena.obstacle_density;
        const chunkSize = config.arena.chunk_size;
        const chunkRange = config.arena.chunk_range;

        const heroChunkX = Math.floor(this.hero.x / chunkSize);
        const heroChunkY = Math.floor(this.hero.y / chunkSize);

        for (let x = heroChunkX - chunkRange; x <= heroChunkX + chunkRange; x++) {
            for (let y = heroChunkY - chunkRange; y <= heroChunkY + chunkRange; y++) {
                const chunkId = `${x},${y}`;
                if (!this.generatedChunks.has(chunkId)) {
                    this.generateChunk(x, y, density, chunkSize);
                    this.generatedChunks.add(chunkId);
                }
            }
        }
    }

    private generateChunk(cx: number, cy: number, density: number, chunkSize: number) {
        const config = ConfigManager.getConfig();
        const obstacleConfig = config.arena.obstacle;

        // Reduced density for "less rocks" - from remote merge
        const finalDensity = density * 0.7;
        const count = Math.floor(chunkSize * chunkSize * finalDensity);

        for (let i = 0; i < count; i++) {
            const rx = cx * chunkSize + Math.random() * chunkSize;
            const ry = cy * chunkSize + Math.random() * chunkSize;

            if (Math.abs(rx) < config.arena.safe_radius && Math.abs(ry) < config.arena.safe_radius) continue;

            const radius = obstacleConfig.radius_min + Math.random() * (obstacleConfig.radius_max - obstacleConfig.radius_min);

            let overlap = false;
            for (const obs of this.obstacles) {
                const dx = obs.x - rx;
                const dy = obs.y - ry;
                const distSq = dx * dx + dy * dy;
                const minDist = (radius + obs.radius) + obstacleConfig.padding;
                if (distSq < minDist * minDist) {
                    overlap = true;
                    break;
                }
            }
            if (overlap) continue;

            const type = Math.random() > obstacleConfig.pillar_chance ? ObstacleType.ROCK : ObstacleType.PILLAR;
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
            const multiplier = coin.isLucky ? ConfigManager.getConfig().economy.coin.lucky_multiplier : 1;
            const gainedCoins = coin.value * multiplier;
            const config = ConfigManager.getConfig();
            this.score += config.economy.coin.score_per_coin * gainedCoins;
            this.coinCount += gainedCoins;

            if (coin.isLucky) {
                AudioManager.playJackpot();
            } else {
                AudioManager.playCoin();
            }
        }
    }

    private buyUpgrade(index: number) {
        const opt = this.currentShopOptions[index];
        if (!opt) return;

        if (this.coinCount >= opt.cost) {
            const config = ConfigManager.getConfig();
            this.coinCount -= opt.cost;
            this.shopCooldown = config.ui.shop.cooldown_after_buy;
            AudioManager.playBuy();

            switch (opt.type) {
                case 'damage':
                    config.blaster.bullet_damage += config.blaster.upgrades.damage_increment;
                    break;
                case 'firerate':
                    config.blaster.fire_rate = Math.max(config.blaster.upgrades.min_fire_rate, config.blaster.fire_rate - config.blaster.upgrades.fire_rate_decrement);
                    break;
                case 'multishot':
                    this.hero.multishot += config.blaster.upgrades.multishot_increment;
                    break;
                case 'health':
                    this.hero.maxHp += config.hero.hp.upgrade_increment;
                    this.hero.hp = this.hero.maxHp;
                    break;
                case 'stamina':
                    this.hero.maxStamina += config.hero.stamina.upgrade_increment;
                    this.hero.stamina = this.hero.maxStamina;
                    break;
            }
            this.currentShopOptions[index] = null as any;
        } else {
            this.shopCooldown = ConfigManager.getConfig().ui.shop.cooldown_after_buy;
        }
    }

    private update(dt: number) {
        this.updateProceduralGeneration();
        if (this.shopCooldown > 0) this.shopCooldown -= dt;

        const input = InputManager.getInstance();

        if (this.hero.isDead) {
            if (!this.isDeathSequenceStarted) {
                const config = ConfigManager.getConfig();
                this.isDeathSequenceStarted = true;
                this.deathPauseTimer = config.ui.death.pause_duration;
                this.deathHighlightTimer = config.ui.death.highlight_duration;
            }

            if (input.isNewClick()) {
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2 + 80;
                if (Math.abs(mx - cx) < 100 && Math.abs(my - cy) < 30) {
                    this.restart();
                    return;
                }
            }

            if (input.keys[' ']) this.restart();
            return;
        }

        if (this.waveManager.isShopOpen || this.waveManager.isReady) {
            const clickHappened = input.isNewClick();

            if (clickHappened || input.keys[' '] || input.keys['enter']) {
                const mx = input.mouse.x;
                const my = input.mouse.y;
                const cx = window.innerWidth / 2;
                const h = window.innerHeight;
                const isKeyboard = input.keys[' '] || input.keys['enter'];

                if (this.waveManager.isReady) {
                    const config = ConfigManager.getConfig();
                    const inButtonArea = Math.abs(mx - cx) < config.ui.shop.ready_button_width && Math.abs(my - h / 2) < config.ui.shop.ready_button_height;
                    if (isKeyboard || inButtonArea) {
                        this.waveManager.triggerNextPhase();
                        this.shopCooldown = config.ui.shop.cooldown_after_start;
                        input.keys[' '] = false;
                        input.keys['enter'] = false;
                        return;
                    }
                } else if (this.waveManager.isShopOpen && this.shopCooldown <= 0) {
                    const config = ConfigManager.getConfig();
                    const inButtonArea = Math.abs(mx - cx) < config.ui.shop.shop_button_width && Math.abs(my - config.ui.shop.shop_button_y) < config.ui.shop.shop_button_height;
                    if (isKeyboard || inButtonArea) {
                        this.waveManager.triggerNextPhase();
                        this.shopCooldown = config.ui.shop.cooldown_after_close;
                        input.keys[' '] = false;
                        input.keys['enter'] = false;
                        return;
                    }
                }
            }

            if (this.waveManager.isShopOpen && this.shopCooldown <= 0) {
                const optionsPerWave = ConfigManager.getConfig().shop.options_per_wave;
                for (let i = 0; i < optionsPerWave; i++) {
                    const opt = this.currentShopOptions[i];
                    if (opt && input.keys[(i + 1).toString()]) {
                        this.buyUpgrade(i);
                    }
                }

                if (clickHappened) {
                    const mx = input.mouse.x;
                    const my = input.mouse.y;
                    const cx = window.innerWidth / 2;
                    const config = ConfigManager.getConfig();
                    const startY = config.ui.shop.card_start_y;
                    const cardWidth = config.ui.shop.card_width;
                    const cardHeight = config.ui.shop.card_height;
                    const spacing = config.ui.shop.card_spacing;
                    const totalWidth = (cardWidth * optionsPerWave) + (spacing * (optionsPerWave - 1));
                    const startX = cx - totalWidth / 2;

                    for (let i = 0; i < optionsPerWave; i++) {
                        const opt = this.currentShopOptions[i];
                        if (!opt) continue;
                        const x = startX + i * (cardWidth + spacing);
                        const y = startY;
                        if (mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight) {
                            this.buyUpgrade(i);
                            break;
                        }
                    }
                }
            }
            return;
        }

        this.waveManager.update(dt);

        if (this.waveManager.isWaveActive) {
            this.hero.update(dt, this);
            this.checkObstacleCollision(this.hero, dt);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const config = ConfigManager.getConfig();
            const dx = enemy.x - this.hero.x;
            const dy = enemy.y - this.hero.y;
            if (dx * dx + dy * dy > config.enemy.despawn_distance * config.enemy.despawn_distance) {
                this.enemies.splice(i, 1);
                continue;
            }

            enemy.update(dt, this);
            this.checkObstacleCollision(enemy, dt);
            if (enemy.isDead) {
                this.enemies.splice(i, 1);
                const coinsDropped = config.economy.coins_drop_base + Math.floor(Math.random() * (config.economy.coins_drop_random_variance + 1));
                for (let j = 0; j < coinsDropped; j++) {
                    const cx = enemy.x + (Math.random() - 0.5) * config.economy.coin.drop_spread;
                    const cy = enemy.y + (Math.random() - 0.5) * config.economy.coin.drop_spread;
                    const isLucky = Math.random() < config.economy.coin.lucky_chance;
                    this.coins.push(new Coin(cx, cy, 1, isLucky));
                }
                this.score += config.economy.coin.score_per_kill;
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
            if (this.hero.distanceTo(coin) < ConfigManager.getConfig().economy.coin.pickup_distance) this.collectCoin(coin);

            const dx = coin.x - this.hero.x;
            const dy = coin.y - this.hero.y;
            const config = ConfigManager.getConfig();
            if (dx * dx + dy * dy > config.economy.coin.cleanup_distance * config.economy.coin.cleanup_distance) this.coins.splice(i, 1);
        }

        const config = ConfigManager.getConfig();
        if (this.obstacles.length > config.arena.obstacle.max_count) {
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                const dx = obs.x - this.hero.x;
                const dy = obs.y - this.hero.y;
                if (dx * dx + dy * dy > config.arena.obstacle.cleanup_distance * config.arena.obstacle.cleanup_distance) this.obstacles.splice(i, 1);
            }
        }
    }

    public generateUpgradeOptions() {
        const config = ConfigManager.getConfig();
        const pool: UpgradeOption[] = config.shop.upgrades as UpgradeOption[];
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        this.currentShopOptions = shuffled.slice(0, config.shop.options_per_wave);
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
