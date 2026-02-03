import { ConfigManager } from "../config";
import { Game } from "../game";
import { Entity } from "./Entity";
import { Bomb, BombState } from "./Bomb";

export class Enemy extends Entity {
    public hp: number;
    public maxHp: number;
    public shield: number;
    public maxShield: number;

    public bomb: Bomb | null = null;

    protected speed: number;
    protected chargeSpeed: number;

    constructor(x: number, y: number) {
        super(x, y);
        const config = ConfigManager.getConfig();

        this.maxHp = config.enemy.base_hp;
        this.hp = this.maxHp;

        this.maxShield = config.enemy.base_shield_hp;
        this.shield = this.maxShield;

        this.speed = config.enemy.movement.walk_speed;
        this.chargeSpeed = config.enemy.movement.charge_speed;
        this.radius = config.enemy.radius;
        this.color = '#FFD84D'; // Yellow

        // Attach Bomb
        this.bomb = new Bomb(x, y, this);
    }

    public angle: number = 0;
    protected damageFlash: number = 0;
    protected freezeTimer: number = 0;

    public freeze(duration: number) {
        this.freezeTimer = Math.max(this.freezeTimer, duration);
    }

    public update(dt: number, game: Game): void {
        const config = ConfigManager.getConfig();
        const hero = game.hero;

        if (this.damageFlash > 0) this.damageFlash -= dt;

        if (this.isFadingOut) {
            this.opacity -= dt * 0.8;
            if (this.opacity < 0) this.opacity = 0;
            return; // STOP AI (no movement, no attacking)
        }

        // Freeze Check
        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            // When frozen, bomb still progresses but slowed? 
            // Let's say bomb still works but enemy can't move.
            if (this.bomb && this.bomb.parent === this) {
                this.bomb.update(dt, game);
                if (this.bomb && this.bomb.state === BombState.DETACHED) {
                    game.bombs.push(this.bomb);
                    this.bomb = null;
                }
            }
            return;
        }

        if (!hero) return;

        // 1. AI: Simple Follow
        const dx = hero.x - this.x;
        const dy = hero.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.angle = Math.atan2(dy, dx);

        if (dist > config.enemy.movement.stop_distance) {
            // Normalize direction
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Speed Selection (Charge if Armed)
            let moveSpeed = this.speed;
            if (this.bomb && this.bomb.state === BombState.ARMED) {
                moveSpeed = this.chargeSpeed;
            }

            // Move
            this.x += dirX * moveSpeed * dt;
            this.y += dirY * moveSpeed * dt;

            // Separation (Simple soft collision with other enemies)
            // This prevents them from stacking perfectly on top of each other
            for (const other of game.enemies) {
                if (other === this) continue;
                const d2 = this.distanceTo(other);
                if (d2 < this.radius * config.enemy.separation_distance_multiplier) {
                    // Push away
                    const pushX = this.x - other.x;
                    const pushY = this.y - other.y;
                    const len = Math.sqrt(pushX * pushX + pushY * pushY);
                    if (len > config.enemy.movement.separation_min_distance) {
                        this.x += (pushX / len) * this.speed * config.enemy.movement.separation_push_factor * dt;
                        this.y += (pushY / len) * this.speed * config.enemy.movement.separation_push_factor * dt;
                    }
                }
            }
        }

        if (this.bomb && this.bomb.parent === this) {
            this.bomb.update(dt, game);

            if (this.bomb && this.bomb.state === BombState.DETACHED) {
                // Determine logic: Hand off to Game?
                game.bombs.push(this.bomb);
                this.bomb = null; // No longer carrying it
            }
        }
    }

    public armBomb() {
        if (this.bomb) {
            this.bomb.arm();
        }
    }

    public takeDamage(amount: number) {
        this.damageFlash = 0.1;
        // Shield absorbs damage first
        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                // Shield Break!
                const overflow = -this.shield;
                this.shield = 0;
                this.hp -= overflow;
            }
        } else {
            this.hp -= amount;
        }

        if (this.hp <= 0) {
            this.isDead = true;
        }
    }

    public onDeath(_game: Game): void {
        // Overridden by subclasses
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);

        // Ground Shadow (Dynamic)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        const shadowScale = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
        ctx.ellipse(0, this.radius * 0.8, this.radius * shadowScale, this.radius * 0.4 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bloom / Glow Effect
        const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
        ctx.shadowBlur = 8 + pulse * 10;

        if (this.damageFlash > 0) {
            ctx.shadowColor = '#FFF';
        } else if (this.freezeTimer > 0) {
            ctx.shadowColor = '#3498DB';
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowColor = '#FFD84D';
        }

        // Draw Shield Aura if active
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = (0.5 + pulse * 0.3) * this.opacity;
            ctx.lineWidth = 0.08;
            ctx.beginPath();
            ctx.arc(0, 0, 1.4 + pulse * 0.2, 0, Math.PI * 2);
            ctx.stroke();

            // Subtle fill
            ctx.fillStyle = 'rgba(77, 255, 243, 0.05)';
            ctx.fill();
            ctx.restore();
        }

        ctx.rotate(this.angle);

        // Armed State -> Jitter & Brightness
        if (this.bomb && (this.bomb.state === BombState.ARMED || this.bomb.state === BombState.DETACHED)) {
            const jitter = (Math.random() - 0.5) * (6 * Math.PI / 180);
            if (this.freezeTimer <= 0) ctx.rotate(jitter); // Don't jitter if frozen
            ctx.shadowColor = this.freezeTimer > 0 ? '#3498DB' : '#FF3B3B';
            ctx.shadowBlur = 15 + Math.random() * 10;
        }

        // Draw Shape
        if (this.damageFlash > 0) {
            ctx.fillStyle = '#FFF';
        } else if (this.freezeTimer > 0) {
            ctx.fillStyle = '#AED6F1'; // Light blue ice
        } else {
            ctx.fillStyle = '#FFD84D';
        }
        ctx.beginPath();
        const h = 1.4;
        const b = 1.2;
        ctx.moveTo(h / 2, 0);
        ctx.lineTo(-h / 2, b / 2);
        ctx.lineTo(-h / 2, -b / 2);
        ctx.closePath();
        ctx.fill();

        // High-Quality Outline
        ctx.strokeStyle = this.damageFlash > 0 ? '#FFF' : 'rgba(138, 106, 0, 0.8)';
        ctx.lineWidth = 0.06;
        ctx.stroke();

        ctx.restore();

        // Draw Attached Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
