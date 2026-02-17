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

const LOCATION_IMAGE_KEY = 'travelmaker_location_images'

export const saveLocationImage = (locationName, imageBase64) => {
  try {
    const images = JSON.parse(localStorage.getItem(LOCATION_IMAGE_KEY) || '{}')
    images[locationName] = imageBase64
    localStorage.setItem(LOCATION_IMAGE_KEY, JSON.stringify(images))
    return true
  } catch (error) {
    console.error('Failed to save location image:', error)
    return false
  }
}

export const loadLocationImage = (locationName) => {
  try {
    const images = JSON.parse(localStorage.getItem(LOCATION_IMAGE_KEY) || '{}')
    return images[locationName] || null
  } catch (error) {
    console.error('Failed to load location image:', error)
    return null
  }
}
