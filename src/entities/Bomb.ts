import { ConfigManager } from "../config";
import { Game } from "../game";
import { Entity } from "./Entity";
import { Enemy } from "./Enemy";
import { AudioManager } from "../audio/AudioManager";

export enum BombState {
    IDLE,       // Passive on enemy back
    ARMED,      // Counting down on enemy back
    DETACHED,   // On ground (Dangerous)
    EXPLODING,  // Boom one frame
    DEAD        // To be removed
}

export class Bomb extends Entity {
    public state: BombState = BombState.IDLE;
    public parent: Enemy | null = null; // Who is carrying it

    // Timers
    public timer: number = 0;
    public flashTimer: number = 0;

    // Config values
    public radiusExplosion: number;
    public originalParent: Enemy | null = null;
    private damage: number;

    constructor(x: number, y: number, parent: Enemy | null = null) {
        super(x, y);
        this.parent = parent;
        this.radius = 0.35; // VISUAL SPEC: Radius 0.35
        this.color = '#8B1E1E';

        const config = ConfigManager.getConfig();
        this.radiusExplosion = config.bomb.explosion.radius;
        this.damage = config.bomb.explosion.max_damage;
    }

    private explosionDuration: number = ConfigManager.getConfig().bomb.explosion.visual_duration;
    private explosionTimer: number = 0;

    public update(dt: number, game: Game): void {
        const config = ConfigManager.getConfig();

        if (this.isFadingOut) {
            this.opacity -= dt * 0.8;
            if (this.opacity < 0) this.opacity = 0;
            return; // STOP LOGIC (don't explode, don't move)
        }

        // 0. Explosion Logic
        if (this.state === BombState.EXPLODING) {
            this.explosionTimer -= dt;
            if (this.explosionTimer <= 0) {
                this.state = BombState.DEAD;
            }
            return;
        }

        // 0. Contact Detonation (Instant) - If touching Hero
        if (this.state !== BombState.DEAD) {
            const distToHero = this.distanceTo(game.hero);
            // Hero ~0.5 + Bomb ~0.35 = 0.85 approx contact
            if (distToHero < 0.8) {
                this.explode(game);
                return;
            }
        }

        // 1. Position Logic
        if (this.parent) {
            // Stick to parent's back (offset)
            this.x = this.parent.x;
            this.y = this.parent.y;

            // IDLE -> ARMED check
            if (this.state === BombState.IDLE) {
                // Check dist to hero OR shield broken
                const dist = this.distanceTo(game.hero);
                if (dist < config.bomb.proximity_activation_distance || this.parent.shield <= 0) {
                    this.arm();
                }
            }

            // Check if parent dead -> Detach
            if (this.parent.isDead) {
                this.detach();
            }
        }

        // 2. Timer Logic
        if (this.state === BombState.ARMED || this.state === BombState.DETACHED) {
            this.timer -= dt;

            // Pulse visual
            this.flashTimer += dt * config.ui.bomb_visuals.pulse_speed;

            if (this.timer <= 0) {
                this.explode(game);
            }
        }
    }

    public arm() {
        if (this.state === BombState.IDLE) {
            this.state = BombState.ARMED;
            this.timer = ConfigManager.getConfig().bomb.countdown_duration;
        }
    }

    public detach() {
        this.parent = null;
        this.state = BombState.DETACHED;
        if (this.timer <= 0) {
            this.timer = ConfigManager.getConfig().bomb.detached.lifetime;
        }
    }

    public explode(game: Game) {
        if (this.state === BombState.DEAD || this.state === BombState.EXPLODING) return;

        // Safety: don't damage player during wave completion or intermissions
        if (this.isFadingOut || !game.waveManager.isWaveActive) {
            this.state = BombState.DEAD; // Just kill it silently
            return;
        }

        const config = ConfigManager.getConfig();
        AudioManager.playExplosion();
        this.state = BombState.EXPLODING;
        this.explosionTimer = this.explosionDuration;

        const originalParent = this.parent;
        this.originalParent = originalParent; // For death clarity

        // Transfer to global bomb list to ensure rendering if parent dies
        if (this.parent) {
            this.parent.bomb = null; // Detach from parent
            this.parent = null;
            game.bombs.push(this); // Handover to Game loop
        }

        console.log("BOOM at ", this.x, this.y);

        // Deal Damage
        // 1. Hero
        const distHero = this.distanceTo(game.hero);
        if (distHero < this.radiusExplosion) {
            // Damage Scaling (Linear Falloff)
            // 1.0 at center, 0.0 at edge
            const pct = 1.0 - (distHero / this.radiusExplosion);
            const actualDamage = Math.max(0, this.damage * pct);

            game.hero.takeDamage(actualDamage, this);
            game.hitStopTimer = config.ui.explosion.hit_stop;
            console.log("Hero hit by bomb! Damage: " + actualDamage.toFixed(1));
        }

        // VISUAL SPEC: Screen shake (light)
        game.renderer.triggerShake(config.bomb.explosion.screen_shake_intensity, config.ui.explosion.screen_shake_duration);

        // 2. Enemies (Chain Reaction)
        for (const enemy of game.enemies) {
            // Self-Explosion Rule: Always Die
            if (originalParent === enemy) {
                enemy.takeDamage(9999);
                continue;
            }

            const dist = this.distanceTo(enemy);
            if (dist < this.radiusExplosion) {
                // Configurable Falloff
                const pct = 1.0 - (dist / this.radiusExplosion);

                // Universal Chain Reaction: Always Arm Bomb if present
                if (enemy.bomb) enemy.bomb.arm();

                if (enemy.shield > 0) {
                    // Case A: Shielded -> Shield gone, No HP Damage
                    enemy.shield = 0;
                    console.log("Explosion Stripped Shield & Armed Bomb!");
                } else {
                    // Case B: Unshielded -> Radial HP Damage
                    const actualDamage = Math.max(0, this.damage * pct);
                    enemy.takeDamage(actualDamage);
                    console.log(`Explosion Hit Unshielded: ${actualDamage.toFixed(1)} dmg`);
                }
            }
        }

        // 3. Fuel Barrels (Chain Reaction)
        for (const barrel of game.fuelBarrels) {
            const dist = this.distanceTo(barrel);
            if (dist < this.radiusExplosion) {
                barrel.takeDamage(999, game); // Explode barrels immediately
            }
        }

        // 4. Detached Bombs (Chain Reaction)
        for (const otherBomb of game.bombs) {
            if (otherBomb === this || otherBomb.state === BombState.DEAD || otherBomb.state === BombState.EXPLODING) continue;
            if (this.distanceTo(otherBomb) < this.radiusExplosion) {
                otherBomb.timer = Math.min(otherBomb.timer, 0.1); // Detonate almost instantly
            }
        }

        // 3. Other Bombs? (Chain)
        // We'll handle this global finding in Game or just iterate existing bombs

        // Remove self next frame
        // This is now handled by the explosionTimer in update
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        if (this.state === BombState.DEAD) return;

        ctx.save();
        if (this.state !== BombState.EXPLODING) {
            ctx.globalAlpha = this.opacity;
        }
        ctx.translate(this.x, this.y);

        if (this.state === BombState.EXPLODING) {
            const progress = 1.0 - (this.explosionTimer / this.explosionDuration);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentRadius = this.radiusExplosion * easeOut;

            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            // 1. Central Core (Bright White/Yellow)
            const coreRadius = currentRadius * 0.4;
            const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
            coreGrad.addColorStop(0, '#FFFFFF');
            coreGrad.addColorStop(0.7, '#FFF2A8');
            coreGrad.addColorStop(1, 'rgba(255, 242, 168, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. Main Blast (Orange/Red)
            const blastGrad = ctx.createRadialGradient(0, 0, currentRadius * 0.2, 0, 0, currentRadius);
            blastGrad.addColorStop(0, '#FFD84D');
            blastGrad.addColorStop(0.4, '#FF9933');
            blastGrad.addColorStop(0.8, '#FF3B3B');
            blastGrad.addColorStop(1, 'rgba(255, 59, 59, 0)');

            ctx.fillStyle = blastGrad;
            ctx.globalAlpha = 1.0 - progress;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // 3. Shockwave Ring
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1.0 - progress) * 0.5})`;
            ctx.lineWidth = 0.1 * (1.0 - progress);
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 1.1, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
            ctx.restore();
            return;
        }

        // Visuals
        // VISUAL SPEC: Unarmed #8B1E1E, Armed #FF3B3B
        if (this.state === BombState.ARMED || this.state === BombState.DETACHED) {
            // Pulsing
            const scale = 1.0 + Math.sin(this.flashTimer) * 0.2;
            ctx.scale(scale, scale);
            ctx.fillStyle = '#FF3B3B';
        } else {
            ctx.fillStyle = '#8B1E1E';
        }

        // VISUAL SPEC: Radius 0.35
        ctx.beginPath();
        ctx.arc(0, 0, 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Draw Fuse/Text
        // VISUAL SPEC: Text color: White, Text outline: Black
        if (this.timer > 0) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 0.05;
            ctx.font = 'bold 0.8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const txt = Math.ceil(this.timer).toString();
            ctx.strokeText(txt, 0, 0);
            ctx.fillText(txt, 0, 0);
        }

        ctx.restore();
    }
}
