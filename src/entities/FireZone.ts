import { Entity } from "./Entity";
import { Game } from "../game";

export class FireZone extends Entity {
    public duration: number;
    public timer: number = 0;
    public maxRadius: number;
    private embers: { x: number, y: number, vx: number, vy: number, life: number, sz: number }[] = [];

    constructor(x: number, y: number, duration: number, radius: number) {
        super(x, y);
        this.duration = duration;
        this.maxRadius = radius;
        this.radius = radius;

        // Init some embers
        for (let i = 0; i < 15; i++) {
            this.spawnEmber();
        }
    }

    private spawnEmber() {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.maxRadius;
        this.embers.push({
            x: Math.cos(ang) * dist,
            y: Math.sin(ang) * dist,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -Math.random() * 1.5 - 0.5,
            life: 1.0,
            sz: 0.05 + Math.random() * 0.1
        });
    }

    private damageTickTimer: number = 0;

    public update(dt: number, game: Game): void {
        this.timer += dt;
        if (this.timer >= this.duration) {
            this.isDead = true;
            return;
        }

        // Update Embers
        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.life -= dt * 0.8;
            if (e.life <= 0) {
                this.embers.splice(i, 1);
                if (this.timer < this.duration - 1) this.spawnEmber();
            }
        }

        // Damage Hero (0.25s Tick Rate)
        this.damageTickTimer += dt;
        if (this.damageTickTimer >= 0.25) {
            this.damageTickTimer = 0;
            const distHero = this.distanceTo(game.hero);
            if (distHero < this.maxRadius) {
                // Apply burning damage (3 HP every 0.25s = 12 HP/sec)
                game.hero.takeDamage(3, null as any);
            }
        }

        // Arm enemies in the zone
        for (const enemy of game.enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.maxRadius) {
                enemy.armBomb();
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        const lifePct = 1 - (this.timer / this.duration);
        const pulse = Math.sin(Date.now() * 0.008) * 0.05 + 1.0;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Core Heat Glow
        const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.maxRadius * pulse);
        innerGrad.addColorStop(0, 'rgba(255, 200, 50, 0.4)');
        innerGrad.addColorStop(0.4, 'rgba(230, 100, 30, 0.2)');
        innerGrad.addColorStop(1, 'rgba(200, 50, 20, 0)');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.maxRadius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Outer Ring / Heat Haze Effect
        ctx.strokeStyle = `rgba(255, 100, 0, ${lifePct * 0.3})`;
        ctx.lineWidth = 0.1;
        ctx.setLineDash([0.2, 0.4]);
        ctx.beginPath();
        ctx.arc(0, 0, this.maxRadius * (0.95 + Math.sin(this.timer * 5) * 0.02), 0, Math.PI * 2);
        ctx.stroke();

        // Embers
        for (const e of this.embers) {
            ctx.globalAlpha = e.life * lifePct;
            ctx.fillStyle = e.life > 0.5 ? '#FFFDB5' : '#FF9D00';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.sz, 0, Math.PI * 2);
            ctx.fill();

            // Ember Bloom
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#FF9D00';
            ctx.stroke();
        }

        ctx.restore();
    }
}
