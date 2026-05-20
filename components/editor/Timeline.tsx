'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export type EasingType = 'linear' | 'ease-in-out' | 'spring' | 'bounce';

export interface Keyframe {
  id: string;
  time: number; // in seconds, 0 to duration
  value: number; // generalized 0 to 1
  easing: EasingType;
}

export interface TimelineTrack {
  id: string;
  name: string;
  color: string;
  min: number;
  max: number;
  defaultValue: number;
  keyframes: Keyframe[];
}

interface TimelineProps {
  duration: number; // in seconds
  currentTime: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayToggle: () => void;
  onReset: () => void;
  tracks: TimelineTrack[];
  onTracksChange: (tracks: TimelineTrack[]) => void;
}

// Math Easing Formulas
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const springEase = (t: number) => {
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const bounceEase = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

export const interpolateKeyframes = (time: number, track: TimelineTrack): number => {
  const keyframes = [...track.keyframes].sort((a, b) => a.time - b.time);
  
  if (keyframes.length === 0) {
    return track.defaultValue;
  }
  
  // If time is before first keyframe, return first keyframe's value
  if (time <= keyframes[0].time) {
    return keyframes[0].value;
  }
  
  // If time is after last keyframe, return last keyframe's value
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }
  
  // Find surrounding keyframes
  let prev = keyframes[0];
  let next = keyframes[0];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i+1].time) {
      prev = keyframes[i];
      next = keyframes[i+1];
      break;
    }
  }
  
  const timeDiff = next.time - prev.time;
  if (timeDiff === 0) return prev.value;
  
  const ratio = (time - prev.time) / timeDiff;
  
  // Apply Easing
  let easedRatio = ratio;
  if (prev.easing === 'ease-in-out') easedRatio = easeInOut(ratio);
  else if (prev.easing === 'spring') easedRatio = springEase(ratio);
  else if (prev.easing === 'bounce') easedRatio = bounceEase(ratio);
  
  return prev.value + (next.value - prev.value) * easedRatio;
};

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlayToggle,
  onReset,
  tracks,
  onTracksChange
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Handle timeline clicking and dragging
  const handleTimelineScrub = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newTime = (x / rect.width) * duration;
    onTimeChange(Number(newTime.toFixed(3)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleTimelineScrub(e.clientX);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleTimelineScrub(moveEvent.clientX);
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Add Keyframe on current timeline time
  const addKeyframe = (trackId: string) => {
    const updatedTracks = tracks.map((track) => {
      if (track.id !== trackId) return track;
      
      // Determine default added value based on current slider/interpolation state
      const currentValue = interpolateKeyframes(currentTime, track);
      
      // Prevent overlapping keyframes on exact time (keep threshold of 0.05s)
      const existingIdx = track.keyframes.findIndex(k => Math.abs(k.time - currentTime) < 0.05);
      if (existingIdx !== -1) return track; // Skip duplicates

      const newKeyframe: Keyframe = {
        id: Math.random().toString(36).substr(2, 9),
        time: currentTime,
        value: currentValue,
        easing: 'ease-in-out'
      };

      return {
        ...track,
        keyframes: [...track.keyframes, newKeyframe]
      };
    });
    
    onTracksChange(updatedTracks);
  };

  // Delete keyframe
  const deleteKeyframe = (trackId: string, kfId: string) => {
    const updatedTracks = tracks.map((track) => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        keyframes: track.keyframes.filter(k => k.id !== kfId)
      };
    });
    onTracksChange(updatedTracks);
    setSelectedKeyframeId(null);
  };

  // Update Easing of active keyframe
  const changeKeyframeEasing = (trackId: string, kfId: string, easing: EasingType) => {
    const updatedTracks = tracks.map((track) => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        keyframes: track.keyframes.map(k => k.id === kfId ? { ...k, easing } : k)
      };
    });
    onTracksChange(updatedTracks);
  };

  // Dragging keyframe along time axis
  const handleKeyframeDragStart = (e: React.MouseEvent, trackId: string, kfId: string) => {
    e.stopPropagation();
    if (!rulerRef.current) return;
    
    const rect = rulerRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const newTime = Number(((x / rect.width) * duration).toFixed(2));
      
      // Update keyframe time
      const updatedTracks = tracks.map((track) => {
        if (track.id !== trackId) return track;
        return {
          ...track,
          keyframes: track.keyframes.map(k => k.id === kfId ? { ...k, time: newTime } : k)
        };
      });
      onTracksChange(updatedTracks);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Dragging the entire transition block (sliding both keyframes together)
  const handleBlockDragStart = (e: React.MouseEvent, trackId: string, kf1Id: string, kf2Id: string) => {
    e.stopPropagation();
    if (!rulerRef.current) return;
    
    const rect = rulerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    const kf1 = track.keyframes.find(k => k.id === kf1Id);
    const kf2 = track.keyframes.find(k => k.id === kf2Id);
    if (!kf1 || !kf2) return;
    
    const initialTime1 = kf1.time;
    const initialTime2 = kf2.time;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let deltaTime = (deltaX / rect.width) * duration;
      
      // Constrain block movement within timeline range [0, duration]
      if (initialTime1 + deltaTime < 0) {
        deltaTime = -initialTime1;
      } else if (initialTime2 + deltaTime > duration) {
        deltaTime = duration - initialTime2;
      }
      
      const newTime1 = Number((initialTime1 + deltaTime).toFixed(2));
      const newTime2 = Number((initialTime2 + deltaTime).toFixed(2));
      
      const updatedTracks = tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          keyframes: t.keyframes.map(k => {
            if (k.id === kf1Id) return { ...k, time: newTime1 };
            if (k.id === kf2Id) return { ...k, time: newTime2 };
            return k;
          })
        };
      });
      onTracksChange(updatedTracks);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Find active keyframe details
  const activeKf = (() => {
    if (!selectedTrackId || !selectedKeyframeId) return null;
    const track = tracks.find(t => t.id === selectedTrackId);
    if (!track) return null;
    const kf = track.keyframes.find(k => k.id === selectedKeyframeId);
    return kf ? { trackId: track.id, kf } : null;
  })();

  return (
    <div className="flex flex-col h-full bg-zinc-950 select-none shrink-0 overflow-hidden font-sans">
      
      {/* 1. Header controls */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-zinc-800/60 bg-zinc-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white" onClick={onPlayToggle}>
            {isPlaying ? <Pause size={13} className="fill-white" /> : <Play size={13} className="fill-white" />}
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white" onClick={onReset}>
            <RotateCcw size={13} />
          </Button>
          <div className="text-[11px] text-zinc-500 font-mono ml-1">
            <span className="text-zinc-300">{currentTime.toFixed(2)}</span>
            <span className="text-zinc-600 mx-0.5">/</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
        </div>

        {/* Keyframe inspector */}
        {activeKf && (
          <div className="flex items-center gap-2.5 text-xs animate-fade-in">
            <span className="text-zinc-500 text-[11px]">{activeKf.kf.time.toFixed(2)}s</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[activeKf.kf.value]}
              className="w-20 cursor-pointer my-1 [&_[data-slot=slider-range]]:bg-violet-500 [&_[data-slot=slider-thumb]]:border-violet-500"
              onValueChange={(val) => {
                const numVal = (val as number[])[0];
                onTracksChange(tracks.map(t => t.id === activeKf.trackId ? {
                  ...t,
                  keyframes: t.keyframes.map(k => k.id === activeKf.kf.id ? { ...k, value: numVal } : k)
                } : t));
              }}
            />
            <span className="text-zinc-300 font-mono text-[11px] w-8 text-right">{(activeKf.kf.value * 100).toFixed(0)}%</span>
            
            <div className="w-px h-4 bg-zinc-800" />
            
            <select
              value={activeKf.kf.easing}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-1.5 py-1 text-zinc-300 outline-none cursor-pointer text-[11px]"
              onChange={(e) => changeKeyframeEasing(activeKf.trackId, activeKf.kf.id, e.target.value as EasingType)}
            >
              <option value="linear">Linear</option>
              <option value="ease-in-out">Ease In Out</option>
              <option value="spring">Spring</option>
              <option value="bounce">Bounce</option>
            </select>

            {/* Easing curve preview */}
            <div className="w-8 h-6 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
              <svg className="w-full h-full text-violet-400" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d={(() => {
                    const points: string[] = [];
                    for (let i = 0; i <= 20; i++) {
                      const r = i / 20;
                      let er = r;
                      if (activeKf.kf.easing === 'ease-in-out') er = easeInOut(r);
                      else if (activeKf.kf.easing === 'spring') er = springEase(r);
                      else if (activeKf.kf.easing === 'bounce') er = bounceEase(r);
                      const x = r * 100;
                      const y = 90 - er * 80;
                      points.push(`${x},${y}`);
                    }
                    return `M ${points.join(' L ')}`;
                  })()}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                />
              </svg>
            </div>
            
            <Button size="icon" variant="ghost" className="w-6 h-6 rounded-md hover:bg-red-500/10 hover:text-red-400 text-zinc-600" onClick={() => deleteKeyframe(activeKf.trackId, activeKf.kf.id)}>
              <Trash2 size={11} />
            </Button>
          </div>
        )}

        <span className="text-[10px] text-zinc-600">
          Double-click to add keyframe
        </span>
      </div>

      {/* 2. Scrollable timeline tracks */}
      <div className="flex flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-zinc-950">
        {/* Left Side: Track Names list */}
        <div className="w-[160px] border-r border-zinc-800/50 shrink-0 bg-zinc-900/50">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center justify-between h-[36px] px-3 border-b border-zinc-800/20 hover:bg-white/[0.03] group transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
                <span className="text-[11px] font-medium text-zinc-400 truncate">{track.name}</span>
              </div>
              <Button size="icon" variant="ghost" className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-opacity" onClick={() => addKeyframe(track.id)}>
                <Plus size={10} className="text-zinc-500 hover:text-white" />
              </Button>
            </div>
          ))}
        </div>

        {/* Right Side: Keyframe grid editor & scrub ruler */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Timeline ruler */}
          <div ref={rulerRef} onMouseDown={handleMouseDown} className="h-5 bg-zinc-900/30 border-b border-zinc-800/40 relative cursor-col-resize shrink-0">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(i / duration) * 100}%` }}>
                <span className="text-[9px] text-zinc-600 font-mono pl-1 absolute top-0.5">{i}s</span>
                <div className="w-px h-full bg-zinc-800/30 absolute bottom-0" />
              </div>
            ))}
            
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-px bg-white z-10 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }}>
              <div className="w-2 h-2.5 bg-white rounded-sm absolute -top-0.5 -left-[3.5px] shadow-sm" />
            </div>
          </div>

          {/* Grid tracks container */}
          <div className="flex-1 relative overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-[36px] border-b border-zinc-800/20 relative hover:bg-white/[0.02] transition-colors cursor-crosshair"
                onDoubleClick={(e) => {
                  if (!rulerRef.current) return;
                  const rect = rulerRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                  const newTime = Number(((x / rect.width) * duration).toFixed(2));
                  onTimeChange(newTime);
                  
                  // Append keyframe dynamically
                  const currentValue = interpolateKeyframes(newTime, track);
                  const updatedTracks = tracks.map((t) => {
                    if (t.id !== track.id) return t;
                    const newKf: Keyframe = {
                      id: Math.random().toString(36).substr(2, 9),
                      time: newTime,
                      value: currentValue,
                      easing: 'ease-in-out'
                    };
                    return { ...t, keyframes: [...t.keyframes, newKf] };
                  });
                  onTracksChange(updatedTracks);
                }}
              >
                {/* Horizontal guide line */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px border-t border-dashed border-border/10 pointer-events-none" />

                {/* Draw Premiere-Style Glassy Transition Blocks */}
                {(() => {
                  const sortedKfs = [...track.keyframes].sort((a, b) => a.time - b.time);
                  const blocks = [];
                  for (let i = 0; i < sortedKfs.length - 1; i++) {
                    const kf1 = sortedKfs[i];
                    const kf2 = sortedKfs[i + 1];
                    const left = (kf1.time / duration) * 100;
                    const width = ((kf2.time - kf1.time) / duration) * 100;
                    
                    // Generate exact mathematical SVG ease curve path inside
                    const pathD = (() => {
                      const points: string[] = [];
                      const N = 30;
                      for (let j = 0; j <= N; j++) {
                        const ratio = j / N;
                        let easedRatio = ratio;
                        if (kf1.easing === 'ease-in-out') easedRatio = easeInOut(ratio);
                        else if (kf1.easing === 'spring') easedRatio = springEase(ratio);
                        else if (kf1.easing === 'bounce') easedRatio = bounceEase(ratio);
                        
                        const val = kf1.value + (kf2.value - kf1.value) * easedRatio;
                        const x = ratio * 100;
                        const y = 90 - val * 80;
                        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                      }
                      return `M ${points.join(' L ')}`;
                    })();

                    blocks.push(
                      <div
                        key={`block-${kf1.id}-${kf2.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackId(track.id);
                          setSelectedKeyframeId(kf1.id);
                        }}
                        onMouseDown={(e) => handleBlockDragStart(e, track.id, kf1.id, kf2.id)}
                        className="absolute h-8 top-1 rounded-md border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 cursor-col-resize select-none overflow-hidden backdrop-blur-sm transition-colors group/block"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`
                        }}
                        title={`Drag to slide transition | Easing: ${kf1.easing}`}
                      >
                        <svg className="w-full h-full text-white/25 group-hover/block:text-white/40 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path d={pathD} fill="none" stroke="currentColor" strokeWidth="4" />
                        </svg>
                      </div>
                    );
                  }
                  return blocks;
                })()}

                {/* Draw Keyframe diamonds */}
                {track.keyframes.map((kf) => {
                  const selected = selectedTrackId === track.id && selectedKeyframeId === kf.id;
                  return (
                    <div
                      key={kf.id}
                      className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-45 border-2 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform duration-100 flex items-center justify-center`}
                      style={{
                        left: `calc(${(kf.time / duration) * 100}% - 7px)`,
                        backgroundColor: selected ? '#ffffff' : track.color,
                        borderColor: selected ? '#7c5cff' : '#000000',
                        boxShadow: selected ? '0 0 8px #7c5cff' : 'none',
                        zIndex: selected ? 30 : 20
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackId(track.id);
                        setSelectedKeyframeId(kf.id);
                      }}
                      onMouseDown={(e) => handleKeyframeDragStart(e, track.id, kf.id)}
                    >
                      {/* Inner dot depending on easing */}
                      {kf.easing !== 'linear' && (
                        <div className={`w-1 h-1 rounded-full ${selected ? 'bg-[#7c5cff]' : 'bg-white'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Playhead line across tracks */}
            <div className="absolute top-0 bottom-0 w-px bg-white/15 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
