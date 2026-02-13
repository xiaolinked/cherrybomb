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
    public damagedByPlayer: boolean = false;
    protected shieldRadius: number = 1.6;

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

    public getCollisionRadius(): number {
        if (this.shield > 0) {
            return this.shieldRadius;
        }
        return this.radius;
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

            // Ensure the bomb also updates its opacity/fading logic
            if (this.bomb && this.bomb.parent === this) {
                this.bomb.update(dt, game);
            }
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
            for (const other of game.enemies) {
                if (other === this) continue;
                const distSq = this.distanceToSq(other);
                const minDist = this.radius * config.enemy.separation_distance_multiplier;
                if (distSq < minDist * minDist) {
                    const pushX = this.x - other.x;
                    const pushY = this.y - other.y;
                    const lenSq = pushX * pushX + pushY * pushY;
                    const minPushDistSq = config.enemy.movement.separation_min_distance * config.enemy.movement.separation_min_distance;
                    if (lenSq > minPushDistSq) {
                        const len = Math.sqrt(lenSq);
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

    public takeDamage(amount: number, isPlayer: boolean = false) {
        this.damageFlash = 0.1;
        if (isPlayer) this.damagedByPlayer = true;
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
        ctx.scale(1.1, 1.1); // Reduced from 1.4

        // Ground Shadow (Dynamic)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        const shadowScale = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
        ctx.ellipse(0, this.radius * 0.8, this.radius * shadowScale, this.radius * 0.4 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bloom / Glow Effect
        const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
        // ctx.shadowBlur = 4 + pulse * 4;

        if (this.damageFlash > 0) {
            // Flash color handled below
        } else if (this.freezeTimer > 0) {
            // Ice color handled below
        } else {
            // Standard color handled below
        }

        // Draw Shield Aura if active
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = (0.5 + pulse * 0.3) * this.opacity;
            ctx.lineWidth = 0.08;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius + pulse * 0.2, 0, Math.PI * 2);
            ctx.stroke();

            // Subtle fill
            ctx.fillStyle = 'rgba(77, 255, 243, 0.05)';
            ctx.fill();
            ctx.restore();
        }

        const isFacingLeft = Math.abs(this.angle) > Math.PI / 2;
        if (isFacingLeft) {
            ctx.scale(-1, 1);
        }

        // Apply a subtle lean in movement direction instead of full rotation
        const movementLean = Math.sin(Date.now() * 0.005) * 0.05;
        ctx.rotate(movementLean);

        if (this.bomb && (this.bomb.state === BombState.ARMED || this.bomb.state === BombState.DETACHED)) {
            const jitter = (Math.random() - 0.5) * (6 * Math.PI / 180);
            if (this.freezeTimer <= 0) ctx.rotate(jitter); // Don't jitter if frozen
        }

        // --- DRAW HUMANoid CYBORG ---
        const skinColor = this.damageFlash > 0 ? '#FFFFFF' : '#D2B48C';
        const armorColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#5DADE2' : '#333');
        const eyeColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#E1F5FE' : '#FF0000');

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.05;

        // Walking Animation based on distance moved (procedural)
        const walkCycle = Math.sin(Date.now() * 0.01 * this.speed) * 0.4;

        // Legs
        ctx.save();
        ctx.fillStyle = '#111'; // Dark pants
        // Left Leg
        ctx.save();
        ctx.translate(-0.15, 0.1);
        ctx.rotate(-walkCycle);
        ctx.fillRect(-0.1, 0, 0.2, 0.4);
        ctx.strokeRect(-0.1, 0, 0.2, 0.4);
        ctx.restore();
        // Right Leg
        ctx.save();
        ctx.translate(0.15, 0.1);
        ctx.rotate(walkCycle);
        ctx.fillRect(-0.1, 0, 0.2, 0.4);
        ctx.strokeRect(-0.1, 0, 0.2, 0.4);
        ctx.restore();
        ctx.restore();

        // Torso (Lean Forward)
        ctx.fillStyle = armorColor;
        ctx.beginPath();
        ctx.roundRect(-0.25, -0.4, 0.5, 0.6, 0.1);
        ctx.fill();
        ctx.stroke();

        // Backpack / Bomb Holder
        ctx.fillStyle = '#222';
        ctx.fillRect(-0.2, -0.3, 0.4, 0.3);

        // Head
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(0.1, -0.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Cyborg Eyes
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(0.2, -0.52, 0.04, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Final restore from the beginning of the draw method (from translate/rotate)

        // Draw Attached Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
