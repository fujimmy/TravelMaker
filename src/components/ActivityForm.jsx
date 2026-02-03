import { useState, useEffect } from 'react'
import TimeInput from './TimeInput'
import './ActivityForm.css'

const CATEGORIES = ['交通', '住宿', '餐廳', '景點', '購物', '其他']

const LOCATION_SUGGESTIONS = [
  '機場', '飯店', '車站', '景點', '餐廳', '商店', '公園', '博物館', 
  '神社', '寺廟', '海灘', '山', '湖', '城市', '商圈'
]

function ActivityForm({ activity, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    location: '',
    startTime: '',
    endTime: '',
    content: '',
    cost: '',
    category: '景點',
    notes: ''
  })

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])

  useEffect(() => {
    if (activity) {
      setFormData(activity)
    }
  }, [activity])

  const handleLocationChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, location: value })

    if (value.trim()) {
      const filtered = LOCATION_SUGGESTIONS.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setFormData({ ...formData, location: suggestion })
    setShowSuggestions(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validation
    if (!formData.startTime || !formData.endTime) {
      alert('請輸入起迄時間')
      return
    }

    if (!formData.content.trim()) {
      alert('請輸入行程內容')
      return
    }

    if (formData.startTime >= formData.endTime) {
      alert('結束時間必須晚於開始時間')
      return
    }

    onSave(formData)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{activity ? '編輯活動' : '新增活動'}</h3>
          <button className="btn-close" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <TimeInput
                label="開始時間 *"
                value={formData.startTime}
                onChange={(val) => setFormData({ ...formData, startTime: val })}
              />
            </div>

            <div>
              <TimeInput
                label="結束時間 *"
                value={formData.endTime}
                onChange={(val) => setFormData({ ...formData, endTime: val })}
                disabled={!formData.startTime}
                min={formData.startTime}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">行程類別 *</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group location-group">
            <label htmlFor="location">地點</label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={handleLocationChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => formData.location && setShowSuggestions(filteredSuggestions.length > 0)}
              placeholder="輸入地點名稱"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {filteredSuggestions.map((suggestion, idx) => (
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

          <div className="form-group">
            <label htmlFor="content">行程內容 *</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="描述這個活動的內容"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="cost">費用 (NT$)</label>
            <input
              type="number"
              id="cost"
              min="0"
              step="1"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">備註</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="其他需要記錄的資訊"
              rows="2"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ActivityForm
