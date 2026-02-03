const STORAGE_KEY = 'travelmaker_trips'

export const loadTrips = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load trips from localStorage:', error)
    return []
  }
}

export const saveTrips = (trips) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
    return true
  } catch (error) {
    console.error('Failed to save trips to localStorage:', error)
    return false
  }
}

export const clearTrips = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Failed to clear trips from localStorage:', error)
    return false
  }
}
