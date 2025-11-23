export enum ToolType {
  ATTRACTOR = 'ATTRACTOR',
  REPULSOR = 'REPULSOR',
  SLIT = 'SLIT',
}

export type PhysicsMode = 'QUANTUM' | 'CLASSICAL';

export interface Position {
  x: number;
  y: number;
}

export interface PlacedTool {
  id: string;
  type: ToolType;
  position: Position;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

export interface GameState {
  score: number;
  attempts: number;
  lastAccuracy: number | null;
  isSimulating: boolean; // True = Wave/Planning Phase, False = Particle/Result Phase
  phase: 'PLANNING' | 'FIRED' | 'RESULT';
  physicsMode: PhysicsMode;
  level: number; // 1, 2, or 3
}

export interface LevelConfig {
  id: number;
  targetY: number; // Position Y of target
  targetX?: number; // Optional Position X of target (default is right side)
  title: string;
  description: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}