import React, { useState, useEffect } from 'react'
import { getLocalCurrency, getExchangeRate, getCurrencyInfo, getAmountDisplay } from '../utils/currencyUtils'
import './AIItinerarySuggestions.css'

function AIItinerarySuggestions({ suggestions, trip, onAdd, onCancel, loading = false }) {
  const [selectedActivities, setSelectedActivities] = useState(new Set())
  const [expandedDays, setExpandedDays] = useState(new Set([0]))
  const [localCurrency, setLocalCurrency] = useState({ code: 'TWD', symbol: 'NT$', name: '台幣' })
  const [exchangeRate, setExchangeRate] = useState(1)
  const [rateLoading, setRateLoading] = useState(true)

  useEffect(() => {
    console.log('[AIItinerarySuggestions] Component loaded with suggestions:', suggestions)
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      console.log('[AIItinerarySuggestions] Expanding first day')
      setExpandedDays(new Set([0]))
    }
  }, [suggestions])

  // 獲取當地貨幣和匯率
  useEffect(() => {
    async function fetchCurrencyInfo() {
      if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) return
      
      // 優先使用 AI 回傳的完整貨幣資訊
      const firstDay = suggestions[0]
      let currency
      
      if (firstDay?.currency_symbol && firstDay?.currency_name) {
        // AI 已經提供了完整的貨幣資訊（包含符號和名稱）
        currency = {
          code: firstDay.local_currency || 'TWD',
          symbol: firstDay.currency_symbol,
          name: firstDay.currency_name
        }
        console.log('[AIItinerarySuggestions] Using AI-provided full currency info:', currency)
      } else if (firstDay?.local_currency) {
        // AI 只提供了貨幣代碼，需要查詢符號
        currency = getCurrencyInfo(firstDay.local_currency)
        console.log('[AIItinerarySuggestions] Using AI currency code with lookup:', currency)
      } else {
        // 備用方案：從地點判斷
        currency = trip?.location ? getLocalCurrency(trip.location) : { code: 'TWD', symbol: 'NT$', name: '台幣' }
        console.log('[AIItinerarySuggestions] Using location-based currency:', currency)
      }
      
      setLocalCurrency(currency)
      
      if (currency.code !== 'TWD') {
        setRateLoading(true)
        try {
          const rate = await getExchangeRate(currency.code, 'TWD')
          setExchangeRate(rate)
        } catch (error) {
          console.error('Failed to fetch exchange rate:', error)
        } finally {
          setRateLoading(false)
        }
      } else {
        setExchangeRate(1)
        setRateLoading(false)
      }
    }
    
    fetchCurrencyInfo()
  }, [suggestions, trip?.location])

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
    const activities = Array.isArray(day.activities) ? day.activities : []
    const dayActivityKeys = activities.map((_, idx) => `${dayIndex}-${idx}`)
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
      const activities = Array.isArray(dayPlan.activities) ? dayPlan.activities : []
      activities.forEach((activity, activityIndex) => {
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
    let totalLocal = 0
    suggestions.forEach((dayPlan, dayIndex) => {
      const activities = Array.isArray(dayPlan.activities) ? dayPlan.activities : []
      activities.forEach((activity, activityIndex) => {
        const key = `${dayIndex}-${activityIndex}`
        if (selectedActivities.has(key)) {
          totalLocal += activity.cost || 0
        }
      })
    })
    const totalTWD = Math.round(totalLocal * exchangeRate)
    return { totalLocal, totalTWD }
  }

  const totalCost = getTotalCost()

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
        ) : !suggestions || !Array.isArray(suggestions) || suggestions.length === 0 ? (
          <div className="error-state">
            <p>⚠️ 无法加载行程建议</p>
            <p style={{fontSize: '12px', color: '#999', marginTop: '10px'}}>
              suggestions: {suggestions ? '存在' : '不存在'}, 
              是数组: {Array.isArray(suggestions) ? '是' : '否'},
              长度: {Array.isArray(suggestions) ? suggestions.length : '不适用'}
            </p>
          </div>
        ) : (
          <>
            <div className="suggestions-list">
              {suggestions.map((dayPlan, dayIndex) => {
                console.log('[AIItinerarySuggestions] Rendering day', dayIndex + 1, dayPlan)
                const activities = Array.isArray(dayPlan.activities) ? dayPlan.activities : []
                return (
                  <div key={dayIndex} className="day-plan-section">
                    <div 
                      className="day-plan-header"
                      onClick={() => toggleDayExpand(dayIndex)}
                    >
                      <div className="day-plan-title">
                        <span className="day-number">Day {dayIndex + 1}</span>
                        <span className="day-date">{dayPlan.date}</span>
                        <span className="activity-count">{activities.length} 个活动</span>
                      </div>
                      <div className="day-plan-actions">
                        <label className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={activities.length > 0 && activities.every((_, idx) => 
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
                        {activities.length === 0 ? (
                          <div className="empty-activities">暂无推荐活动</div>
                        ) : (
                          activities.map((activity, activityIndex) => {
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
                                    <h4 className="activity-title">{activity.content}</h4>
                                  </div>
                                  <div className="activity-meta">
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
                                      <span className="cost-label">费用</span>
                                      <span className="cost-value-local">{getAmountDisplay(activity.cost || 0, localCurrency, exchangeRate).local}</span>
                                      {localCurrency.code !== 'TWD' && !rateLoading && (
                                        <span className="cost-value-twd">≈ {getAmountDisplay(activity.cost || 0, localCurrency, exchangeRate).twd}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="suggestions-footer">
              <div className="cost-summary">
                <div className="cost-summary-header">
                  <span>已选择费用总计：</span>
                  {localCurrency.code !== 'TWD' && !rateLoading && (
                    <span className="exchange-rate-info">匯率: 1 {localCurrency.code} ≈ {exchangeRate.toFixed(2)} TWD</span>
                  )}
                </div>
                <div className="total-costs">
                  <span className="total-cost-local">{getAmountDisplay(totalCost.totalLocal, localCurrency, exchangeRate).local}</span>
                  {localCurrency.code !== 'TWD' && !rateLoading && (
                    <span className="total-cost-twd">≈ {getAmountDisplay(totalCost.totalLocal, localCurrency, exchangeRate).twd}</span>
                  )}
                </div>
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
