import { useState, useEffect } from 'react'
import TripInitForm from './components/TripInitForm'
import TripItinerary from './components/TripItinerary'
import TripList from './components/TripList'
import { loadTrips, saveTrips } from './utils/localStorage'
import './App.css'

function App() {
  const [trips, setTrips] = useState([])
  const [currentTrip, setCurrentTrip] = useState(null)
  const [view, setView] = useState('list') // 'list', 'init', 'itinerary'

  useEffect(() => {
    const savedTrips = loadTrips()
    setTrips(savedTrips)
  }, [])

  useEffect(() => {
    saveTrips(trips)
  }, [trips])

  const handleCreateTrip = (tripData) => {
    const newTrip = {
      id: Date.now(),
      ...tripData,
      itinerary: {},
      createdAt: new Date().toISOString()
    }
    setTrips([...trips, newTrip])
    setCurrentTrip(newTrip)
    setView('itinerary')
  }

  const handleSelectTrip = (trip) => {
    setCurrentTrip(trip)
    setView('itinerary')
  }

  const handleUpdateTrip = (updatedTrip) => {
    setTrips(trips.map(t => t.id === updatedTrip.id ? updatedTrip : t))
    setCurrentTrip(updatedTrip)
  }

  const handleDeleteTrip = (tripId) => {
    setTrips(trips.filter(t => t.id !== tripId))
    if (currentTrip?.id === tripId) {
      setCurrentTrip(null)
      setView('list')
    }
  }

  const handleBack = () => {
    setView('list')
    setCurrentTrip(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <h1>🌍 TravelMaker</h1>
          <p>專屬於你的旅遊規劃助手</p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {view === 'list' && (
            <TripList
              trips={trips}
              onSelectTrip={handleSelectTrip}
              onDeleteTrip={handleDeleteTrip}
              onCreateNew={() => setView('init')}
            />
          )}

          {view === 'init' && (
            <TripInitForm
              onSubmit={handleCreateTrip}
              onCancel={() => setView('list')}
            />
          )}

          {view === 'itinerary' && currentTrip && (
            <TripItinerary
              trip={currentTrip}
              onUpdate={handleUpdateTrip}
              onBack={handleBack}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>&copy; 2026 TravelMaker. 讓旅遊規劃變得更簡單。</p>
        </div>
      </footer>
    </div>
  )
}

export default App
