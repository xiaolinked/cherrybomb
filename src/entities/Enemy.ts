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

    private speed: number;

    constructor(x: number, y: number) {
        super(x, y);
        const config = ConfigManager.getConfig();

        this.maxHp = config.enemy.base_hp;
        this.hp = this.maxHp;

        this.maxShield = config.enemy.base_shield_hp;
        this.shield = this.maxShield;

        this.speed = config.enemy.movement.walk_speed;
        this.radius = 0.6; // Triangle base is 1.2, so radius 0.6 is good for physics
        this.color = '#FFD84D'; // Yellow

        // Attach Bomb
        this.bomb = new Bomb(x, y, this);
    }

    public angle: number = 0;

    public update(dt: number, game: Game): void {
        const config = ConfigManager.getConfig();
        const hero = game.hero;

        if (!hero) return;

        // 1. AI: Simple Follow
        const dx = hero.x - this.x;
        const dy = hero.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.angle = Math.atan2(dy, dx);

        if (dist > 0.1) {
            // Normalize direction
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Speed Selection (Charge if Armed)
            let moveSpeed = this.speed;
            if (this.bomb && this.bomb.state === BombState.ARMED) { // BombState.ARMED
                moveSpeed = config.enemy.movement.charge_speed;
            }

            // Move
            this.x += dirX * moveSpeed * dt;
            this.y += dirY * moveSpeed * dt;

            // Separation (Simple soft collision with other enemies)
            // This prevents them from stacking perfectly on top of each other
            for (const other of game.enemies) {
                if (other === this) continue;
                const d2 = this.distanceTo(other);
                if (d2 < this.radius * 2) {
                    // Push away
                    const pushX = this.x - other.x;
                    const pushY = this.y - other.y;
                    const len = Math.sqrt(pushX * pushX + pushY * pushY);
                    if (len > 0.01) {
                        this.x += (pushX / len) * this.speed * 0.5 * dt;
                        this.y += (pushY / len) * this.speed * 0.5 * dt;
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

    public takeDamage(amount: number) {
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

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Bloom Effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFD84D';

        // Draw Shield Aura if active
        // VISUAL SPEC: Radius 1.6, Color #4DFFF3, Opacity 70%
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 0.05;
            ctx.beginPath();
            ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.rotate(this.angle);

        // VISUAL SPEC: Armed State -> Slight shake (+/- 2 deg)
        if (this.bomb && this.bomb.state === BombState.ARMED) {
            const shake = (Math.random() - 0.5) * (4 * Math.PI / 180);
            ctx.rotate(shake);
        }

        // Draw Triangle
        // VISUAL SPEC: Base width 1.2, Height 1.4
        // Always points towards hero
        ctx.fillStyle = '#FFD84D';
        ctx.beginPath();
        // Height is along the facing axis (X when rotated)
        // Base width is across (Y when rotated)
        const h = 1.4;
        const b = 1.2;
        ctx.moveTo(h / 2, 0);          // Point
        ctx.lineTo(-h / 2, b / 2);       // Bottom Left
        ctx.lineTo(-h / 2, -b / 2);      // Bottom Right
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#8A6A00';
        ctx.lineWidth = 0.05;
        ctx.stroke();

        ctx.restore();

        // Draw Attached Bomb (on top)
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
