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
    let h = e.target.value
    if (h && (parseInt(h) < 0 || parseInt(h) > 23)) {
      return
    }
    setHour(h)
    updateTime(h, minute)
  }

  const handleMinuteChange = (e) => {
    let m = e.target.value
    if (m && (parseInt(m) < 0 || parseInt(m) > 59)) {
      return
    }
    setMinute(m)
    updateTime(hour, m)
  }

  const updateTime = (h, m) => {
    if (h && m) {
      const hStr = String(h).padStart(2, '0')
      const mStr = String(m).padStart(2, '0')
      onChange(`${hStr}:${mStr}`)
    }
  }

  const isDisabled = disabled || !hour || !minute

  return (
    <div className="time-input-group">
      <label>{label}</label>
      <div className="time-input-wrapper">
        <div className="time-input-field">
          <input
            type="number"
            min="0"
            max="23"
            placeholder="00"
            value={hour}
            onChange={handleHourChange}
            disabled={disabled}
            className="hour-input"
          />
          <span className="time-separator">:</span>
          <input
            type="number"
            min="0"
            max="59"
            placeholder="00"
            value={minute}
            onChange={handleMinuteChange}
            disabled={disabled || !hour}
            className="minute-input"
          />
        </div>
        {value && <span className="time-display">{value}</span>}
      </div>
      <span className="time-hint">24小時制 (00-23):(00-59)</span>
    </div>
  )
}

export default TimeInput
