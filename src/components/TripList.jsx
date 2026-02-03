import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import './TripList.css'

function TripList({ trips, onSelectTrip, onDeleteTrip, onCreateNew }) {
  const sortedTrips = [...trips].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  )

  const handleDelete = (e, tripId) => {
    e.stopPropagation()
    if (window.confirm('確定要刪除此行程嗎？')) {
      onDeleteTrip(tripId)
    }
  }

  return (
    <div className="trip-list">
      <div className="trip-list-header">
        <h2>我的旅遊行程</h2>
        <button className="btn btn-primary" onClick={onCreateNew}>
          + 新增行程
        </button>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>還沒有任何行程</h3>
          <p>點擊上方按鈕開始規劃你的第一個旅程吧！</p>
        </div>
      ) : (
        <div className="trip-grid">
          {sortedTrips.map(trip => (
            <div 
              key={trip.id} 
              className="trip-card"
              onClick={() => onSelectTrip(trip)}
            >
              <div className="trip-card-header">
                <h3>{trip.location}</h3>
                <button 
                  className="btn-delete"
                  onClick={(e) => handleDelete(e, trip.id)}
                  title="刪除行程"
                >
                  🗑️
                </button>
              </div>
              <div className="trip-card-body">
                <div className="trip-info">
                  <span className="trip-icon">📅</span>
                  <span>{trip.startDate} ~ {trip.endDate}</span>
                </div>
                <div className="trip-info">
                  <span className="trip-icon">👥</span>
                  <span>{trip.participants.length} 人</span>
                </div>
                <div className="trip-participants">
                  {trip.participants.map((name, idx) => (
                    <span key={idx} className="participant-tag">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TripList
