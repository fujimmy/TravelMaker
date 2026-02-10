import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import ActivityForm from './ActivityForm'
import './TripItinerary.css'

function TripItinerary({ trip, onUpdate, onBack }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingActivity, setEditingActivity] = useState(null)
  const [showActivityForm, setShowActivityForm] = useState(false)

  // Generate date range
  const dateRange = eachDayOfInterval({
    start: parseISO(trip.startDate),
    end: parseISO(trip.endDate)
  })

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

      <div className="itinerary-content">
        {dateRange.map((date, dayIndex) => {
          const activities = getActivitiesForDate(date)
          const dateStr = format(date, 'yyyy-MM-dd')

          return (
            <div key={dateStr} className="day-section">
              <div className="day-header">
                <div className="day-info">
                  <h3>Day {dayIndex + 1}</h3>
                  <span className="day-date">{format(date, 'yyyy/MM/dd (E)')}</span>
                </div>
                <div className="day-summary">
                  <span className="day-cost">💰 NT$ {getTotalCostForDate(date).toLocaleString()}</span>
                  <button 
                    className="btn btn-small btn-primary"
                    onClick={() => handleAddActivity(date)}
                  >
                    + 新增活動
                  </button>
                </div>
              </div>

              <DragDropContext onDragEnd={(result) => handleDragEnd(result, date)}>
                <Droppable droppableId={dateStr}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`activities-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                    >
                      {activities.length === 0 ? (
                        <div className="empty-activities">
                          <p>尚無活動，點擊上方按鈕新增</p>
                        </div>
                      ) : (
                        activities.map((activity, activityIndex) => (
                          <Draggable
                            key={`${dateStr}-${activityIndex}`}
                            draggableId={`${dateStr}-${activityIndex}`}
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
                                    onClick={() => handleEditActivity(date, activityIndex)}
                                    title="編輯"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="btn-icon"
                                    onClick={() => handleDeleteActivity(date, activityIndex)}
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
          )
        })}
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
    </div>
  )
}

export default TripItinerary
