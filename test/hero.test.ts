
import { describe, it, expect } from 'vitest';
import { Hero } from '../src/entities/Hero';
import { ConfigManager } from '../src/config';

describe('Hero Entity', () => {
    it('should initialize with correct stats from config', () => {
        const hero = new Hero(0, 0);
        const config = ConfigManager.getConfig();

        expect(hero.x).toBe(0);
        expect(hero.y).toBe(0);
        // Accessing private property via any for testing, or we should make it public/getter
        // Hero extends Entity
        expect(hero['stamina']).toBe(config.hero.stamina.base);
    });

    // We can't easily test movement without mocking InputManager, 
    // but we can verify basic state.
});
