'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  sequenceSlot?: React.ReactNode;
  activeTrackId?: string | null;
  onActiveTrackChange?: (trackId: string) => void;
}

const formatTimeLabel = (value: number) => `${value.toFixed(0)}s`;

const formatValueLabel = (track: TimelineTrack, value: number) => {
  if (track.id === 'transition') return `${Math.round(value * 100)}%`;
  if (track.id === 'rotation') return value.toFixed(2);
  if (track.id === 'lighting') return value.toFixed(1);
  return value.toFixed(2);
};

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
  onTracksChange,
  sequenceSlot,
  activeTrackId,
  onActiveTrackChange
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);
  const [showSequence, setShowSequence] = useState(false);
  const rulerRef = useRef<HTMLDivElement>(null);
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];

  useEffect(() => {
    if (!activeTrackId) return;
    setSelectedTrackId(activeTrackId);
  }, [activeTrackId]);

  const selectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    onActiveTrackChange?.(trackId);
  };

  const timeFromClientX = (clientX: number) => {
    if (!rulerRef.current) return currentTime;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Number(((x / rect.width) * duration).toFixed(3));
  };

  // Handle timeline clicking and dragging
  const handleTimelineScrub = (clientX: number) => {
    onTimeChange(timeFromClientX(clientX));
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
    const keyframeTime = Number(currentTime.toFixed(2));
    let nextSelectedKeyframeId: string | null = null;
    const updatedTracks = tracks.map((track) => {
      if (track.id !== trackId) return track;
      
      // Determine default added value based on current slider/interpolation state
      const currentValue = interpolateKeyframes(currentTime, track);
      
      // Prevent overlapping keyframes on exact time (keep threshold of 0.05s)
      const existingKeyframe = track.keyframes.find(k => Math.abs(k.time - keyframeTime) < 0.05);
      if (existingKeyframe) {
        nextSelectedKeyframeId = existingKeyframe.id;
        return track;
      }

      const newKeyframe: Keyframe = {
        id: Math.random().toString(36).substr(2, 9),
        time: keyframeTime,
        value: currentValue,
        easing: 'ease-in-out'
      };
      nextSelectedKeyframeId = newKeyframe.id;

      return {
        ...track,
        keyframes: [...track.keyframes, newKeyframe].sort((a, b) => a.time - b.time)
      };
    });
    
    selectTrack(trackId);
    setSelectedKeyframeId(nextSelectedKeyframeId);
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

  const changeKeyframeValue = (trackId: string, kfId: string, value: number) => {
    if (!Number.isFinite(value)) return;
    const updatedTracks = tracks.map((track) => {
      if (track.id !== trackId) return track;
      const clampedValue = Math.max(track.min, Math.min(track.max, value));
      return {
        ...track,
        defaultValue: clampedValue,
        keyframes: track.keyframes.map(k => k.id === kfId ? { ...k, value: clampedValue } : k)
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
    return kf ? { track, trackId: track.id, kf } : null;
  })();
  const visibleTracks = activeTrack ? [activeTrack] : [];

  return (
    <div className="flex flex-col h-full bg-[#0f1012] select-none shrink-0 overflow-hidden font-sans">
      
      {/* 1. Header controls */}
      <div className="flex items-center justify-between gap-3 px-3 h-9 border-b border-white/[0.055] bg-[#101113] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[11px] text-zinc-500 font-mono tabular-nums w-[58px] shrink-0">
            <span className="text-zinc-300">{currentTime.toFixed(2)}s</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 min-w-0 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            <span>Keyframes</span>
            <span className="text-zinc-700">/</span>
            <span className="normal-case tracking-normal text-zinc-500 truncate">{activeTrack?.name}</span>
          </div>
        </div>

        {/* Keyframe inspector */}
        {activeKf && (
          <div className="flex items-center gap-2 text-xs animate-fade-in">
            <span className="hidden sm:inline text-zinc-500 text-[11px]">{activeKf.track.name}</span>
            <span className="text-zinc-500 text-[11px]">{activeKf.kf.time.toFixed(2)}s</span>
            <input
              type="number"
              min={activeKf.track.min}
              max={activeKf.track.max}
              step={(activeKf.track.max - activeKf.track.min) > 2 ? 0.1 : 0.01}
              value={Number(activeKf.kf.value.toFixed(2))}
              onChange={(event) => changeKeyframeValue(activeKf.trackId, activeKf.kf.id, Number.parseFloat(event.target.value))}
              className="h-6 w-14 rounded-md border border-white/[0.08] bg-black/25 px-1.5 text-right font-mono text-[11px] text-zinc-300 outline-none focus:border-white/20"
            />
            <select
              value={activeKf.kf.easing}
              className="h-6 bg-black/25 border border-white/[0.08] rounded-md px-1.5 text-zinc-300 outline-none cursor-pointer text-[11px]"
              onChange={(e) => changeKeyframeEasing(activeKf.trackId, activeKf.kf.id, e.target.value as EasingType)}
            >
              <option value="linear">Linear</option>
              <option value="ease-in-out">Ease In Out</option>
              <option value="spring">Spring</option>
              <option value="bounce">Bounce</option>
            </select>
            <Button size="icon-xs" variant="ghost" aria-label="Delete keyframe" className="hover:bg-red-500/10 hover:text-red-400 text-zinc-600" onClick={() => deleteKeyframe(activeKf.trackId, activeKf.kf.id)}>
              <Trash2 size={11} />
            </Button>
          </div>
        )}
        {!activeKf && sequenceSlot && (
          <button
            type="button"
            onClick={() => setShowSequence((value) => !value)}
            className={`h-6 shrink-0 rounded-md border px-2 text-[10px] font-medium transition-colors ${
              showSequence
                ? 'border-white/[0.14] bg-white/[0.08] text-zinc-100'
                : 'border-white/[0.07] bg-black/20 text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            Shapes
          </button>
        )}
      </div>

      {sequenceSlot && showSequence && (
        <div className="h-9 shrink-0 border-b border-white/[0.055] bg-[#111316] flex items-center overflow-hidden">
          <div className="min-w-0 flex-1 px-3 overflow-x-auto">
            {sequenceSlot}
          </div>
        </div>
      )}

      {/* 2. Scrollable timeline tracks */}
      <div className="flex flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#0f1012]">
        {/* Left Side: Track Names list */}
        <div className="w-[132px] border-r border-white/[0.055] shrink-0 bg-[#101113]">
          {visibleTracks.map((track) => {
            const isActiveTrack = activeTrackId === track.id || selectedTrackId === track.id;
            return (
            <div
              key={track.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                selectTrack(track.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectTrack(track.id);
                }
              }}
              className={`flex items-center justify-between h-10 px-3 border-b border-white/[0.035] group transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
                isActiveTrack ? 'bg-white/[0.055]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`size-2 rounded-full shrink-0 ${isActiveTrack ? 'ring-2 ring-white/25' : ''}`} style={{ backgroundColor: track.color }} />
                <div className="min-w-0">
                  <div className={`text-[11px] font-medium truncate ${isActiveTrack ? 'text-zinc-100' : 'text-zinc-300'}`}>{track.name}</div>
                  {track.keyframes.length > 0 && (
                    <div className="text-[9px] leading-none text-zinc-600">{track.keyframes.length} {track.keyframes.length === 1 ? 'key' : 'keys'}</div>
                  )}
                </div>
              </div>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Add keyframe to ${track.name}`}
                className={`${isActiveTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:bg-white/[0.08] transition-opacity text-zinc-500 hover:text-white`}
                onClick={(event) => {
                  event.stopPropagation();
                  selectTrack(track.id);
                  addKeyframe(track.id);
                }}
              >
                <Plus size={10} />
              </Button>
            </div>
            );
          })}
        </div>

        {/* Right Side: Keyframe grid editor & scrub ruler */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Timeline ruler */}
          <div ref={rulerRef} onMouseDown={handleMouseDown} className="h-6 bg-black/15 border-b border-white/[0.045] relative cursor-col-resize shrink-0">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(i / duration) * 100}%` }}>
                <span className="text-[9px] text-zinc-600 font-mono pl-1 absolute top-1">{formatTimeLabel(i)}</span>
                {i > 0 && <div className="w-px h-full bg-white/[0.025] absolute bottom-0" />}
              </div>
            ))}
            
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-px bg-white z-10 pointer-events-none" style={{ left: `${(currentTime / duration) * 100}%` }}>
              <div className="w-2.5 h-2.5 bg-white rounded-full absolute -top-0.5 -left-1 shadow-sm" />
            </div>
          </div>

          {/* Grid tracks container */}
          <div className="flex-1 relative overflow-y-auto">
            {visibleTracks.length === 0 && (
              <div className="h-full flex items-center justify-center text-[11px] text-zinc-600">
                Select a motion property
              </div>
            )}
            {visibleTracks.map((track) => (
              <div
                key={track.id}
                className={`h-10 border-b border-white/[0.035] relative transition-colors cursor-pointer ${
                  activeTrackId === track.id || selectedTrackId === track.id ? 'bg-white/[0.025]' : 'hover:bg-white/[0.014]'
                }`}
                onClick={(event) => {
                  selectTrack(track.id);
                  onTimeChange(timeFromClientX(event.clientX));
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  addKeyframe(track.id);
                }}
              >
                {/* Horizontal guide line */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/[0.04] pointer-events-none" />

                {/* Draw Keyframe diamonds */}
                {track.keyframes.map((kf) => {
                  const selected = selectedTrackId === track.id && selectedKeyframeId === kf.id;
                  return (
                    <div
                      key={kf.id}
                      title={`${track.name} ${formatValueLabel(track, kf.value)} at ${kf.time.toFixed(2)}s`}
                      className="absolute top-1/2 -translate-y-1/2 size-3 rotate-45 border cursor-grab active:cursor-grabbing hover:scale-125 transition-transform duration-100 flex items-center justify-center"
                      style={{
                        left: `calc(${(kf.time / duration) * 100}% - 6px)`,
                        backgroundColor: selected ? '#ffffff' : track.color,
                        borderColor: selected ? '#ffffff' : 'rgba(0,0,0,0.9)',
                        boxShadow: selected ? `0 0 0 3px ${track.color}44` : 'none',
                        zIndex: selected ? 30 : 20
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTrack(track.id);
                        setSelectedKeyframeId(kf.id);
                      }}
                      onMouseDown={(e) => handleKeyframeDragStart(e, track.id, kf.id)}
                    >
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
