import { Entity } from "./Entity";
import { Game } from "../game";
import { ConfigManager } from "../config";
import { AudioManager } from "../audio/AudioManager";
import { Bomb, BombState } from "./Bomb";

/**
 * Formerly CryoBarrel - Redesigned as Magnetic Stasis Node
 * High technological look with rotating rings to distinguish from rocks.
 */
export class CryoBarrel extends Entity {
    public hp: number;
    public maxHp: number;

    constructor(x: number, y: number) {
        super(x, y);
        const config = ConfigManager.getConfig().arena.cryo_barrel;
        this.radius = config.radius;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.color = config.color;
    }

    private damageFlash: number = 0;
    private hoverTimer: number = Math.random() * Math.PI * 2;
    private isExploding: boolean = false;
    private explosionTimer: number = 0;
    private explosionDuration: number = 0.5;
    private shards: { angle: number, dist: number, speed: number, rot: number }[] = [];

    public update(dt: number, _game: Game): void {
        if (this.isExploding) {
            this.explosionTimer += dt;
            if (this.explosionTimer >= this.explosionDuration) {
                this.isDead = true;
            }
            for (const shard of this.shards) {
                shard.dist += shard.speed * dt;
                shard.rot += dt * 5;
            }
            return;
        }

        if (this.damageFlash > 0) this.damageFlash -= dt;
        this.hoverTimer += dt * 2.0;
    }

    public takeDamage(amount: number, game: Game): void {
        if (this.isDead) return;
        this.hp -= amount;
        this.damageFlash = 0.15;
        if (this.hp <= 0) {
            this.explode(game);
        }
    }

    private explode(game: Game): void {
        if (this.isExploding) return;
        this.isExploding = true;
        this.explosionTimer = 0;

        for (let i = 0; i < 8; i++) {
            this.shards.push({
                angle: (i / 8) * Math.PI * 2 + Math.random() * 0.5,
                dist: this.radius,
                speed: 6 + Math.random() * 8,
                rot: Math.random() * Math.PI * 2
            });
        }

        const config = ConfigManager.getConfig().arena.cryo_barrel;
        const freezeRadius = config.freeze_radius;
        for (const enemy of game.enemies) {
            if (this.distanceTo(enemy) < freezeRadius) {
                (enemy as any).freeze(config.freeze_duration);
            }
        }

        for (const otherBomb of game.bombs) {
            if (otherBomb.state === BombState.DEAD || otherBomb.state === BombState.EXPLODING) continue;
            if (this.distanceTo(otherBomb) < freezeRadius) {
                otherBomb.timer += 1.0;
            }
        }

        game.renderer.triggerShake(0.1, 0.3);
        AudioManager.playExplosion();
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        if (this.isExploding) {
            const progress = this.explosionTimer / this.explosionDuration;
            const alpha = 1 - progress;
            const config = ConfigManager.getConfig().arena.cryo_barrel;
            const maxRadius = config.freeze_radius;
            const currentRadius = maxRadius * (1 - Math.pow(1 - progress, 3));

            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.strokeStyle = `rgba(176, 243, 255, ${alpha * 0.6})`;
            ctx.lineWidth = 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            for (const shard of this.shards) {
                ctx.save();
                ctx.translate(Math.cos(shard.angle) * shard.dist, Math.sin(shard.angle) * shard.dist);
                ctx.rotate(shard.rot);
                ctx.beginPath();
                ctx.moveTo(0, -0.2); ctx.lineTo(0.1, 0.1); ctx.lineTo(-0.1, 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
            return;
        }

        ctx.save();
        const hoverY = Math.sin(this.hoverTimer) * 0.25;
        ctx.translate(this.x, this.y + hoverY);

        // Ground Shadow
        ctx.save();
        ctx.translate(0, -hoverY);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius * 0.9, this.radius * 0.7, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const pulse = (Math.sin(this.hoverTimer * 2) + 1) / 2;

        if (this.damageFlash > 0) {
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 1. Sleek Tech Sphere
            ctx.shadowBlur = 15 + pulse * 10;
            ctx.shadowColor = '#00D4FF';

            const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.7);
            coreGrad.addColorStop(0, '#FFF');
            coreGrad.addColorStop(0.4, '#00D4FF');
            coreGrad.addColorStop(1, '#005778');

            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // 2. Rotating Magnetic Rings
            ctx.strokeStyle = '#B0F3FF';
            ctx.lineWidth = 0.08;

            // Ring A (Verticalish)
            ctx.save();
            ctx.rotate(this.hoverTimer * 0.5);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Ring B (Horizontalish)
            ctx.save();
            ctx.rotate(-this.hoverTimer * 0.8);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 0.4, Math.PI / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

        }

        ctx.restore();
    }
}
