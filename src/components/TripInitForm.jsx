import { useState } from 'react'
import './TripInitForm.css'

const LOCATION_SUGGESTIONS = {
  '沖繩': ['沖繩', '那霸', '日本'],
  '東京': ['東京', '新宿', '涉谷', '日本'],
  '大阪': ['大阪', '心齋橋', '道頓堀', '日本'],
  '首爾': ['首爾', '明洞', '江南', '韓國'],
  '曼谷': ['曼谷', '暹羅', '泰國'],
  '台北': ['台北', '西門町', '信義區', '台灣'],
  '巴黎': ['巴黎', '艾菲爾鐵塔', '法國'],
  '倫敦': ['倫敦', '大笨鐘', '英國'],
  '紐約': ['紐約', '曼哈頓', '美國'],
}

function TripInitForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    location: '',
    participantCount: 1,
    participants: ['']
  })

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const handleLocationChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, location: value })

    // Generate suggestions
    if (value.trim()) {
      const matches = []
      Object.keys(LOCATION_SUGGESTIONS).forEach(key => {
        if (key.includes(value)) {
          matches.push(...LOCATION_SUGGESTIONS[key])
        }
      })
      setSuggestions([...new Set(matches)])
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setFormData({ ...formData, location: suggestion })
    setShowSuggestions(false)
  }

  const handleParticipantCountChange = (e) => {
    const count = parseInt(e.target.value) || 1
    const participants = Array(count).fill('').map((_, idx) => 
      formData.participants[idx] || ''
    )
    setFormData({ ...formData, participantCount: count, participants })
  }

  const handleParticipantNameChange = (index, value) => {
    const newParticipants = [...formData.participants]
    newParticipants[index] = value
    setFormData({ ...formData, participants: newParticipants })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validation
    if (!formData.startDate || !formData.endDate) {
      alert('請選擇旅遊日期')
      return
    }

    if (!formData.location.trim()) {
      alert('請輸入旅遊地點')
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      alert('結束日期不能早於開始日期')
      return
    }

    const filledParticipants = formData.participants.filter(p => p.trim())
    if (filledParticipants.length === 0) {
      alert('請至少輸入一位參與者姓名')
      return
    }

    onSubmit({
      ...formData,
      participants: filledParticipants
    })
  }

  return (
    <div className="trip-init-form">
      <div className="form-card">
        <div className="form-header">
          <h2>建立新行程</h2>
          <p>填寫基本資訊，開始規劃你的旅程</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>📅 旅遊日期</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">開始日期</label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">結束日期</label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>📍 旅遊地點</h3>
            <div className="form-group location-group">
              <label htmlFor="location">地點</label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={handleLocationChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => formData.location && setSuggestions(suggestions) && setShowSuggestions(suggestions.length > 0)}
                placeholder="例如：沖繩、東京、首爾..."
                required
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="suggestion-item"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>👥 參與人員</h3>
            <div className="form-group">
              <label htmlFor="participantCount">人數</label>
              <input
                type="number"
                id="participantCount"
                min="1"
                max="20"
                value={formData.participantCount}
                onChange={handleParticipantCountChange}
              />
            </div>

            <div className="participants-list">
              {formData.participants.map((participant, idx) => (
                <div key={idx} className="form-group">
                  <label htmlFor={`participant-${idx}`}>
                    參與者 {idx + 1}
                  </label>
                  <input
                    type="text"
                    id={`participant-${idx}`}
                    value={participant}
                    onChange={(e) => handleParticipantNameChange(idx, e.target.value)}
                    placeholder="輸入姓名"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              建立行程
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TripInitForm
