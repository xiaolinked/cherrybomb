import { Enemy } from "./Enemy";

export class FastEnemy extends Enemy {
    constructor(x: number, y: number) {
        super(x, y);

        // Stats Override (Fast & Fragile)
        this.maxHp = 10;
        this.hp = this.maxHp;

        this.maxShield = 10;
        this.shield = this.maxShield;

        this.speed = 12.0; // Faster than hero (Base is 10.0)
        this.chargeSpeed = 16.0; // Extremely fast when armed
        this.shieldRadius = 1.4;

        this.color = '#FF3333'; // Bright Red
        this.radius = 0.6; // Reduced from 0.8

        // Reduced Bomb Damage
        if (this.bomb) {
            this.bomb.damage = 25; // Half of base damage
            this.bomb.radiusExplosion = 3.0; // Slightly smaller explosion too
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.scale(1.1, 1.1);

        // Bloom
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = this.color;

        // Shield
        if (this.shield > 0) {
            ctx.save();
            ctx.strokeStyle = '#4DFFF3';
            ctx.globalAlpha = 0.7 * this.opacity;
            ctx.lineWidth = 0.05;
            ctx.beginPath();
            ctx.arc(0, 0, this.shieldRadius, 0, Math.PI * 2); // Smaller shield radius
            ctx.stroke();
            ctx.restore();
        }

        const isFacingLeft = Math.abs(this.angle) > Math.PI / 2;
        if (isFacingLeft) {
            ctx.scale(-1, 1);
        }

        // Apply forward-leaning run tilt
        ctx.rotate(0.1);

        // --- DRAW CYBER SCOUT RUNNER ---
        const baseColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#AED6F1' : '#FF3333');
        const plateColor = this.damageFlash > 0 ? '#FFFFFF' : (this.freezeTimer > 0 ? '#5DADE2' : '#800000');

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.04;

        const runCycle = Math.sin(Date.now() * 0.02 * this.speed) * 0.6;

        // Lean Runner Legs
        ctx.fillStyle = '#000';
        // Left
        ctx.save();
        ctx.translate(-0.1, 0.1);
        ctx.rotate(-runCycle);
        ctx.fillRect(-0.05, 0, 0.12, 0.45);
        ctx.strokeRect(-0.05, 0, 0.12, 0.45);
        ctx.restore();
        // Right
        ctx.save();
        ctx.translate(0.1, 0.1);
        ctx.rotate(runCycle);
        ctx.fillRect(-0.05, 0, 0.12, 0.45);
        ctx.strokeRect(-0.05, 0, 0.12, 0.45);
        ctx.restore();

        // Sleek Hydrodynamic Torso
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(-0.2, -0.4, 0.4, 0.5, 0.15);
        ctx.fill();
        ctx.stroke();

        // Aerodynamic Head / Sensor
        ctx.fillStyle = plateColor;
        ctx.beginPath();
        ctx.moveTo(0.3, -0.4);
        ctx.lineTo(-0.2, -0.3);
        ctx.lineTo(-0.2, -0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Blue Sensor Line
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(0.1, -0.42, 0.15, 0.04);

        ctx.restore();

        // Bomb
        if (this.bomb && this.bomb.parent === this) {
            this.bomb.draw(ctx);
        }
    }
}
