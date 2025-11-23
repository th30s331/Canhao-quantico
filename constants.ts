import { ToolType, LevelConfig } from './types';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 50;
export const SNAP_THRESHOLD = 15;
export const DELETE_BUTTON_RADIUS = 12;

export const SIMULATION_DURATION_MS = 8000; // 8 seconds delay

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    targetY: CANVAS_HEIGHT / 2, // Center
    title: 'Nível 1: Alinhamento',
    description: 'O alvo está alinhado com o canhão. Calibre sua mira.',
  },
  {
    id: 2,
    targetY: 100, // Top
    title: 'Nível 2: Elevação',
    description: 'O alvo está na parte superior. Use atratores ou repulsores para curvar a trajetória.',
  },
  {
    id: 3,
    targetY: CANVAS_HEIGHT - 100, // Bottom
    targetX: 200, // Left side (Boomerang/Hook shot)
    title: 'Nível 3: Gancho',
    description: 'O alvo está na retaguarda à esquerda! Use Repulsores para rebater a onda de volta.',
  },
];

export const TOOL_CONFIGS = {
  [ToolType.ATTRACTOR]: {
    label: 'Ímã Atraidor',
    icon: '🧲',
    color: '#10b981', // Emerald 500
    radius: 40,
    cost: 10,
    description: 'Puxa a onda de probabilidade.',
  },
  [ToolType.REPULSOR]: {
    label: 'Escudo Repulsor',
    icon: '🛡️',
    color: '#ef4444', // Red 500
    radius: 40,
    cost: 15,
    description: 'Empurra a onda para longe.',
  },
  // [ToolType.SLIT]: {
  //   label: 'Parede Dupla Fenda',
  //   icon: '🧱',
  //   color: '#f59e0b', // Amber 500
  //   width: 20,
  //   height: 100,
  //   cost: 20,
  //   description: 'Divide a onda criando interferência.',
  // },
};

export const PHYSICS = {
  WAVE_PARTICLE_COUNT: 800, // Number of active tracer particles for the wave
  PARTICLE_SPEED: 5, // Slightly faster to ensure they reach end in 8s
  EMISSION_RATE: 15,
  ATTRACTION_STRENGTH: 0.25,
  REPULSION_STRENGTH: 0.35,
  DAMPING: 0.99, // Less air resistance to ensure distance
  
  // New Classical Mode Configs
  CLASSICAL_SHOT_COUNT: 25,
  CLASSICAL_SPAWN_INTERVAL: 15, // Slower fire rate to spread them out over part of the 8s
};

export const SCORING = {
  INNER_POINTS: 100,
  OUTER_POINTS: 50,
  BURST_COUNT: 100, // How many particles are fired in the "collapse"
};