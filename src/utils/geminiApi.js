// Google Gemini API 配置
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
const CACHE_KEY_PREFIX = 'gemini_itinerary_cache_'
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

// 生成缓存 key
function getCacheKey(location, startDate, endDate) {
  return `${CACHE_KEY_PREFIX}${location}_${startDate}_${endDate}`
}

// 从缓存获取数据
function getCachedItinerary(location, startDate, endDate) {
  const cacheKey = getCacheKey(location, startDate, endDate)
  const cached = localStorage.getItem(cacheKey)
  
  if (!cached) return null
  
  try {
    const data = JSON.parse(cached)
    const now = Date.now()
    
    // 检查缓存是否过期
    if (data.timestamp && now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey)
      return null
    }
    
    return data.itinerary
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

// 保存数据到缓存
function saveCacheItinerary(location, startDate, endDate, itinerary) {
  const cacheKey = getCacheKey(location, startDate, endDate)
  try {
    const data = {
      itinerary,
      timestamp: Date.now(),
      location,
      startDate,
      endDate
    }
    localStorage.setItem(cacheKey, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving cache:', error)
  }
}

// 获取所有缓存的行程列表
export function getCachedItineraries() {
  const cached = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (data) {
          cached.push({
            location: data.location,
            startDate: data.startDate,
            endDate: data.endDate,
            timestamp: data.timestamp,
            cacheKey: key
          })
        }
      } catch (error) {
        console.error('Error reading cached item:', error)
      }
    }
  }
  return cached
}

// 清除特定的缓存
export function clearCacheItinerary(cacheKey) {
  try {
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

// 清除所有缓存
export function clearAllCacheItineraries() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      keys.push(key)
    }
  }
  keys.forEach(key => localStorage.removeItem(key))
}

export async function generateItineraryWithAI(location, startDate, endDate, existingActivities = [], useCache = true) {
  // 尝试从缓存获取
  if (useCache) {
    const cached = getCachedItinerary(location, startDate, endDate)
    if (cached) {
      return {
        itinerary: cached,
        fromCache: true
      }
    }
  }
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in .env file')
  }

  // 计算旅游天数
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

  // 现有活动摘要
  const existingActivitiesSummary = existingActivities.length > 0
    ? `已有活动：${existingActivities.map(a => `${a.startTime}-${a.endTime} ${a.category} ${a.content}`).join('；')}`
    : '还没有添加任何活动'

  const prompt = `你是一个专业的旅游规划师。请为以下旅行生成详细的每日行程建议：

地点: ${location}
旅游日期: ${startDate} 至 ${endDate}（共${days}天）
${existingActivitiesSummary}

请按照以下格式为每一天生成3-4个活动建议：
- 每个活动需要包括：开始时间、结束时间、行程分类、活动名称、活动描述、预估费用

返回格式为JSON数组，每个对象包含：
{
  "dayIndex": 1,
  "date": "2025-01-15",
  "activities": [
    {
      "startTime": "09:00",
      "endTime": "11:00",
      "category": "景點",
      "content": "活动名称和描述",
      "cost": 1000,
      "location": "具体地点",
      "notes": "其他备注"
    }
  ]
}

请确保：
1. 活动时间合理且不重叠
2. 包含不同类型的活动（景點、餐廳、交通等）
3. 每天安排8-10小时的旅游时间
4. 费用估计符合当地消费水平
5. 考虑地点间的交通时间
6. 只返回JSON数组，不要有其他说明文字`

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      }),
      params: {
        key: GEMINI_API_KEY
      }
    })

    // 使用 URLSearchParams 来添加 API key 到 URL
    const urlWithKey = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`
    const response2 = await fetch(urlWithKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    })

    if (!response2.ok) {
      const error = await response2.json()
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response2.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('No content in Gemini response')
    }

    // 解析 JSON 响应
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini')
    }

    const itinerary = JSON.parse(jsonMatch[0])
    
    // 保存到缓存
    saveCacheItinerary(location, startDate, endDate, itinerary)
    
    return {
      itinerary,
      fromCache: false
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    throw error
  }
}
