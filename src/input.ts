
export class InputManager {
    private static instance: InputManager;
    public keys: { [key: string]: boolean } = {};
    public mouse: { x: number; y: number; leftDown: boolean } = { x: 0, y: 0, leftDown: false };
    public mouseWorld: { x: number; y: number } = { x: 0, y: 0 };

    private constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.updateMouseWorld();
        });
        window.addEventListener('mousedown', () => this.mouse.leftDown = true);
        window.addEventListener('mouseup', () => this.mouse.leftDown = false);
        window.addEventListener('resize', () => this.updateMouseWorld());
    }

    private updateMouseWorld() {
        // Simple conversion assuming camera is centered and scale is fixed (20)
        // TODO: Get actual camera transform from Renderer if it becomes dynamic
        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelsPerUnit = 20;

        this.mouseWorld.x = (this.mouse.x - width / 2) / pixelsPerUnit;
        this.mouseWorld.y = (this.mouse.y - height / 2) / pixelsPerUnit;
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

        // Normalize
        if (x !== 0 || y !== 0) {
            const len = Math.sqrt(x * x + y * y);
            x /= len;
            y /= len;
        }
        return { x, y };
    }
}
