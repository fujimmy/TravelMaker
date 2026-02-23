export function getDistanceKey(dateStr, activityIndex) {
  return `${dateStr}-${activityIndex}`
}

export function removeDistanceEntriesByDate(distanceMap, dateStr) {
  const next = { ...distanceMap }
  Object.keys(next).forEach(key => {
    if (key.startsWith(`${dateStr}-`)) {
      delete next[key]
    }
  })
  return next
}

export function calculateDistanceKm(coord1, coord2) {
  const toRadians = (degree) => (degree * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians(coord2.lat - coord1.lat)
  const deltaLng = toRadians(coord2.lng - coord1.lng)
  const lat1 = toRadians(coord1.lat)
  const lat2 = toRadians(coord2.lat)

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `約 ${Math.round(distanceKm * 1000)} 公尺`
  }
  if (distanceKm < 10) {
    return `約 ${distanceKm.toFixed(1)} 公里`
  }
  return `約 ${Math.round(distanceKm)} 公里`
}

export async function fetchCoordinates(location, cacheMap = new Map(), endpointBase = '/api/nominatim', tripLocation = null) {
  const normalizedLocation = location?.trim()?.toLowerCase()
  if (!normalizedLocation) return null

  if (cacheMap.has(normalizedLocation)) {
    return cacheMap.get(normalizedLocation)
  }

  try {
    // 第一次查詢：直接用地點名稱
    const response = await fetch(
      `${endpointBase}/search?format=json&limit=1&q=${encodeURIComponent(location)}`
    )

    if (!response.ok) {
      cacheMap.set(normalizedLocation, null)
      return null
    }

    const results = await response.json()
    const firstResult = Array.isArray(results) ? results[0] : null

    if (firstResult?.lat && firstResult?.lon) {
      const coord = {
        lat: parseFloat(firstResult.lat),
        lng: parseFloat(firstResult.lon)
      }
      cacheMap.set(normalizedLocation, coord)
      return coord
    }

    // 備用查詢：如果第一次失敗，嘗試加上目的地名稱
    if (tripLocation) {
      const fallbackQuery = `${location} ${tripLocation}`
      const normalizedFallback = fallbackQuery.toLowerCase()
      
      if (cacheMap.has(normalizedFallback)) {
        return cacheMap.get(normalizedFallback)
      }

      const fallbackResponse = await fetch(
        `${endpointBase}/search?format=json&limit=1&q=${encodeURIComponent(fallbackQuery)}`
      )

      if (fallbackResponse.ok) {
        const fallbackResults = await fallbackResponse.json()
        const fallbackResult = Array.isArray(fallbackResults) ? fallbackResults[0] : null

        if (fallbackResult?.lat && fallbackResult?.lon) {
          const coord = {
            lat: parseFloat(fallbackResult.lat),
            lng: parseFloat(fallbackResult.lon)
          }
          cacheMap.set(normalizedLocation, coord) // 用原始 location 快取，方便後續查詢
          return coord
        }
      }
    }

    // 兩次查詢都失敗
    cacheMap.set(normalizedLocation, null)
    return null
  } catch (error) {
    console.error('Failed to fetch coordinates:', error)
    cacheMap.set(normalizedLocation, null)
    return null
  }
}

export function getLocationEmoji(location) {
  if (!location) return '📍'

  const loc = location.toLowerCase()

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

  return '📍'
}

function getActivityCost(activity) {
  return parseFloat(activity?.cost) || 0
}

export function getTotalCost(itinerary = {}) {
  let total = 0
  Object.values(itinerary).forEach(activities => {
    ;(activities || []).forEach(activity => {
      total += getActivityCost(activity)
    })
  })
  return total
}

export function getTotalCostByDate(itinerary = {}, dateStr) {
  const activities = itinerary?.[dateStr] || []
  return activities.reduce((sum, activity) => sum + getActivityCost(activity), 0)
}

export function getCategoryBreakdown(itinerary = {}) {
  const breakdown = {}
  Object.values(itinerary).forEach(activities => {
    ;(activities || []).forEach(activity => {
      const category = activity?.category || '其他'
      if (!breakdown[category]) {
        breakdown[category] = 0
      }
      breakdown[category] += getActivityCost(activity)
    })
  })
  return breakdown
}
