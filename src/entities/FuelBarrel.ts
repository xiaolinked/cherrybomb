import { Entity } from "./Entity";
import { Game } from "../game";
import { ConfigManager } from "../config";
import { FireZone } from "./FireZone";
import { AudioManager } from "../audio/AudioManager";
import { Bomb, BombState } from "./Bomb";

/**
 * Formerly FuelBarrel - Redesigned as Industrial Fuel Cell
 * Distinct from rocks via high-contrast hazard markings and technological structure.
 */
export class FuelBarrel extends Entity {
    public hp: number;
    public maxHp: number;

    constructor(x: number, y: number) {
        super(x, y);
        const config = ConfigManager.getConfig().arena.fuel_barrel;
        this.radius = config.radius;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.color = config.color;
    }

    private damageFlash: number = 0;
    private hoverTimer: number = Math.random() * Math.PI * 2;

    public update(dt: number, _game: Game): void {
        if (this.damageFlash > 0) this.damageFlash -= dt;
        this.hoverTimer += dt * 2.5;
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
        this.isDead = true;
        const config = ConfigManager.getConfig().arena.fuel_barrel;

        game.fireZones.push(new FireZone(this.x, this.y, config.fire_zone_duration, config.fire_zone_radius));

        const distHero = this.distanceTo(game.hero);
        if (distHero < config.explosion_radius) {
            const pct = 1.0 - (distHero / config.explosion_radius);
            game.hero.takeDamage(50 * pct, null as any);
        }

        const explosionRadius = config.explosion_radius;
        for (const enemy of game.enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) < explosionRadius) {
                enemy.armBomb();
            }
        }

        for (const other of game.fuelBarrels) {
            if (other === this || other.isDead) continue;
            if (this.distanceTo(other) < explosionRadius) {
                other.takeDamage(999, game);
            }
        }

        for (const otherBomb of game.bombs) {
            if (otherBomb.state === BombState.DEAD || otherBomb.state === BombState.EXPLODING) continue;
            if (this.distanceTo(otherBomb) < explosionRadius) {
                otherBomb.timer = Math.min(otherBomb.timer, 0.1);
            }
        }

        game.renderer.triggerShake(0.15, 0.35);
        AudioManager.playExplosion();
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        const hoverY = Math.sin(this.hoverTimer) * 0.2;
        ctx.translate(this.x, this.y + hoverY);

        // Ground Shadow
        ctx.save();
        ctx.translate(0, -hoverY);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius * 0.9, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const r = this.radius;
        const h = r * 1.6;

        if (this.damageFlash > 0) {
            ctx.fillStyle = '#FFF';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFF';
            ctx.fillRect(-r * 0.7, -h / 2, r * 1.4, h);
        } else {
            // 1. Metal Caps (Top & Bottom)
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 0.05;

            // Bottom Cap
            ctx.fillRect(-r * 0.8, h / 2 - 0.4, r * 1.6, 0.4);
            ctx.strokeRect(-r * 0.8, h / 2 - 0.4, r * 1.6, 0.4);

            // Top Cap
            ctx.fillRect(-r * 0.8, -h / 2, r * 1.6, 0.4);
            ctx.strokeRect(-r * 0.8, -h / 2, r * 1.6, 0.4);

            // 2. Hazard Stripes on Caps
            ctx.fillStyle = '#FFD700'; // Gold/Yellow
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(-r * 0.8 + (i * 0.4), -h / 2, 0.1, 0.4);
                ctx.fillRect(-r * 0.8 + (i * 0.4), h / 2 - 0.4, 0.1, 0.4);
            }

            // 3. Glowing Fuel Core (Glass Tube)
            const glow = (Math.sin(this.hoverTimer * 3) + 1) / 2;
            const coreGrad = ctx.createLinearGradient(-r * 0.6, 0, r * 0.6, 0);
            coreGrad.addColorStop(0, '#8B0000');
            coreGrad.addColorStop(0.5, `rgb(${255}, ${100 + glow * 50}, 0)`);
            coreGrad.addColorStop(1, '#8B0000');

            ctx.fillStyle = coreGrad;
            ctx.shadowBlur = 10 + glow * 10;
            ctx.shadowColor = '#FF4E00';
            ctx.fillRect(-r * 0.6, -h / 2 + 0.4, r * 1.2, h - 0.8);

            // Glass reflection
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(-r * 0.1, -h / 2 + 0.4, r * 0.2, h - 0.8);

        }

        ctx.restore();
    }
}
