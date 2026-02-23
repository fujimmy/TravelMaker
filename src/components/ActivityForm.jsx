import { useState, useEffect, useRef } from 'react'
import TimeInput from './TimeInput'
import './ActivityForm.css'

const CATEGORIES = ['交通', '住宿', '餐廳', '景點', '購物', '其他']

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
  const autocompleteServiceRef = useRef(null)
  const placesServiceRef = useRef(null)
  const locationInputRef = useRef(null)

  useEffect(() => {
    if (activity) {
      setFormData(activity)
    }
  }, [activity])

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (window.google?.maps?.places?.AutocompleteService) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        document.createElement('div')
      )
    }
  }, [])

  const handleLocationChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, location: value })

    if (value.trim().length > 1) {
      if (autocompleteServiceRef.current) {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: value,
            // 移除國家限制，允許搜尋全球地點
          },
          (predictions) => {
            if (predictions) {
              setFilteredSuggestions(predictions)
              setShowSuggestions(true)
            }
          }
        )
      }
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (prediction) => {
    const mainText =
      prediction.structured_formatting?.main_text ||
      prediction.main_text ||
      prediction.description
    let cleanedLocation = mainText

    // Remove postal codes
    cleanedLocation = cleanedLocation
      .replace(/\s*\d{5}(?:-\d{4})?\s*$/, '') // US format
      .replace(/\s*\d{3}-\d{4}\s*$/, '') // Japan format  
      .replace(/\s*\d{2,5}\s*$/, '') // Taiwan format

    setFormData({ ...formData, location: cleanedLocation.trim() })
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
              ref={locationInputRef}
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
                    key={suggestion.place_id || idx}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="main-text">
                      {suggestion.structured_formatting?.main_text || suggestion.main_text || suggestion.description}
                    </span>
                    {(suggestion.structured_formatting?.secondary_text || suggestion.secondary_text) && (
                      <span className="secondary-text">
                        {suggestion.structured_formatting?.secondary_text || suggestion.secondary_text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {formData.location && !showSuggestions && (
              <a 
                href={`https://www.google.com/maps/search/${encodeURIComponent(formData.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-link"
              >
                🗺️ 在 Google Maps 中查看
              </a>
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
