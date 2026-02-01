import './style.css'
import { Game } from './game';

// Inline CSS for full screen canvas
const style = document.createElement('style');
style.innerHTML = `
  body { margin: 0; overflow: hidden; background: #000; }
  canvas { display: block; }
`;
document.head.appendChild(style);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="gameCanvas"></canvas>
`;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();
