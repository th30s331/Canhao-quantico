import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, Particle, PlacedTool, Position, ToolType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PHYSICS, SCORING, TOOL_CONFIGS, GRID_SIZE, SNAP_THRESHOLD, DELETE_BUTTON_RADIUS, SIMULATION_DURATION_MS, LEVELS } from '../constants';

interface QuantumCanvasProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  placedTools: PlacedTool[];
  setPlacedTools: React.Dispatch<React.SetStateAction<PlacedTool[]>>;
  onFireComplete: (accuracy: number) => void;
}

const QuantumCanvas: React.FC<QuantumCanvasProps> = ({
  gameState,
  setGameState,
  placedTools,
  setPlacedTools,
  onFireComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Mutable state refs for loop performance
  const particlesRef = useRef<Particle[]>([]);
  const toolsRef = useRef<PlacedTool[]>(placedTools);
  const mouseRef = useRef<Position>({ x: 0, y: 0 });
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionTimeRef = useRef<number>(Date.now());
  
  const draggingToolIdRef = useRef<string | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const selectedToolIdRef = useRef<string | null>(null); // Track selection
  
  const snapLinesRef = useRef<{x?: number, y?: number} | null>(null);

  // Helper to get current level target
  const getTargetPos = () => {
    const levelConfig = LEVELS.find(l => l.id === gameState.level) || LEVELS[0];
    return {
        x: levelConfig.targetX ?? (CANVAS_WIDTH - 150),
        y: levelConfig.targetY
    };
  };
  
  // Sync ref with props
  useEffect(() => {
    toolsRef.current = placedTools;
  }, [placedTools]);

  // Reset particles and interaction time when level/mode changes
  useEffect(() => {
    particlesRef.current = [];
    lastInteractionTimeRef.current = Date.now();
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
  }, [gameState.physicsMode, gameState.level]);

  // Initialize Particles
  const spawnParticle = () => {
    const isQuantum = gameState.physicsMode === 'QUANTUM';
    
    // In Classical mode, particles start dead center with no vertical spread
    const startY = CANVAS_HEIGHT / 2; 
    const yVariation = isQuantum ? (Math.random() - 0.5) * 20 : 0;
    
    // In Classical mode, no vertical velocity initially (straight line)
    const initialVy = isQuantum ? (Math.random() - 0.5) * 0.5 : 0;
    
    const p: Particle = {
      x: 50, // Start near cannon
      y: startY + yVariation, 
      vx: PHYSICS.PARTICLE_SPEED + (isQuantum ? Math.random() * 0.5 : 0),
      vy: initialVy,
      life: 0,
      maxLife: 600, // Ensure life is long enough for 8s
      hue: isQuantum 
        ? 180 + Math.random() * 40  // Cyan/Blue for Quantum
        : 35 + Math.random() * 10,  // Gold/Amber for Classical
    };
    particlesRef.current.push(p);
  };

  // Physics Engine
  const updatePhysics = () => {
    const tools = toolsRef.current;
    const particles = particlesRef.current;
    const isQuantum = gameState.physicsMode === 'QUANTUM';
    
    const { x: targetX, y: targetY } = getTargetPos();

    // Spawn Logic - Continuous for both phases to maintain visual flow
    // MODIFIED: Added gameState.phase === 'FIRED' to keep emitting while waiting for result
    if (gameState.phase === 'PLANNING' || gameState.phase === 'FIRED') {
      const rate = isQuantum ? PHYSICS.EMISSION_RATE : PHYSICS.EMISSION_RATE / 3; 
      for (let i = 0; i < rate; i++) {
        spawnParticle();
      }
    }

    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      
      // Move
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Apply Tool Forces
      let survived = true;

      for (const tool of tools) {
        if (tool.id === draggingToolIdRef.current) continue;

        const dx = tool.position.x - p.x;
        const dy = tool.position.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (tool.type === ToolType.ATTRACTOR) {
          // Both modes react to fields (Classical = Charged Ball)
          if (dist < 250) {
            const force = PHYSICS.ATTRACTION_STRENGTH / (dist * 0.05 + 1);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        } else if (tool.type === ToolType.REPULSOR) {
          // Repulsive force
          if (dist < 150) {
            const force = PHYSICS.REPULSION_STRENGTH / (dist * 0.05 + 1);
            p.vx -= (dx / dist) * force;
            p.vy -= (dy / dist) * force;
          }
          // Bounce
          if (dist < TOOL_CONFIGS[ToolType.REPULSOR].radius) {
             const normalX = dx / dist;
             const normalY = dy / dist;
             const dot = p.vx * normalX + p.vy * normalY;
             p.vx = p.vx - 2 * dot * normalX;
             p.vy = p.vy - 2 * dot * normalY;
             p.x -= normalX * 2;
             p.y -= normalY * 2;
          }
        } else if (tool.type === ToolType.SLIT) {
          // Wall Logic
          const w = 20;
          const h = 160; 
          const gapSize = 25;
          
          const inX = p.x > tool.position.x - w/2 && p.x < tool.position.x + w/2;
          const inY = p.y > tool.position.y - h/2 && p.y < tool.position.y + h/2;
          
          if (inX && inY) {
            const slit1Y = tool.position.y - 30;
            const slit2Y = tool.position.y + 30;
            
            const inSlit1 = Math.abs(p.y - slit1Y) < gapSize / 2;
            const inSlit2 = Math.abs(p.y - slit2Y) < gapSize / 2;
            
            if (!inSlit1 && !inSlit2) {
              survived = false; // Hit the wall
            } else {
                 // **KEY DIFFERENCE**: Diffraction
                 if (isQuantum) {
                     // Quantum: Uncertainty principle / Diffraction scrambles velocity
                     if (Math.abs(p.x - tool.position.x) < 5) {
                         p.vy += (Math.random() - 0.5) * 1.5;
                     }
                 } else {
                     // Classical: Pass through straight (Newtonian)
                 }
            }
          }
        }
      }

      // Screen boundaries or death
      if (p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT || p.life > p.maxLife || !survived) {
        particles.splice(i, 1);
      }
    }
  };

  // Renderer
  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const isQuantum = gameState.physicsMode === 'QUANTUM';
    const { x: targetX, y: targetY } = getTargetPos();

    // Draw Grid Background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Draw Snap Lines
    if (isDraggingRef.current && snapLinesRef.current) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      if (snapLinesRef.current.x !== undefined) {
        ctx.moveTo(snapLinesRef.current.x, 0);
        ctx.lineTo(snapLinesRef.current.x, CANVAS_HEIGHT);
      }
      if (snapLinesRef.current.y !== undefined) {
        ctx.moveTo(0, snapLinesRef.current.y);
        ctx.lineTo(CANVAS_WIDTH, snapLinesRef.current.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Target Area
    ctx.beginPath();
    ctx.arc(targetX, targetY, 80, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetX, targetY, 50, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([5, 5]);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(targetX, targetY, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#10b981';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Cannon (Fixed position)
    ctx.fillStyle = isQuantum ? '#3b82f6' : '#d97706'; // Blue or Amber
    ctx.fillRect(0, CANVAS_HEIGHT/2 - 20, 60, 40);
    ctx.beginPath();
    ctx.arc(60, CANVAS_HEIGHT/2, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Particles
    if (gameState.phase !== 'RESULT') {
      if (isQuantum) {
          ctx.globalCompositeOperation = 'lighter';
          for (const p of particlesRef.current) {
            ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${1 - p.life / p.maxLife})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, gameState.phase === 'PLANNING' ? 2 : 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
      } else {
          // Classical Drawing
          for (const p of particlesRef.current) {
            ctx.fillStyle = `hsl(${p.hue}, 90%, 50%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            // Shininess
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x - 1, p.y - 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
      }
    } else if (gameState.phase === 'RESULT') {
       // Result phase (Static Snapshot)
       for (const p of particlesRef.current) {
        ctx.fillStyle = isQuantum ? '#ffffff' : `hsl(${p.hue}, 90%, 50%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Draw connection to target if close
        const dx = p.x - targetX;
        const dy = p.y - targetY;
        if (Math.sqrt(dx*dx + dy*dy) <= 50) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
        }
      }
    }

    // Draw Tools
    toolsRef.current.forEach(tool => {
      ctx.save();
      ctx.translate(tool.position.x, tool.position.y);
      
      const config = TOOL_CONFIGS[tool.type];
      const isSelected = selectedToolIdRef.current === tool.id;
      const isDragging = draggingToolIdRef.current === tool.id;

      if (isDragging || isSelected) {
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
      }

      if (tool.type === ToolType.SLIT) {
        ctx.fillStyle = config.color;
        if (isDragging || isSelected) ctx.strokeRect(-12, -82, 24, 164);

        ctx.fillRect(-10, -80, 20, 65);
        ctx.fillRect(-10, -5, 20, 10);
        ctx.fillRect(-10, 15, 20, 65);
      } else {
        ctx.beginPath();
        const radius = (config as any).radius || 20;
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${config.color}44`;
        ctx.fill();
        
        if (isDragging || isSelected) {
            ctx.strokeStyle = '#fde047';
        } else {
            ctx.strokeStyle = config.color;
        }
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillText(config.icon, 0, 0);
      }
      
      ctx.restore();

      if (isSelected) {
         ctx.save();
         let btnX = tool.position.x + 35;
         let btnY = tool.position.y - 35;
         
         if (tool.type === ToolType.SLIT) {
             btnX = tool.position.x + 25;
             btnY = tool.position.y - 90;
         }

         ctx.beginPath();
         ctx.arc(btnX, btnY, DELETE_BUTTON_RADIUS, 0, Math.PI * 2);
         ctx.fillStyle = '#ef4444';
         ctx.fill();
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 2;
         ctx.stroke();

         ctx.beginPath();
         ctx.moveTo(btnX - 4, btnY - 4);
         ctx.lineTo(btnX + 4, btnY + 4);
         ctx.moveTo(btnX + 4, btnY - 4);
         ctx.lineTo(btnX - 4, btnY + 4);
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 2;
         ctx.stroke();
         
         ctx.restore();
      }
    });
  };

  // Animation Loop
  const tick = useCallback(() => {
    // Always update physics if Planning or Fired (to show movement)
    if (gameState.phase === 'PLANNING' || gameState.phase === 'FIRED') {
      updatePhysics();
    }
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
    
    requestRef.current = requestAnimationFrame(tick);
  }, [gameState.phase, gameState.physicsMode, gameState.level]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tick]);


  // Interaction Handlers (Mouse/Touch)
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const calculateSnap = (rawX: number, rawY: number, skipId: string | null) => {
    let finalX = rawX;
    let finalY = rawY;
    const snap = { x: undefined as number | undefined, y: undefined as number | undefined };

    let snappedToObj = false;
    toolsRef.current.forEach(tool => {
      if (tool.id === skipId) return;

      if (Math.abs(rawX - tool.position.x) < SNAP_THRESHOLD) {
        finalX = tool.position.x;
        snap.x = tool.position.x;
        snappedToObj = true;
      }

      if (Math.abs(rawY - tool.position.y) < SNAP_THRESHOLD) {
        finalY = tool.position.y;
        snap.y = tool.position.y;
        snappedToObj = true;
      }
    });

    if (!snap.x) {
      const gridX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(rawX - gridX) < SNAP_THRESHOLD) {
        finalX = gridX;
        snap.x = gridX;
      }
    }
    
    if (!snap.y) {
       const gridY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
       if (Math.abs(rawY - gridY) < SNAP_THRESHOLD) {
         finalY = gridY;
         snap.y = gridY;
       }
       if (Math.abs(rawY - CANVAS_HEIGHT / 2) < SNAP_THRESHOLD) {
          finalY = CANVAS_HEIGHT / 2;
          snap.y = CANVAS_HEIGHT / 2;
       }
    }

    return { x: finalX, y: finalY, snapLines: snap };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.phase !== 'PLANNING') return;

    const pos = getMousePos(e);
    
    // Check delete buttons first
    if (selectedToolIdRef.current) {
        const selectedTool = toolsRef.current.find(t => t.id === selectedToolIdRef.current);
        if (selectedTool) {
             let btnX = selectedTool.position.x + 35;
             let btnY = selectedTool.position.y - 35;
             if (selectedTool.type === ToolType.SLIT) {
                 btnX = selectedTool.position.x + 25;
                 btnY = selectedTool.position.y - 90;
             }
             
             const dX = pos.x - btnX;
             const dY = pos.y - btnY;
             if (Math.sqrt(dX*dX + dY*dY) < DELETE_BUTTON_RADIUS + 10) {
                 setPlacedTools(prev => prev.filter(t => t.id !== selectedTool.id));
                 selectedToolIdRef.current = null;
                 lastInteractionTimeRef.current = Date.now(); // Update timestamp on delete
                 return;
             }
        }
    }

    const clickedTool = toolsRef.current.slice().reverse().find(t => {
      const dx = t.position.x - pos.x;
      const dy = t.position.y - pos.y;
      
      if (t.type === ToolType.SLIT) {
          return Math.abs(dx) < 25 && Math.abs(dy) < 90;
      }
      return Math.sqrt(dx*dx + dy*dy) < 45;
    });

    if (clickedTool) {
      draggingToolIdRef.current = clickedTool.id;
      selectedToolIdRef.current = clickedTool.id;
      isDraggingRef.current = true;
    } else {
      selectedToolIdRef.current = null;
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
     const pos = getMousePos(e);
     mouseRef.current = pos;

     if (isDraggingRef.current && draggingToolIdRef.current) {
       const { x, y, snapLines } = calculateSnap(pos.x, pos.y, draggingToolIdRef.current);
       snapLinesRef.current = snapLines;
       
       setPlacedTools(prev => prev.map(t => {
         if (t.id === draggingToolIdRef.current) {
           return { ...t, position: { x, y } };
         }
         return t;
       }));
     } else {
       snapLinesRef.current = null;
     }
  };

  const handleEnd = () => {
    if (isDraggingRef.current) {
        // If we were dragging, update timestamp
        lastInteractionTimeRef.current = Date.now();
    }
    isDraggingRef.current = false;
    draggingToolIdRef.current = null;
    snapLinesRef.current = null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (gameState.phase !== 'PLANNING') return;

    const type = e.dataTransfer.getData('toolType') as ToolType;
    if (type) {
      const rawPos = getMousePos(e);
      const { x, y } = calculateSnap(rawPos.x, rawPos.y, null);
      
      const newTool: PlacedTool = {
        id: Date.now().toString(),
        type,
        position: { x, y }
      };
      setPlacedTools(prev => [...prev, newTool]);
      selectedToolIdRef.current = newTool.id;
      lastInteractionTimeRef.current = Date.now(); // Update timestamp on drop
    }
  };

  // --------------------------------------------------------------------------
  // Fire / Result Logic with Smart Delay
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (gameState.phase === 'FIRED') {
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);

        // Calculate how much of the simulation has "already happened" while user was planning
        const now = Date.now();
        const elapsedSinceInteraction = now - lastInteractionTimeRef.current;
        const remainingDelay = Math.max(0, SIMULATION_DURATION_MS - elapsedSinceInteraction);

        // If simulation has been stable for 8s, result is instantaneous. 
        // Otherwise wait the remaining time.
        resultTimerRef.current = setTimeout(() => {
             // TIME'S UP - CALCULATE SCORE
             const { x: targetX, y: targetY } = getTargetPos();
             let accuracy = 0;

             // Snapshot positions of currently active particles
             let hits = 0;
             let totalValid = 0;
             
             particlesRef.current.forEach(p => {
                 // Check if near target
                 const dx = p.x - targetX;
                 const dy = p.y - targetY;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 if (dist <= 50) hits++;
                 totalValid++;
             });
             
             if (totalValid < 5) accuracy = 0; // Too few particles to judge
             else accuracy = Math.round((hits / totalValid) * 100);
             
             accuracy = Math.min(100, Math.max(0, accuracy || 0)); // Ensure not NaN

             onFireComplete(accuracy);

        }, remainingDelay);

        return () => {
            if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        }
    }
  }, [gameState.phase, gameState.physicsMode, gameState.level, onFireComplete]);


  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border border-slate-700 rounded-xl bg-slate-950 shadow-2xl cursor-crosshair touch-none block"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    />
  );
};

export default QuantumCanvas;