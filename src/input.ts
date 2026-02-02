
export class InputManager {
    private static instance: InputManager;
    public keys: { [key: string]: boolean } = {};
    public mouse: { x: number; y: number; leftDown: boolean } = { x: 0, y: 0, leftDown: false };
    public clickOccurred: boolean = false;
    public mouseWorld: { x: number; y: number } = { x: 0, y: 0 };
    public cameraOffset: { x: number; y: number } = { x: 0, y: 0 };

    public joystick: { x: number; y: number; active: boolean; origin: { x: number, y: number }, identifier: number | null } = { x: 0, y: 0, active: false, origin: { x: 0, y: 0 }, identifier: null };
    public buttons: { [key: string]: boolean } = { dash: false, reload: false, pushBack: false };
    public isTouchDevice: boolean = false;

    private constructor() {
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.updateMouseWorld();
        });
        window.addEventListener('mousedown', () => {
            this.mouse.leftDown = true;
            this.clickOccurred = true;
        });
        window.addEventListener('mouseup', () => this.mouse.leftDown = false);
        window.addEventListener('resize', () => this.updateMouseWorld());

        // Mobile Controls
        window.addEventListener('touchstart', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                // Always update mouse pos for UI clicks
                this.mouse.x = touch.clientX;
                this.mouse.y = touch.clientY;
                this.clickOccurred = true;
                this.updateMouseWorld();

                if (touch.clientX < window.innerWidth / 2 && !this.joystick.active) {
                    // Left side: Joystick
                    this.joystick.active = true;
                    this.joystick.identifier = touch.identifier;
                    this.joystick.origin.x = touch.clientX;
                    this.joystick.origin.y = touch.clientY;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                } else if (touch.clientX >= window.innerWidth / 2) {
                    // Right side: Shooting
                    this.mouse.leftDown = true;
                }
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];

                if (this.joystick.active && t.identifier === this.joystick.identifier) {
                    const maxDist = 50;
                    const dx = t.clientX - this.joystick.origin.x;
                    const dy = t.clientY - this.joystick.origin.y;
                    const dist = Math.hypot(dx, dy);
                    const angle = Math.atan2(dy, dx);
                    const clampedDist = Math.min(dist, maxDist);

                    this.joystick.x = (Math.cos(angle) * clampedDist) / maxDist;
                    this.joystick.y = (Math.sin(angle) * clampedDist) / maxDist;
                } else if (t.clientX >= window.innerWidth / 2) {
                    // Right side: Aiming
                    this.mouse.x = t.clientX;
                    this.mouse.y = t.clientY;
                    this.updateMouseWorld();
                }
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                if (this.joystick.active && touch.identifier === this.joystick.identifier) {
                    this.joystick.active = false;
                    this.joystick.identifier = null;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                }
            }

            // Update mouse.leftDown based on remaining touches on the right
            let rightTouchRemaining = false;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].clientX >= window.innerWidth / 2) {
                    rightTouchRemaining = true;
                    break;
                }
            }
            if (!rightTouchRemaining) {
                this.mouse.leftDown = false;
            }
        });
    }

    public isNewClick(): boolean {
        if (this.clickOccurred) {
            this.clickOccurred = false;
            return true;
        }
        return false;
    }

    public updateMouseWorld() {
        // Pixel to Units conversion including Camera
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelsPerUnit = 20;

        this.mouseWorld.x = this.cameraOffset.x + (this.mouse.x - width / 2) / pixelsPerUnit;
        this.mouseWorld.y = this.cameraOffset.y + (this.mouse.y - height / 2) / pixelsPerUnit;
    }

    public static getInstance(): InputManager {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager();
        }
        return InputManager.instance;
    }

    public getAxis(): { x: number; y: number } {
        let x = 0;
        let y = 0;
        if (this.keys['w'] || this.keys['arrowup']) y -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) y += 1;
        if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) x += 1;

        if (this.joystick.active) {
            x += this.joystick.x;
            y += this.joystick.y;
        }

        // Normalize
        if (x !== 0 || y !== 0) {
            // If using keyboard, we normalize to length 1. 
            // If using joystick, it's already 0-1 magnitude, but if we mix them or have >1, clamp.
            const len = Math.sqrt(x * x + y * y);
            if (len > 1) {
                x /= len;
                y /= len;
            }
        }
        return { x, y };
    }
}
