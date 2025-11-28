import { useId, type ChangeEvent } from 'react'

interface CircleMeterProps {
  label: string
  value?: number
  min?: number
  max: number
  step?: number
  precision?: number
  suffix?: string
  onChange?: (value: number | undefined) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const CircleMeter = ({
  label,
  value,
  min = 0,
  max,
  step = 1,
  precision = 0,
  suffix = '',
  onChange,
}: CircleMeterProps) => {
  const inputId = useId()
  const normalized = typeof value === 'number' ? clamp(value, min, max) : undefined
  const ratio = normalized != null ? normalized / max : 0
  const dashOffset = CIRCUMFERENCE * (1 - ratio)
  const displayValue = normalized != null ? normalized.toFixed(precision) : '--'

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    if (raw === '') {
      onChange?.(undefined)
      return
    }
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) return
    const nextValue = clamp(parsed, min, max)
    onChange?.(nextValue)
  }

  return (
    <label className="circle-meter" htmlFor={inputId}>
      <div className="circle-meter__visual" role="img" aria-label={`${label}: ${displayValue}${suffix}`}>
        <svg viewBox="0 0 64 64">
          <circle className="circle-meter__track" cx="32" cy="32" r={RADIUS} />
          <circle
            className="circle-meter__progress"
            cx="32"
            cy="32"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="circle-meter__value">
          {displayValue}
          {suffix}
        </span>
      </div>
      <div className="circle-meter__controls">
        <span className="circle-meter__label">{label}</span>
        <input
          id={inputId}
          type="number"
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          onChange={handleChange}
        />
      </div>
    </label>
  )
}

export default CircleMeter
