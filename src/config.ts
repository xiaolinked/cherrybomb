


import configData from './config.json';
export type GameConfig = typeof configData;

export const Config: GameConfig = configData;

export class ConfigManager {
    public static getConfig(): GameConfig {
        return Config;
    }
}
