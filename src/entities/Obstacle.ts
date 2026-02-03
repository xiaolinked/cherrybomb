import { Entity } from "./Entity";

export enum ObstacleType {
    PILLAR = 'PILLAR', // Now "Energy Pylon"
    ROCK = 'ROCK'     // Now "Void Crystal"
}

export class Obstacle extends Entity {
    public type: ObstacleType;
    private rotation: number;

    constructor(x: number, y: number, type: ObstacleType, radius: number = 0.8) {
        super(x, y);
        this.type = type;
        this.radius = radius;
        this.color = type === ObstacleType.PILLAR ? '#2C3E50' : '#1A0000';
        this.rotation = Math.random() * Math.PI * 2;
    }

    public update(_dt: number): void {
        // Static
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.type === ObstacleType.PILLAR) {
            // --- Thermal Siphon ---
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(255, 60, 0, 0.6)';

            const grad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
            grad.addColorStop(0, '#111');
            grad.addColorStop(0.5, '#444'); // Lighter metal
            grad.addColorStop(1, '#000');

            ctx.fillStyle = grad;
            ctx.beginPath();
            // Octagon shape
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2;
                const px = Math.cos(ang) * this.radius;
                const py = Math.sin(ang) * this.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Bright Outline for visibility
            ctx.strokeStyle = '#FF4E00';
            ctx.lineWidth = 0.08;
            ctx.stroke();

            // Inner Heat Core (More intense)
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FF7B00';
            ctx.fillStyle = '#FF7B00';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // --- Volcanic Obsidian ---
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 69, 0, 0.5)'; // Orange glow for visibility

            const crystalGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            crystalGrad.addColorStop(0, '#331111'); // Brighter dark red
            crystalGrad.addColorStop(0.7, '#1a0000');
            crystalGrad.addColorStop(1, '#000');

            ctx.fillStyle = crystalGrad;

            // Jagged crystal
            ctx.beginPath();
            const seed = parseInt(this.id, 36);
            const vertices = 5 + (seed % 3);
            for (let i = 0; i < vertices; i++) {
                const angle = (i / vertices) * Math.PI * 2;
                const r = this.radius * (0.8 + (Math.abs(Math.sin(seed + i)) * 0.4));
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Glowing Magma Cracks (Very Visible)
            ctx.strokeStyle = '#FF4E00';
            ctx.lineWidth = 0.1;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF4E00';
            ctx.beginPath();
            for (let i = 0; i < vertices; i++) {
                const angle = (i / vertices) * Math.PI * 2;
                const px = Math.cos(angle) * this.radius * 0.2;
                const py = Math.sin(angle) * this.radius * 0.2;
                ctx.moveTo(px, py);
                ctx.lineTo(Math.cos(angle + 0.2) * this.radius * 0.9, Math.sin(angle + 0.2) * this.radius * 0.9);
            }
            ctx.stroke();

            // Sharp Outline
            ctx.strokeStyle = 'rgba(255, 78, 0, 0.8)';
            ctx.lineWidth = 0.05;
            ctx.stroke();
        }

        ctx.restore();
    }
}
