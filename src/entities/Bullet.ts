import { Entity } from "./Entity";
import { Game } from "../game";
import { ConfigManager } from "../config";

export class Bullet extends Entity {
    private velocity: { x: number, y: number };
    private damage: number;
    private maxLifetime: number; // Range / Speed
    private lifetime: number = 0;

    constructor(x: number, y: number, targetX: number, targetY: number) {
        super(x, y);
        const config = ConfigManager.getConfig();
        this.radius = 0.15;
        this.color = '#00FFFF';
        this.damage = config.blaster.bullet_damage;

        const speed = config.blaster.bullet_speed;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.velocity = {
            x: (dx / dist) * speed,
            y: (dy / dist) * speed
        };

        // Lifetime = Range / Speed
        this.maxLifetime = config.blaster.bullet_range / speed;
    }

    public update(dt: number, game: Game): void {
        // Move
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        // Lifetime
        this.lifetime += dt;
        if (this.lifetime >= this.maxLifetime) {
            this.isDead = true;
            return;
        }

        if (this.isFadingOut) {
            this.opacity -= dt * 0.8;
            if (this.opacity < 0) this.opacity = 0;
        }

        // Collision with Obstacles
        for (const obs of game.obstacles) {
            if (this.distanceTo(obs) < (this.radius + obs.radius)) {
                this.isDead = true;
                return;
            }
        }

        // Collision with Enemies
        for (const enemy of game.enemies) {
            if (this.distanceTo(enemy) < (this.radius + enemy.radius)) {
                enemy.takeDamage(this.damage);
                this.isDead = true;
                return;
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
