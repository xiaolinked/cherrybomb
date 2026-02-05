import { Entity } from "./Entity";
import { Game } from "../game";

export class Coin extends Entity {
    public value: number = 1;
    public isLucky: boolean = false;
    public magnetRange: number = 3.0; // Distance to start flying to hero
    public speed: number = 8.0;

    // Animation
    private age: number = 0;

    constructor(x: number, y: number, value: number = 1, isLucky: boolean = false) {
        super(x, y);
        this.value = value;
        this.isLucky = isLucky;
        this.radius = isLucky ? 0.45 : 0.3;
    }

    public update(dt: number, game: Game): void {
        if (this.isFadingOut) {
            this.opacity -= dt * 0.8;
            if (this.opacity < 0) this.opacity = 0;
        }
        this.age += dt;

        // Magnet Logic
        const dist = this.distanceTo(game.hero);
        if (dist < this.magnetRange) {
            const dx = game.hero.x - this.x;
            const dy = game.hero.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * this.speed * dt;
            this.y += Math.sin(angle) * this.speed * dt;

            if (dist < 0.5) {
                game.collectCoin(this);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);

        // Slow spin effect via scaling
        const spin = Math.cos(this.age * 4);
        ctx.scale(Math.abs(spin), 1);

        // Metallic Gradient
        const r = this.radius;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        if (this.isLucky) {
            grad.addColorStop(0, '#fff'); // Platinum/Shiny
            grad.addColorStop(0.5, '#bdc3c7');
            grad.addColorStop(1, '#7f8c8d');
            // ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            // ctx.shadowBlur = 4;
        } else {
            grad.addColorStop(0, '#f1c40f'); // Gold
            grad.addColorStop(0.7, '#f39c12');
            grad.addColorStop(1, '#d35400');
            // ctx.shadowColor = 'rgba(211, 84, 0, 0.3)';
            // ctx.shadowBlur = 2;
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Rim
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 0.05;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}
