import React from 'react'
import './TimeInput.css'

function TimeInput({ value, onChange, min, disabled, label, required }) {
  const [hour, setHour] = React.useState('')
  const [minute, setMinute] = React.useState('')

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      setHour(h)
      setMinute(m)
    }
  }, [value])

  const handleHourChange = (e) => {
    const h = e.target.value
    setHour(h)
    if (h && minute) {
      onChange(`${h}:${minute}`)
    }
  }

  const handleMinuteChange = (e) => {
    const m = e.target.value
    setMinute(m)
    if (hour && m) {
      onChange(`${hour}:${m}`)
    }
  }

  // Generate hour and minute options
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  return (
    <div className="time-input-group">
      <label>{label}</label>
      <div className="time-select-container">
        <select
          value={hour}
          onChange={handleHourChange}
          disabled={disabled}
          className="time-select hour-select"
          required={required}
        >
          <option value="">小時</option>
          {hours.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="time-separator">:</span>
        <select
          value={minute}
          onChange={handleMinuteChange}
          disabled={disabled || !hour}
          className="time-select minute-select"
          required={required}
        >
          <option value="">分鐘</option>
          {minutes.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {hour && minute && (
          <span className="time-display">{hour}:{minute}</span>
        )}
      </div>
    </div>
  )
}

export default TimeInput
