"use client"

import {
  clampInspectorValue,
  useRafNumberChange,
} from "./InspectorControlModel"
import { NumberField } from "./NumberField"

export function InspectorSlider({
  value,
  min,
  max,
  sliderMin = min,
  sliderMax = max,
  step,
  scrubStep,
  precision,
  className = "flex-1",
  inputClassName = "w-[58px]",
  sliderClassName = "flex-1",
  onChange,
}: {
  value: number
  min: number
  max: number
  sliderMin?: number
  sliderMax?: number
  step: number
  scrubStep?: number
  precision: number
  className?: string
  inputClassName?: string
  sliderClassName?: string
  onChange: (value: number) => void
}) {
  const { flush: flushSliderChange, schedule: scheduleSliderChange } =
    useRafNumberChange(onChange)
  const sliderValue = clampInspectorValue(value, sliderMin, sliderMax)
  const progress =
    sliderMax > sliderMin
      ? clampInspectorValue(
          (sliderValue - sliderMin) / (sliderMax - sliderMin),
          0,
          1
        )
      : 0
  const thumbInset = 12
  const thumbPosition = `calc(${thumbInset}px + ${progress} * (100% - ${thumbInset * 2}px))`

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <NumberField
        value={value}
        min={min}
        max={max}
        step={step}
        scrubStep={scrubStep}
        precision={precision}
        className={inputClassName}
        onChange={onChange}
      />
      <label
        className={`relative h-7 min-w-0 overflow-visible rounded-[8px] transition-opacity hover:opacity-95 ${sliderClassName}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: `linear-gradient(to right, var(--inspector-slider-active) 0 ${thumbPosition}, var(--inspector-slider-track) ${thumbPosition} 100%)`,
        }}
      >
        <span
          className="pointer-events-none absolute inset-y-0 w-6 -translate-x-1/2 rounded-[8px] bg-[var(--inspector-slider-thumb)] shadow-[inset_0_1px_0_rgba(255,255,255,0.26)] transition-colors"
          style={{ left: thumbPosition }}
        />
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={sliderValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onChange={(event) => scheduleSliderChange(Number(event.target.value))}
          onPointerUp={flushSliderChange}
          onKeyUp={flushSliderChange}
          onBlur={flushSliderChange}
          className="absolute inset-y-0 right-3 left-3 h-full w-auto cursor-ew-resize appearance-none opacity-0"
        />
      </label>
    </div>
  )
}
