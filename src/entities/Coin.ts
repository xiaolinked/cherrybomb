import { Entity } from "./Entity";
import { Game } from "../game";

export class Coin extends Entity {
    public value: number = 1;
    public magnetRange: number = 3.0; // Distance to start flying to hero
    public speed: number = 8.0;

    // Animation
    private bounceOffset: number = Math.random() * Math.PI * 2;
    private age: number = 0;

    constructor(x: number, y: number, value: number = 1) {
        super(x, y);
        this.value = value;
        this.color = '#FFD700'; // Gold
        this.radius = 0.25;
    }

    public update(dt: number, game: Game): void {
        this.age += dt;

        // Magnet Logic
        const dist = this.distanceTo(game.hero);
        if (dist < this.magnetRange) {
            // Fly towards hero
            const dx = game.hero.x - this.x;
            const dy = game.hero.y - this.y;
            const angle = Math.atan2(dy, dx);

            // Accelerate as it gets closer? Or constant speed
            // Simple constant speed for now
            this.x += Math.cos(angle) * this.speed * dt;
            this.y += Math.sin(angle) * this.speed * dt;

            // Collection (Close enough)
            if (dist < 0.5) {
                game.collectCoin(this);
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Bounce Animation
        const bounce = Math.sin(this.age * 5 + this.bounceOffset) * 0.1;
        ctx.translate(0, bounce);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Shine/Sparkle
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-0.1, -0.1, 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
