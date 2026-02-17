import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import ActivityForm from './ActivityForm'
import AIItinerarySuggestions from './AIItinerarySuggestions'
import CachedSuggestions from './CachedSuggestions'
import { generateItineraryWithAI, getCachedItineraries } from '../utils/geminiApi'
import { saveLocationImage, loadLocationImage } from '../utils/localStorage'
import { getLocalCurrency, getExchangeRate, getCurrencyInfo } from '../utils/currencyUtils'
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
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [locationImage, setLocationImage] = useState(null)
  const [localCurrency, setLocalCurrency] = useState({ code: 'TWD', symbol: 'NT$', name: '台幣' })
  const [exchangeRate, setExchangeRate] = useState(1)
  const fileInputRef = useRef(null)

  const createActivityId = () => `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Load location image from localStorage
  useEffect(() => {
    const savedImage = loadLocationImage(trip.location)
    if (savedImage) {
      setLocationImage(savedImage)
    }
  }, [trip.location])

  // 獲取並設置當地貨幣和匯率
  useEffect(() => {
    async function fetchCurrencyInfo() {
      let currency
      
      // 優先使用 trip 中保存的貨幣資訊（從 AI 建議加入時保存）
      if (trip.currency_symbol && trip.currency_name) {
        currency = {
          code: trip.local_currency || 'TWD',
          symbol: trip.currency_symbol,
          name: trip.currency_name
        }
      } else if (trip.local_currency) {
        currency = getCurrencyInfo(trip.local_currency)
      } else {
        // 備用：從地點判斷
        currency = getLocalCurrency(trip.location)
      }
      
      setLocalCurrency(currency)
      
      // 獲取匯率
      if (currency.code !== 'TWD') {
        try {
          const rate = await getExchangeRate(currency.code, 'TWD')
          setExchangeRate(rate)
        } catch (error) {
          console.error('Failed to fetch exchange rate:', error)
          setExchangeRate(1)
        }
      } else {
        setExchangeRate(1)
      }
    }
    
    fetchCurrencyInfo()
  }, [trip.location, trip.local_currency, trip.currency_symbol, trip.currency_name])

  useEffect(() => {
    let needsUpdate = false
    const updatedItinerary = {}

    Object.entries(trip.itinerary || {}).forEach(([dateKey, activities]) => {
      updatedItinerary[dateKey] = (activities || []).map(activity => {
        if (activity?.id) return activity
        needsUpdate = true
        return { ...activity, id: createActivityId() }
      })
    })

    if (needsUpdate) {
      onUpdate({ ...trip, itinerary: updatedItinerary })
    }
  }, [trip, onUpdate])

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
    const activityWithId = {
      ...activityData,
      id: activityData.id || editingActivity?.id || createActivityId()
    }
    
    if (!updatedItinerary[selectedDate]) {
      updatedItinerary[selectedDate] = []
    }

    if (editingActivity !== null) {
      // Edit existing activity
      updatedItinerary[selectedDate][editingActivity.index] = activityWithId
    } else {
      // Add new activity
      updatedItinerary[selectedDate].push(activityWithId)
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
    const originalActivities = trip.itinerary[dateStr] || []
    const activities = originalActivities.map(activity => ({ ...activity }))
    const timeSlots = originalActivities.map(activity => ({
      startTime: activity.startTime,
      endTime: activity.endTime
    }))
    const sourceIndex = result.source.index
    const destinationIndex = result.destination.index

    if (sourceIndex === destinationIndex) return

    const [removed] = activities.splice(sourceIndex, 1)
    activities.splice(destinationIndex, 0, removed)

    activities.forEach((activity, index) => {
      const slot = timeSlots[index]
      if (!slot) return
      activity.startTime = slot.startTime
      activity.endTime = slot.endTime
    })

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
      
      // 计算旅游天数
      const dayCount = dateRange.length
      
      // 如果超过 10 天，显示警告
      if (dayCount > 10) {
        const confirmed = window.confirm(
          `您的行程共 ${dayCount} 天，生成的内容可能较长。\n\n建议：\n- 10 天以内效果最佳\n- 超过 10 天可能需要多次生成\n\n是否继续生成？`
        )
        if (!confirmed) {
          setAILoading(false)
          return
        }
      }
      
      console.log('[TripItinerary] Generating AI suggestions for:', trip.location)
      
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
      
      console.log('[TripItinerary] Received AI suggestions:', result.itinerary)
      console.log('[TripItinerary] Setting aiSuggestions and showing modal')
      
      setAISuggestions(result.itinerary)
      setShowAISuggestions(true)
      
      // 如果是从缓存获取，显示提示信息
      if (result.fromCache) {
        setAIError('📦 这是之前为此地点生成的行程建议（已缓存）')
      }
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
      updatedItinerary[date].push({
        ...activity,
        id: activity.id || createActivityId()
      })
    })

    // 從 AI suggestions 中提取貨幣資訊並保存到 trip
    const firstSuggestion = aiSuggestions[0]
    const updatedTrip = { ...trip, itinerary: updatedItinerary }
    
    if (firstSuggestion?.currency_symbol && firstSuggestion?.currency_name) {
      updatedTrip.local_currency = firstSuggestion.local_currency
      updatedTrip.currency_symbol = firstSuggestion.currency_symbol
      updatedTrip.currency_name = firstSuggestion.currency_name
      updatedTrip.location_emoji = firstSuggestion.location_emoji
    }

    onUpdate(updatedTrip)
    setShowAISuggestions(false)
    setAISuggestions([])
  }

  const getLocationEmoji = (location) => {
    if (!location) return '📍'
    
    const loc = location.toLowerCase()
    
    // 使用簡單的關鍵字匹配，而不是維護龐大的映射表
    // 國家標誌
    if (loc.includes('日本') || loc.includes('japan')) return '🇯🇵'
    if (loc.includes('韓') || loc.includes('korea')) return '🇰🇷'
    if (loc.includes('泰') || loc.includes('thailand')) return '🇹🇭'
    if (loc.includes('台灣') || loc.includes('taiwan')) return '🇹🇼'
    if (loc.includes('香港') || loc.includes('hong kong')) return '🇭🇰'
    if (loc.includes('新加坡') || loc.includes('singapore')) return '🇸🇬'
    if (loc.includes('美國') || loc.includes('usa') || loc.includes('america')) return '🇺🇸'
    if (loc.includes('法') || loc.includes('france')) return '🇫🇷'
    if (loc.includes('德') || loc.includes('germany')) return '🇩🇪'
    if (loc.includes('義') || loc.includes('italy')) return '🇮🇹'
    if (loc.includes('西班牙') || loc.includes('spain')) return '🇪🇸'
    if (loc.includes('英') || loc.includes('uk') || loc.includes('britain')) return '🇬🇧'
    if (loc.includes('荷蘭') || loc.includes('netherlands')) return '🇳🇱'
    if (loc.includes('瑞士') || loc.includes('switzerland')) return '🇨🇭'
    if (loc.includes('澳') || loc.includes('australia')) return '🇦🇺'
    if (loc.includes('加拿大') || loc.includes('canada')) return '🇨🇦'
    
    // 知名城市
    if (loc.includes('東京') || loc.includes('tokyo')) return '🗼'
    if (loc.includes('巴黎') || loc.includes('paris')) return '🗼'
    if (loc.includes('倫敦') || loc.includes('london')) return '🏰'
    if (loc.includes('紐約') || loc.includes('new york')) return '🗽'
    if (loc.includes('阿姆斯特丹') || loc.includes('amsterdam')) return '🌷'
    if (loc.includes('羅馬') || loc.includes('rome')) return '🏛️'
    if (loc.includes('威尼斯') || loc.includes('venice')) return '🚤'
    if (loc.includes('雪梨') || loc.includes('sydney')) return '🌉'
    if (loc.includes('杜拜') || loc.includes('dubai')) return '🏗️'
    if (loc.includes('首爾') || loc.includes('seoul')) return '🌆'
    if (loc.includes('曼谷') || loc.includes('bangkok')) return '🕌'
    
    // 預設
    return '📍'
  }

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUploadImage(file)
    }
  }

  const handleUploadImage = (file) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('檔案大小不能超過 5MB')
      return
    }

    setIsUploadingImage(true)
    const reader = new FileReader()

    reader.onload = (event) => {
      const base64String = event.target?.result
      if (base64String && typeof base64String === 'string') {
        // Save to localStorage
        saveLocationImage(trip.location, base64String)
        setLocationImage(base64String)
        setIsUploadingImage(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Show success message
        setUploadMessage('✅ 圖片上傳成功')
        setTimeout(() => {
          setUploadMessage('')
        }, 3000)
        console.log('圖片已上傳')
      }
    }

    reader.onerror = () => {
      alert('圖片上傳失敗，請重試')
      setIsUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className="trip-itinerary">
      <div 
        className="itinerary-banner"
        style={locationImage ? {
          backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.4) 100%), url('${locationImage}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        <span className="banner-location">{getLocationEmoji(trip.location)} {trip.location}</span>
        <span className="banner-daterange">{trip.startDate} ~ {trip.endDate}</span>
        <button
          className="btn-upload-banner"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingImage}
          title="上傳地點圖片"
        >
          {isUploadingImage ? '上傳中...' : '📷'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {uploadMessage && (
        <div className="upload-message">
          {uploadMessage}
        </div>
      )}

      <div className="itinerary-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <div className="trip-summary" style={{ marginLeft: 'auto' }}>
          <div className="summary-item">
            <span className="summary-label">總預算</span>
            <span className="summary-value">
              {localCurrency.code !== 'TWD' ? (
                <>
                  <span className="amount-primary">{localCurrency.symbol}{getTotalCost().toLocaleString()}</span>
                  <span className="amount-divider"> / </span>
                  <span className="amount-secondary">NT$ {Math.round(getTotalCost() * exchangeRate).toLocaleString()}</span>
                </>
              ) : (
                <span className="amount-primary">{localCurrency.symbol}{getTotalCost().toLocaleString()}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="category-breakdown">
        <h3>金額統計</h3>
        <div className="breakdown-cards">
          {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([category, cost]) => (
            <div key={category} className="breakdown-card">
              <div className="card-category">{category}</div>
              <div className="card-cost">
                {localCurrency.code !== 'TWD' ? (
                  <>
                    <span className="amount-primary">{localCurrency.symbol}{cost.toLocaleString()}</span>
                    <span className="amount-divider"> / </span>
                    <span className="amount-secondary">NT$ {Math.round(cost * exchangeRate).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="amount-primary">{localCurrency.symbol}{cost.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
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
              <span className="day-cost-header">
                💰 {localCurrency.code !== 'TWD' ? (
                  <>
                    <span className="amount-primary">{localCurrency.symbol}{getTotalCostForDate(currentDate).toLocaleString()}</span>
                    <span className="amount-divider"> / </span>
                    <span className="amount-secondary">NT$ {Math.round(getTotalCostForDate(currentDate) * exchangeRate).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="amount-primary">{localCurrency.symbol}{getTotalCostForDate(currentDate).toLocaleString()}</span>
                )}
              </span>
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
                        key={activity.id || `${currentDateStr}-${activityIndex}`}
                        draggableId={activity.id || `${currentDateStr}-${activityIndex}`}
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
                              <div className="activity-header-right">
                                <div className="activity-category">
                                  {activity.category}
                                </div>
                                {activity.location && (
                                  <a 
                                    href={`https://www.google.com/maps/search/${encodeURIComponent(activity.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="maps-link-small"
                                    title="在 Google Maps 中查看"
                                  >
                                    🗺️
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="activity-body">
                              {activity.location && (
                                <div className="activity-location">
                                  <span className="location-icon">📍</span>
                                  <span>{activity.location}</span>
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
                                {localCurrency.code !== 'TWD' ? (
                                  <span className="cost-value">
                                    <span className="amount-primary">{localCurrency.symbol}{parseFloat(activity.cost || 0).toLocaleString()}</span>
                                    <span className="amount-divider"> / </span>
                                    <span className="amount-secondary">NT$ {Math.round(parseFloat(activity.cost || 0) * exchangeRate).toLocaleString()}</span>
                                  </span>
                                ) : (
                                  <span className="cost-value">{localCurrency.symbol}{parseFloat(activity.cost || 0).toLocaleString()}</span>
                                )}
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

      <button 
        className="floating-add-activity-btn"
        onClick={() => handleAddActivity(currentDate)}
        title="新增活動"
      >
        + 新增活動
      </button>
    </div>
  )
}

export default TripItinerary
