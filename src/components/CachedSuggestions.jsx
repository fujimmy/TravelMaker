import React from 'react'
import { format } from 'date-fns'
import { getCachedItineraries, clearCacheItinerary } from '../utils/geminiApi'
import './CachedSuggestions.css'

function CachedSuggestions({ onSelectCache, onCancel }) {
  const [cachedItineraries, setCachedItineraries] = React.useState([])

  React.useEffect(() => {
    const cached = getCachedItineraries()
    // 按时间排序，最新的在前
    cached.sort((a, b) => b.timestamp - a.timestamp)
    setCachedItineraries(cached)
  }, [])

  const handleDelete = (cacheKey, e) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个缓存吗？')) {
      clearCacheItinerary(cacheKey)
      setCachedItineraries(cachedItineraries.filter(item => item.cacheKey !== cacheKey))
    }
  }

  const formatDate = (timestamp) => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm')
  }

  if (cachedItineraries.length === 0) {
    return (
      <div className="cached-suggestions-overlay" onClick={onCancel}>
        <div className="cached-suggestions-content" onClick={(e) => e.stopPropagation()}>
          <div className="cached-suggestions-header">
            <h2>📋 缓存的行程</h2>
            <button className="btn-close" onClick={onCancel}>✕</button>
          </div>
          <div className="empty-state">
            <p>暂无缓存的行程建议</p>
            <small>当你生成过行程建议后，会在这里显示</small>
          </div>
          <div className="cached-footer">
            <button className="btn btn-secondary" onClick={onCancel}>
              关闭
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cached-suggestions-overlay" onClick={onCancel}>
      <div className="cached-suggestions-content" onClick={(e) => e.stopPropagation()}>
        <div className="cached-suggestions-header">
          <div>
            <h2>📋 缓存的行程</h2>
            <p>点击选择或生成新的行程建议</p>
          </div>
          <button className="btn-close" onClick={onCancel}>✕</button>
        </div>

        <div className="cached-list">
          {cachedItineraries.map((item) => (
            <div 
              key={item.cacheKey}
              className="cached-item"
              onClick={() => onSelectCache(item)}
            >
              <div className="cached-item-main">
                <div className="cached-location">
                  <span className="location-icon">📍</span>
                  <span className="location-name">{item.location}</span>
                </div>
                <div className="cached-dates">
                  <span className="date-range">
                    {item.startDate} ~ {item.endDate}
                  </span>
                  <span className="cached-time">
                    缓存于 {formatDate(item.timestamp)}
                  </span>
                </div>
              </div>
              <button
                className="btn-delete"
                onClick={(e) => handleDelete(item.cacheKey, e)}
                title="删除此缓存"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="cached-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default CachedSuggestions
