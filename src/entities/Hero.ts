import { ConfigManager } from "../config";
import { Game } from "../game";
import { InputManager } from "../input";
import { Entity } from "./Entity";
import { Bullet } from "./Bullet";
import { Bomb } from "./Bomb";
import { AudioManager } from "../audio/AudioManager";

export interface DeathClarityInfo {
    explosionX: number;
    explosionY: number;
    bombId: string;
    radius: number;
    enemyInfo?: {
        x: number,
        y: number,
        angle: number
    };
    isDetached: boolean;
}

export class Hero extends Entity {
    public hp: number;
    public maxHp: number;
    public killingBlow: DeathClarityInfo | null = null;

    public stamina: number;
    public maxStamina: number;
    private staminaRegenTimer: number = 0;
    private fireTimer: number = 0;
    public ammo: number;
    public maxAmmo: number;
    public reloadTimer: number = 0;
    public multishot: number = 1;
    public hpRegen: number = 0;

    // Dash
    private isDashing: boolean = false;
    private dashTimer: number = 0;
    private dashCooldownTimer: number = 0;
    private dashVector: { x: number, y: number } = { x: 0, y: 0 };
    private afterimages: { x: number, y: number, alpha: number }[] = [];
    public walkTimer: number = 0;
    public isWalking: boolean = false;
    public deathAnimationTimer: number = 0;
    public isDying: boolean = false;

    constructor(x: number, y: number) {
        super(x, y);
        const config = ConfigManager.getConfig();
        this.maxHp = config.hero.base_hp;
        this.hp = this.maxHp;

        this.stamina = config.hero.stamina.base;
        this.maxStamina = config.hero.stamina.base;

        this.maxAmmo = config.blaster.magazine_size;
        this.ammo = this.maxAmmo;
        this.multishot = config.blaster.multishot_count;

        this.color = '#0088FF'; // Blue
    }

    // Push Back
    private pushBackCooldownTimer: number = 0;
    private pushBackVisualTimer: number = 0; // For drawing the ring

    public update(dt: number, game: Game): void {
        const config = ConfigManager.getConfig();
        const input = InputManager.getInstance();

        if (this.isDying) {
            // First frame of dying: Trigger big juice
            if (this.deathAnimationTimer === 2.0) {
                game.renderer.triggerShake(1.0, 0.4);
            }

            this.deathAnimationTimer -= dt;
            if (this.deathAnimationTimer <= 0) {
                this.isDying = false;
                this.isDead = true;
                this.deathAnimationTimer = 0;
            }
            return; // No input processing while dying
        }

        // 1. Cooldowns
        if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        if (this.reloadTimer > 0) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.ammo = this.maxAmmo;
            }
        }
        if (this.pushBackCooldownTimer > 0) this.pushBackCooldownTimer -= dt;
        if (this.pushBackVisualTimer > 0) this.pushBackVisualTimer -= dt;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

        // 2. Dash Logic
        if (this.isDashing) {
            this.dashTimer -= dt;
            const dashDist = config.abilities.dash.distance;
            const dashSpeed = dashDist / config.abilities.dash.duration;

            this.x += this.dashVector.x * dashSpeed * dt;
            this.y += this.dashVector.y * dashSpeed * dt;

            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.staminaRegenTimer = config.hero.stamina.regen_delay_after_dash;
            }
            return;
        }

        // Push Back Input (E or Virtual Button)
        if ((input.keys['e'] || input.buttons.pushBack) && this.pushBackCooldownTimer <= 0) {
            this.performPushBack(game);
            this.pushBackCooldownTimer = config.abilities.push_back.cooldown;
            this.pushBackVisualTimer = config.abilities.push_back.visual_duration; // Visual ring duration
        }

        // Manual Reload (R)
        if (input.keys['r'] && this.reloadTimer <= 0 && this.ammo < this.maxAmmo) {
            this.reloadTimer = config.blaster.reload_time;
            AudioManager.playReload();
        }

        // Shooting
        let isShooting = false;
        let aimX = input.mouseWorld.x;
        let aimY = input.mouseWorld.y;

        if (input.isTouchDevice) {
            // Use Right Stick
            if (input.stickRight.active) {
                const dist = Math.sqrt(input.stickRight.x * input.stickRight.x + input.stickRight.y * input.stickRight.y);
                if (dist > 0.3) { // Deadzone
                    isShooting = true;
                }
            }
            // Also check mouse if stick is not active (Hybrid/Chromebook support)
            if (!isShooting && input.mouse.leftDown) {
                isShooting = true;
            }
        } else {
            // Mouse
            isShooting = input.mouse.leftDown;
        }

        if (isShooting && this.fireTimer <= 0 && this.reloadTimer <= 0) {
            if (this.ammo > 0) {
                this.ammo--;
                this.fireTimer = config.blaster.fire_rate;

                // Aim Logic
                let baseAngle = 0;
                if (input.isTouchDevice && input.stickRight.active) {
                    baseAngle = Math.atan2(input.stickRight.y, input.stickRight.x);
                } else {
                    baseAngle = Math.atan2(aimY - this.y, aimX - this.x);
                }

                // Multishot Logic
                const spread = config.blaster.multishot_spread_radians;

                for (let i = 0; i < this.multishot; i++) {
                    const offset = (i - (this.multishot - 1) / 2) * spread;
                    const angle = baseAngle + offset;
                    const targetX = this.x + Math.cos(angle) * config.blaster.multishot_target_distance;
                    const targetY = this.y + Math.sin(angle) * config.blaster.multishot_target_distance;

                    game.bullets.push(new Bullet(this.x, this.y, targetX, targetY));
                }

                AudioManager.playShoot();

                if (this.ammo <= 0) {
                    this.reloadTimer = config.blaster.reload_time;
                    AudioManager.playReload();
                }
            }
        }

        // 3. Normal Movement
        const axis = input.getAxis();
        this.isWalking = (axis.x !== 0 || axis.y !== 0);
        if (this.isWalking) {
            this.walkTimer += dt * 12;
            // Check for Dash Input (Shift or Space or Virtual Button)
            if ((input.keys['shift'] || input.keys[' '] || input.buttons.dash) &&
                this.dashCooldownTimer <= 0 &&
                this.stamina >= config.abilities.dash.stamina_cost) {

                // Trigger Dash
                this.isDashing = true;
                this.dashTimer = config.abilities.dash.duration;
                this.dashCooldownTimer = config.abilities.dash.cooldown;
                this.dashVector = { ...axis };
                this.stamina -= config.abilities.dash.stamina_cost;
            } else {
                // Move
                const moveSpeed = config.hero.move_speed;
                this.x += axis.x * moveSpeed * dt;
                this.y += axis.y * moveSpeed * dt;
            }
        } else {
            this.walkTimer = 0;
        }

        // 4. Stamina Regen
        if (!this.isDashing) {
            if (this.staminaRegenTimer > 0) {
                this.staminaRegenTimer -= dt;
            } else if (this.stamina < this.maxStamina) {
                this.stamina += config.hero.stamina.regen_rate * dt;
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }
        }

        // Dashing afterimages
        if (this.isDashing) {
            this.afterimages.push({ x: this.x, y: this.y, alpha: config.ui.hero.afterimage_alpha });
        }
        for (let i = this.afterimages.length - 1; i >= 0; i--) {
            this.afterimages[i].alpha -= dt * config.ui.hero.afterimage_fade_rate;
            if (this.afterimages[i].alpha <= 0) this.afterimages.splice(i, 1);
        }

        // Health Regen
        if (this.hp < this.maxHp && this.hpRegen > 0) {
            this.hp += this.hpRegen * dt;
            if (this.hp > this.maxHp) this.hp = this.maxHp;
        }
    }

    private performPushBack(game: Game) {
        const config = ConfigManager.getConfig();
        const radius = config.abilities.push_back.radius;
        const pushDist = config.abilities.push_back.distance;

        console.log("PUSH BACK!");

        for (const enemy of game.enemies) {
            if (this.distanceTo(enemy) <= radius) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const angle = Math.atan2(dy, dx);
                enemy.x += Math.cos(angle) * pushDist;
                enemy.y += Math.sin(angle) * pushDist;
            }
        }
    }

    private damageFlashTimer: number = 0;

    public takeDamage(amount: number, source?: Bomb) {
        // Global safety: don't take damage if hero is already dead
        if (this.isDead) return;

        const config = ConfigManager.getConfig();
        const reduction = config.hero.armor.damage_reduction_percent;
        const finalDamage = amount * (1.0 - reduction);

        this.hp -= finalDamage;
        this.damageFlashTimer = config.ui.hero.damage_flash_duration;
        AudioManager.playHit();

        if (this.hp <= 0 && !this.isDying && !this.isDead) {
            this.hp = 0;
            this.isDying = true;
            this.deathAnimationTimer = 2.0; // 2 seconds of funny death
            AudioManager.playDeath(); // Assuming this exists or plays a funny sound

            if (source) {
                // ... same info for death clarity screen later ...
                const originalParent = (source as any).originalParent;
                this.killingBlow = {
                    explosionX: source.x,
                    explosionY: source.y,
                    bombId: source.id,
                    radius: (source as any).radiusExplosion,
                    isDetached: !originalParent,
                    enemyInfo: originalParent ? {
                        x: originalParent.x,
                        y: originalParent.y,
                        angle: originalParent.angle
                    } : undefined
                };
            }
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        if (this.isDead) return;
        const config = ConfigManager.getConfig();

        // Define colors here so they are available for death animation
        const skinColor = '#FFDAB9';
        const clothesColor = this.damageFlashTimer > 0 ? (Math.floor(this.damageFlashTimer * 100) % 2 === 0 ? '#FFFFFF' : '#2F80FF') : '#2F80FF';
        const outlineColor = this.damageFlashTimer > 0 ? '#FFFFFF' : '#0B3D91';

        if (this.isDying) {
            const progress = (2.0 - this.deathAnimationTimer) / 2.0;

            const easeIn = Math.pow(progress, 2.5);
            const opacity = 1.0 - easeIn;

            // Fixed colors for death - no flashing
            const dClothes = '#2F80FF';
            const dSkin = '#FFDAB9';

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.globalAlpha = opacity;
            ctx.scale(1.6, 1.6);

            // 1. Flickering Core
            const corePulse = (Math.sin(performance.now() / 30) + 1) / 2;
            ctx.fillStyle = `rgba(0, 255, 255, ${0.4 + corePulse * 0.6})`;
            ctx.beginPath();
            ctx.arc(0, -0.1, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // --- TORSO ---
            ctx.fillStyle = dClothes;
            ctx.beginPath();
            ctx.roundRect(-0.35, -0.4, 0.7, 0.75, 0.1);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.05;
            ctx.stroke();

            // --- HEAD (Launch) ---
            ctx.save();
            const hDist = progress * 15;
            ctx.translate(Math.cos(progress * 12) * hDist, -0.6 - hDist * 2);
            ctx.rotate(progress * 40);
            ctx.fillStyle = dSkin;
            ctx.beginPath();
            ctx.arc(0, 0, 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Dead X Eyes
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.06;
            const xS = 0.1;
            ctx.beginPath();
            ctx.moveTo(-xS, -xS); ctx.lineTo(xS, xS);
            ctx.moveTo(xS, -xS); ctx.lineTo(-xS, xS);
            ctx.stroke();
            ctx.restore();

            // --- LIMBS ---
            const drawLimbExp = (angle: number, length: number, color: string, speed: number) => {
                ctx.save();
                const lDist = progress * speed;
                ctx.translate(Math.cos(angle) * lDist, Math.sin(angle) * lDist - lDist * 0.5);
                ctx.rotate(progress * 50 + angle);
                ctx.fillStyle = color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.05;
                ctx.beginPath();
                ctx.roundRect(-0.1, 0, 0.2, length, 0.05);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            drawLimbExp(Math.PI * 1.1, 0.6, dSkin, 18); // L Arm
            drawLimbExp(Math.PI * 1.9, 0.6, dSkin, 22); // R Arm
            drawLimbExp(Math.PI * 0.2, 0.7, '#1A365D', 15); // L Leg
            drawLimbExp(Math.PI * 0.8, 0.7, '#1A365D', 20); // R Leg

            ctx.restore();
            return;
        }

        for (const img of this.afterimages) {
            ctx.save();
            ctx.translate(img.x, img.y);
            ctx.globalAlpha = img.alpha;
            ctx.fillStyle = '#2F80FF';
            ctx.fillRect(-0.5, -0.7, 1.0, 1.4);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(1.6, 1.6); // Hero is now BIGGER

        // Bloom Effect removed for performance
        // ctx.shadowBlur = 15;
        // ctx.shadowColor = '#2F80FF';

        // Visual Push Back Effect
        if (this.pushBackVisualTimer > 0) {
            const radius = config.abilities.push_back.radius;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.pushBackVisualTimer * 2})`; // Fade out
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 0.05;
            ctx.stroke();
        }

        if (this.isDashing) {
            const angle = Math.atan2(this.dashVector.y, this.dashVector.x);
            // Stretch along the dash direction while keeping character upright
            ctx.rotate(angle);
            ctx.scale(1.2, 0.85);
            ctx.rotate(-angle);
        }

        // --- DRAW HUMAN FIGURE ---
        ctx.lineWidth = 0.05;
        ctx.strokeStyle = outlineColor;

        // Legs (Walking Animation)
        const legSwing = Math.sin(this.walkTimer) * 0.4;

        ctx.fillStyle = '#1A365D'; // Pants color
        // Left Leg
        ctx.save();
        ctx.translate(-0.18, 0.2);
        ctx.rotate(this.isWalking ? -legSwing : 0);
        ctx.fillRect(-0.12, 0, 0.24, 0.5);
        ctx.strokeRect(-0.12, 0, 0.24, 0.5);
        ctx.restore();

        // Right Leg
        ctx.save();
        ctx.translate(0.18, 0.2);
        ctx.rotate(this.isWalking ? legSwing : 0);
        ctx.fillRect(-0.12, 0, 0.24, 0.5);
        ctx.strokeRect(-0.12, 0, 0.24, 0.5);
        ctx.restore();

        // Torso
        ctx.fillStyle = clothesColor;
        ctx.beginPath();
        ctx.roundRect(-0.35, -0.4, 0.7, 0.75, 0.1);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(0, -0.6, 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eyes (facing aim direction)
        const input = InputManager.getInstance();
        let aimAngle = 0;
        if (input.isTouchDevice && input.stickRight.active) {
            aimAngle = Math.atan2(input.stickRight.y, input.stickRight.x);
        } else {
            aimAngle = Math.atan2(input.mouseWorld.y - this.y, input.mouseWorld.x - this.x);
        }

        ctx.save();
        ctx.translate(0, -0.6);
        ctx.rotate(aimAngle);
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0.12, -0.08, 0.04, 0, Math.PI * 2);
        ctx.arc(0.12, 0.08, 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- DRAW REALISTIC GUN ---
        ctx.save();
        ctx.rotate(aimAngle);

        // Flip gun vertically if aiming left so it's not upside down
        if (Math.abs(aimAngle) > Math.PI / 2) {
            ctx.scale(1, -1);
        }

        // Handle/Grip
        ctx.fillStyle = '#222';
        ctx.fillRect(0.1, -0.1, 0.2, 0.35);
        ctx.strokeRect(0.1, -0.1, 0.2, 0.35);

        // Slide / Barrel
        ctx.fillStyle = '#444';
        ctx.fillRect(0.1, -0.18, 0.75, 0.25); // Main Body (Smaller gun)
        ctx.strokeRect(0.1, -0.18, 0.75, 0.25);

        // Barrel End / Muzzle
        ctx.fillStyle = '#111';
        ctx.fillRect(0.75, -0.1, 0.12, 0.12);

        // Top Detail (Iron Sights)
        ctx.fillStyle = '#333';
        ctx.fillRect(0.2, -0.22, 0.08, 0.04);
        ctx.fillRect(0.65, -0.22, 0.08, 0.04);

        ctx.restore();

        ctx.restore(); // End Main Transform (this.x, this.y)
    }
}
