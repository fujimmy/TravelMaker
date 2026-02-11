import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import ActivityForm from './ActivityForm'
import AIItinerarySuggestions from './AIItinerarySuggestions'
import CachedSuggestions from './CachedSuggestions'
import { generateItineraryWithAI, getCachedItineraries } from '../utils/geminiApi'
import './TripItinerary.css'

function TripItinerary({ trip, onUpdate, onBack }) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [showCachedSuggestions, setShowCachedSuggestions] = useState(false)
  const [aiSuggestions, setAISuggestions] = useState([])
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState(null)
  const [hasCachedData, setHasCachedData] = useState(false)

  // Generate date range
  const dateRange = eachDayOfInterval({
    start: parseISO(trip.startDate),
    end: parseISO(trip.endDate)
  })

  const currentDate = dateRange[currentDayIndex]
  const currentDateStr = format(currentDate, 'yyyy-MM-dd')

  const getActivitiesForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return trip.itinerary[dateStr] || []
  }

  const handleAddActivity = (date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'))
    setEditingActivity(null)
    setShowActivityForm(true)
  }

  const handleEditActivity = (date, activityIndex) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateStr)
    setEditingActivity({ ...trip.itinerary[dateStr][activityIndex], index: activityIndex })
    setShowActivityForm(true)
  }

  const handleSaveActivity = (activityData) => {
    const updatedItinerary = { ...trip.itinerary }
    
    if (!updatedItinerary[selectedDate]) {
      updatedItinerary[selectedDate] = []
    }

    if (editingActivity !== null) {
      // Edit existing activity
      updatedItinerary[selectedDate][editingActivity.index] = activityData
    } else {
      // Add new activity
      updatedItinerary[selectedDate].push(activityData)
    }

    onUpdate({ ...trip, itinerary: updatedItinerary })
    setShowActivityForm(false)
    setEditingActivity(null)
  }

  const handleDeleteActivity = (date, activityIndex) => {
    if (!window.confirm('確定要刪除此活動嗎？')) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const updatedItinerary = { ...trip.itinerary }
    updatedItinerary[dateStr] = updatedItinerary[dateStr].filter((_, idx) => idx !== activityIndex)
    
    if (updatedItinerary[dateStr].length === 0) {
      delete updatedItinerary[dateStr]
    }

    onUpdate({ ...trip, itinerary: updatedItinerary })
  }

  const handleDragEnd = (result, date) => {
    if (!result.destination) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const activities = Array.from(trip.itinerary[dateStr] || [])
    const [removed] = activities.splice(result.source.index, 1)
    activities.splice(result.destination.index, 0, removed)

    const updatedItinerary = { ...trip.itinerary }
    updatedItinerary[dateStr] = activities

    onUpdate({ ...trip, itinerary: updatedItinerary })
  }

  const getTotalCostForDate = (date) => {
    const activities = getActivitiesForDate(date)
    return activities.reduce((sum, activity) => sum + (parseFloat(activity.cost) || 0), 0)
  }

  const getTotalCost = () => {
    let total = 0
    Object.values(trip.itinerary).forEach(activities => {
      activities.forEach(activity => {
        total += parseFloat(activity.cost) || 0
      })
    })
    return total
  }

  const getCategoryBreakdown = () => {
    const breakdown = {}
    Object.values(trip.itinerary).forEach(activities => {
      activities.forEach(activity => {
        const category = activity.category || '其他'
        const cost = parseFloat(activity.cost) || 0
        if (!breakdown[category]) {
          breakdown[category] = 0
        }
        breakdown[category] += cost
      })
    })
    return breakdown
  }

  const categoryBreakdown = getCategoryBreakdown()

  const handleGenerateAISuggestions = async () => {
    try {
      setAILoading(true)
      setAIError(null)
      
      // 收集现有活动作为参考
      const existingActivities = []
      Object.entries(trip.itinerary).forEach(([date, activities]) => {
        activities.forEach(activity => {
          existingActivities.push(activity)
        })
      })

      const result = await generateItineraryWithAI(
        trip.location,
        trip.startDate,
        trip.endDate,
        existingActivities,
        true // 使用缓存
      )
      
      setAISuggestions(result.itinerary)
      
      // 如果是从缓存获取，显示提示信息
      if (result.fromCache) {
        setAIError('📦 这是之前为此地点生成的行程建议（已缓存）')
      }
      
      setShowAISuggestions(true)
    } catch (error) {
      console.error('Error generating AI suggestions:', error)
      setAIError(error.message || '生成行程建议失败，请稍后重试')
    } finally {
      setAILoading(false)
    }
  }

  const handleShowCachedSuggestions = () => {
    const cached = getCachedItineraries()
    setHasCachedData(cached.length > 0)
    setShowCachedSuggestions(true)
  }

  const handleSelectCachedSuggestion = async (cachedItem) => {
    try {
      setAILoading(true)
      setShowCachedSuggestions(false)
      
      // 从缓存加载建议
      const cacheKey = cachedItem.cacheKey
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        setAISuggestions(data.itinerary)
        setShowAISuggestions(true)
        setAIError('📦 已加载缓存的行程建议')
      }
    } catch (error) {
      console.error('Error loading cached suggestion:', error)
      setAIError('加载缓存失败，请重试')
    } finally {
      setAILoading(false)
    }
  }

  const handleAddAISuggestions = (activitiesToAdd) => {
    const updatedItinerary = { ...trip.itinerary }

    activitiesToAdd.forEach(({ date, activity }) => {
      if (!updatedItinerary[date]) {
        updatedItinerary[date] = []
      }
      updatedItinerary[date].push(activity)
    })

    onUpdate({ ...trip, itinerary: updatedItinerary })
    setShowAISuggestions(false)
    setAISuggestions([])
  }

  return (
    <div className="trip-itinerary">
      <div className="itinerary-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <div className="trip-title">
          <h2>{trip.location}</h2>
          <p>{trip.startDate} ~ {trip.endDate}</p>
        </div>
        <div className="trip-summary">
          <div className="summary-item">
            <span className="summary-label">總預算</span>
            <span className="summary-value">NT$ {getTotalCost().toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="category-breakdown">
        <h3>金額統計</h3>
        <div className="breakdown-cards">
          {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([category, cost]) => (
            <div key={category} className="breakdown-card">
              <div className="card-category">{category}</div>
              <div className="card-cost">NT$ {cost.toLocaleString()}</div>
            </div>
          ))}
          <div className="breakdown-card total">
            <div className="card-category">合計</div>
            <div className="card-cost">NT$ {getTotalCost().toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="ai-suggestions-banner">
        <div className="ai-buttons-group">
          <button 
            className="btn btn-ai"
            onClick={handleGenerateAISuggestions}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <span className="loading-spinner"></span>
                生成中...
              </>
            ) : (
              <>
                🤖 AI 智能推荐行程
              </>
            )}
          </button>
          <button 
            className="btn btn-ai-cached"
            onClick={handleShowCachedSuggestions}
            title="查看之前保存的行程建议"
          >
            📋 查看缓存
          </button>
        </div>
        {aiError && (
          <div className={`ai-message ${aiError.includes('📦') ? 'ai-info' : 'ai-error'}`}>
            {aiError}
          </div>
        )}
      </div>

      <div className="day-navigator">
        <button 
          className="btn-nav btn-prev"
          onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
          disabled={currentDayIndex === 0}
        >
          ← 上一天
        </button>
        
        <div className="day-selector">
          <h2>Day {currentDayIndex + 1}</h2>
          <p>{format(currentDate, 'yyyy/MM/dd (E)')}</p>
          <div className="day-dots">
            {dateRange.map((_, idx) => (
              <button
                key={idx}
                className={`dot ${idx === currentDayIndex ? 'active' : ''}`}
                onClick={() => setCurrentDayIndex(idx)}
                title={`Day ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <button 
          className="btn-nav btn-next"
          onClick={() => setCurrentDayIndex(Math.min(dateRange.length - 1, currentDayIndex + 1))}
          disabled={currentDayIndex === dateRange.length - 1}
        >
          下一天 →
        </button>
      </div>

      <div className="itinerary-content">
        <div className="day-section">
          <div className="day-header">
            <div className="day-info">
              <h3>Day {currentDayIndex + 1}</h3>
              <span className="day-date">{format(currentDate, 'yyyy/MM/dd (EEEE)')}</span>
              <span className="day-cost-header">💰 NT$ {getTotalCostForDate(currentDate).toLocaleString()}</span>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => handleAddActivity(currentDate)}
            >
              + 新增活動
            </button>
          </div>

          <DragDropContext onDragEnd={(result) => handleDragEnd(result, currentDate)}>
            <Droppable droppableId={currentDateStr}>
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`activities-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                >
                  {getActivitiesForDate(currentDate).length === 0 ? (
                    <div className="empty-activities">
                      <p>尚無活動，點擊上方按鈕新增</p>
                    </div>
                  ) : (
                    getActivitiesForDate(currentDate).map((activity, activityIndex) => (
                      <Draggable
                        key={`${currentDateStr}-${activityIndex}`}
                        draggableId={`${currentDateStr}-${activityIndex}`}
                        index={activityIndex}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`activity-card ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div className="activity-header">
                              <div className="activity-time">
                                <span className="time-icon">🕐</span>
                                <span>{activity.startTime} - {activity.endTime}</span>
                              </div>
                              <div className="activity-category">
                                {activity.category}
                              </div>
                            </div>

                            <div className="activity-body">
                              {activity.location && (
                                <div className="activity-location">
                                  <span className="location-icon">📍</span>
                                  <span>{activity.location}</span>
                                  <a 
                                    href={`https://www.google.com/maps/search/${encodeURIComponent(activity.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="maps-link-small"
                                    title="在 Google Maps 中查看"
                                  >
                                    🗺️
                                  </a>
                                </div>
                              )}
                              
                              <div className="activity-content">
                                {activity.content}
                              </div>

                              {activity.notes && (
                                <div className="activity-notes">
                                  <span className="notes-icon">📝</span>
                                  <span>{activity.notes}</span>
                                </div>
                              )}

                              <div className="activity-cost">
                                <span className="cost-label">費用：</span>
                                <span className="cost-value">NT$ {parseFloat(activity.cost || 0).toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="activity-actions">
                              <button
                                className="btn-icon"
                                onClick={() => handleEditActivity(currentDate, activityIndex)}
                                title="編輯"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => handleDeleteActivity(currentDate, activityIndex)}
                                title="刪除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {showActivityForm && (
        <ActivityForm
          activity={editingActivity}
          onSave={handleSaveActivity}
          onCancel={() => {
            setShowActivityForm(false)
            setEditingActivity(null)
          }}
        />
      )}

      {showAISuggestions && (
        <AIItinerarySuggestions
          suggestions={aiSuggestions}
          trip={trip}
          onAdd={handleAddAISuggestions}
          onCancel={() => setShowAISuggestions(false)}
          loading={aiLoading}
        />
      )}

      {showCachedSuggestions && (
        <CachedSuggestions
          onSelectCache={handleSelectCachedSuggestion}
          onCancel={() => setShowCachedSuggestions(false)}
        />
      )}
    </div>
  )
}

export default TripItinerary
