
export class InputManager {
    private static instance: InputManager;
    public keys: { [key: string]: boolean } = {};
    public mouse: { x: number; y: number; leftDown: boolean } = { x: 0, y: 0, leftDown: false };
    public clickOccurred: boolean = false;
    public mouseWorld: { x: number; y: number } = { x: 0, y: 0 };
    public cameraOffset: { x: number; y: number } = { x: 0, y: 0 };

    public isMobile: boolean = false;

    // Joystick State assigned by Renderer/Input Logic
    public stickLeft: { x: number, y: number, active: boolean, id: number | null, originX: number, originY: number } = { x: 0, y: 0, active: false, id: null, originX: 0, originY: 0 };
    public stickRight: { x: number, y: number, active: boolean, id: number | null, originX: number, originY: number } = { x: 0, y: 0, active: false, id: null, originX: 0, originY: 0 };

    // Virtual Buttons
    public buttons: { [key: string]: boolean } = { dash: false, push: false };

    private constructor() {
        // Simple mobile check
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;

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

        // Touch Listeners
        if (this.isMobile) {
            this.initTouch();
        }
    }

    private initTouch() {
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                this.handleTouchStart(e.changedTouches[i]);
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                this.handleTouchMove(e.changedTouches[i]);
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                this.handleTouchEnd(e.changedTouches[i]);
            }
        }, { passive: false });
    }

    private handleTouchStart(touch: Touch) {
        const x = touch.clientX;
        const y = touch.clientY;
        const width = window.innerWidth;
        // const height = window.innerHeight; // Unused

        // UI Buttons (Top quadrant exclusion?) 
        // Let's assume buttons are bottom right/left specific, but sticks capture regions.

        // Left Half for Movement Stick
        if (x < width / 2) {
            if (!this.stickLeft.active) {
                this.stickLeft.active = true;
                this.stickLeft.id = touch.identifier;
                this.stickLeft.originX = x;
                this.stickLeft.originY = y;
                this.stickLeft.x = 0;
                this.stickLeft.y = 0;
            }
        }
        // Right Half for Aim Stick + Buttons
        else {
            // Check for buttons first (Simple circular zones? Or just assume Stick if not on specific button?)
            // Let's do RIGHT STICK default
            if (!this.stickRight.active) {
                this.stickRight.active = true;
                this.stickRight.id = touch.identifier;
                this.stickRight.originX = x;
                this.stickRight.originY = y;
                this.stickRight.x = 0;
                this.stickRight.y = 0;
            }
        }

        // Simulate click for UI
        this.mouse.x = x;
        this.mouse.y = y;
        this.clickOccurred = true;
        this.mouse.leftDown = true;
    }

    private handleTouchMove(touch: Touch) {
        // Left Stick
        if (this.stickLeft.active && this.stickLeft.id === touch.identifier) {
            const dx = touch.clientX - this.stickLeft.originX;
            const dy = touch.clientY - this.stickLeft.originY;
            const maxDist = 50;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Normalize current tick x/y
            const clampedDist = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);

            this.stickLeft.x = Math.cos(angle) * (clampedDist / maxDist);
            this.stickLeft.y = Math.sin(angle) * (clampedDist / maxDist);
        }

        // Right Stick
        if (this.stickRight.active && this.stickRight.id === touch.identifier) {
            const dx = touch.clientX - this.stickRight.originX;
            const dy = touch.clientY - this.stickRight.originY;
            const maxDist = 50;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const clampedDist = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);

            this.stickRight.x = Math.cos(angle) * (clampedDist / maxDist);
            this.stickRight.y = Math.sin(angle) * (clampedDist / maxDist);
        }
    }

    private handleTouchEnd(touch: Touch) {
        if (this.stickLeft.active && this.stickLeft.id === touch.identifier) {
            this.stickLeft.active = false;
            this.stickLeft.x = 0;
            this.stickLeft.y = 0;
        }

        if (this.stickRight.active && this.stickRight.id === touch.identifier) {
            this.stickRight.active = false;
            this.stickRight.x = 0;
            this.stickRight.y = 0;
        }
        this.mouse.leftDown = false;
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
        // Combine Keyboard + Mobile Stick
        let x = this.stickLeft.x;
        let y = this.stickLeft.y;

        if (this.keys['w'] || this.keys['arrowup']) y -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) y += 1;
        if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) x += 1;

        // Normalize if keyboard used (capped at 1)
        // If joystick used, it's already 0-1 magnitude
        if (x !== 0 || y !== 0) {
            // Only normalize if purely keyboard to avoid "fast diagonal"
            // If stick is involved, assume logic handles it, or just clamp magnitude
            const len = Math.sqrt(x * x + y * y);
            if (len > 1) {
                x /= len;
                y /= len;
            }
        }
        return { x, y };
    }
}
