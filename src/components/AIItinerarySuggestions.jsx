import React, { useState } from 'react'
import './AIItinerarySuggestions.css'

function AIItinerarySuggestions({ suggestions, trip, onAdd, onCancel, loading = false }) {
  const [selectedActivities, setSelectedActivities] = useState(new Set())
  const [expandedDays, setExpandedDays] = useState(new Set([0]))

  const toggleDayExpand = (dayIndex) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayIndex)) {
      newExpanded.delete(dayIndex)
    } else {
      newExpanded.add(dayIndex)
    }
    setExpandedDays(newExpanded)
  }

  const toggleActivitySelection = (dayIndex, activityIndex) => {
    const key = `${dayIndex}-${activityIndex}`
    const newSelected = new Set(selectedActivities)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedActivities(newSelected)
  }

  const toggleSelectAllDay = (dayIndex) => {
    const day = suggestions[dayIndex]
    if (!day) return

    const newSelected = new Set(selectedActivities)
    const dayActivityKeys = day.activities.map((_, idx) => `${dayIndex}-${idx}`)
    const allSelected = dayActivityKeys.every(key => newSelected.has(key))

    dayActivityKeys.forEach(key => {
      if (allSelected) {
        newSelected.delete(key)
      } else {
        newSelected.add(key)
      }
    })
    setSelectedActivities(newSelected)
  }

  const handleAddSelected = () => {
    const activitiesToAdd = []
    suggestions.forEach((dayPlan, dayIndex) => {
      dayPlan.activities.forEach((activity, activityIndex) => {
        const key = `${dayIndex}-${activityIndex}`
        if (selectedActivities.has(key)) {
          activitiesToAdd.push({
            date: dayPlan.date,
            activity: activity
          })
        }
      })
    })
    onAdd(activitiesToAdd)
  }

  const getTotalCost = () => {
    let total = 0
    suggestions.forEach((dayPlan, dayIndex) => {
      dayPlan.activities.forEach((activity, activityIndex) => {
        const key = `${dayIndex}-${activityIndex}`
        if (selectedActivities.has(key)) {
          total += activity.cost || 0
        }
      })
    })
    return total
  }

  return (
    <div className="ai-suggestions-overlay" onClick={onCancel}>
      <div className="ai-suggestions-content" onClick={(e) => e.stopPropagation()}>
        <div className="ai-suggestions-header">
          <h2>🤖 AI 推荐行程</h2>
          <p>选择你想要添加的活动</p>
          <button className="btn-close" onClick={onCancel}>✕</button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>正在生成行程建议...</p>
          </div>
        ) : (
          <>
            <div className="suggestions-list">
              {suggestions.map((dayPlan, dayIndex) => (
                <div key={dayIndex} className="day-plan-section">
                  <div 
                    className="day-plan-header"
                    onClick={() => toggleDayExpand(dayIndex)}
                  >
                    <div className="day-plan-title">
                      <span className="day-number">Day {dayIndex + 1}</span>
                      <span className="day-date">{dayPlan.date}</span>
                      <span className="activity-count">{dayPlan.activities.length} 个活动</span>
                    </div>
                    <div className="day-plan-actions">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={dayPlan.activities.every((_, idx) => 
                            selectedActivities.has(`${dayIndex}-${idx}`)
                          )}
                          onChange={() => toggleSelectAllDay(dayIndex)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>全选</span>
                      </label>
                      <span className="expand-icon">
                        {expandedDays.has(dayIndex) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {expandedDays.has(dayIndex) && (
                    <div className="activities-container">
                      {dayPlan.activities.map((activity, activityIndex) => {
                        const key = `${dayIndex}-${activityIndex}`
                        const isSelected = selectedActivities.has(key)

                        return (
                          <div 
                            key={activityIndex}
                            className={`suggestion-activity ${isSelected ? 'selected' : ''}`}
                          >
                            <label className="activity-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleActivitySelection(dayIndex, activityIndex)}
                              />
                            </label>

                            <div className="activity-details">
                              <div className="activity-header-info">
                                <span className="time">{activity.startTime} - {activity.endTime}</span>
                                <span className="category">{activity.category}</span>
                              </div>
                              <h4 className="activity-title">{activity.content}</h4>
                              {activity.location && (
                                <div className="activity-location">
                                  <span className="location-icon">📍</span>
                                  <span>{activity.location}</span>
                                </div>
                              )}
                              {activity.notes && (
                                <div className="activity-notes">
                                  <span className="notes-icon">📝</span>
                                  <span>{activity.notes}</span>
                                </div>
                              )}
                              <div className="activity-cost">
                                <span className="cost-label">预估费用：</span>
                                <span className="cost-value">NT$ {(activity.cost || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="suggestions-footer">
              <div className="cost-summary">
                <span>已选择费用总计：</span>
                <span className="total-cost">NT$ {getTotalCost().toLocaleString()}</span>
              </div>
              <div className="footer-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={onCancel}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleAddSelected}
                  disabled={selectedActivities.size === 0}
                >
                  添加选中的活动 ({selectedActivities.size})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AIItinerarySuggestions
