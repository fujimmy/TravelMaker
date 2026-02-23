// Google Gemini API 配置
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const CACHE_KEY_PREFIX = 'gemini_itinerary_cache_'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

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

function normalizeModelName(modelName) {
  if (!modelName) return ''
  return modelName.startsWith('models/') ? modelName : `models/${modelName}`
}

function buildGenerateUrl(modelName) {
  const normalized = normalizeModelName(modelName)
  return `${GEMINI_BASE_URL}/${normalized}:generateContent?key=${GEMINI_API_KEY}`
}

async function listModels() {
  const url = `${GEMINI_BASE_URL}/models?key=${GEMINI_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${error.error?.message || 'Failed to list models'}`)
  }
  const data = await response.json()
  return data.models || []
}

function pickFirstGenerateModel(models) {
  const supported = models.filter(model => (model.supportedGenerationMethods || []).includes('generateContent'))
  return supported[0]?.name || ''
}

function tryParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
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

  // 如果旅游天数超过 7 天，提示用户
  if (days > 10) {
    console.warn('[Gemini API] Long trip detected, may exceed token limit')
  }

  // 现有活动摘要（限制长度）
  const existingActivitiesSummary = existingActivities.length > 0
    ? `已有活动：${existingActivities.slice(0, 3).map(a => `${a.category}`).join('、')}等${existingActivities.length}个活动`
    : '还没有添加任何活动'

  const prompt = `你是专业旅游规划师。为以下旅行生成精简的每日行程建议：

地点: ${location}
日期: ${startDate} 至 ${endDate}（${days}天）
${existingActivitiesSummary}

要求：
1. 每天生成3-4个活动
2. content字段：简洁描述（30字内）,並請提出明確的地點或商店名稱，避免模糊描述(如“附近的餐廳”或“當地的景點”)
3. notes字段：简短提示（20字内）或可省略
4. 活动时间不重叠，合理安排8-10小时
5. 包含不同类型（景點、餐廳、交通等）
6. 花費請以當地貨幣表示，數字部分不帶貨幣符號
7. 必須填寫以下欄位：
   - local_currency: 當地貨幣代碼（如 JPY, USD, EUR, TWD 等）
   - currency_symbol: 貨幣符號（如 ¥, $, €, NT$ 等）
   - currency_name: 貨幣中文名稱（如 日圓, 美元, 歐元, 台幣 等）
   - location_emoji: 代表該地點的單一 emoji（如東京用🗼、巴黎用🗼、阿姆斯特丹用🌷）
8. location字段必須是「可被地圖檢索的完整地名」：
  - 優先使用官方名稱（店名/景點全名）
  - 需包含城市或行政區（如：沖縄市、那霸市）
  - 禁止只寫暱稱、商圈名、泛稱（如：コザ、美食街、海邊景點）
9. 若是餐廳或商店，location請盡量使用「品牌名 + 分店名 + 城市」格式。

返回JSON数组格式：
[
  {
    "dayIndex": 1,
    "date": "2025-01-15",
    "local_currency": "JPY",
    "currency_symbol": "¥",
    "currency_name": "日圓",
    "location_emoji": "🗼",
    "activities": [
      {
        "startTime": "09:00",
        "endTime": "11:00",
        "category": "景點",
        "content": "简洁活动描述",
        "cost": 1000,
        "location": "可地圖檢索的完整地名（例如：サムズアンカーイン 沖縄市店, 沖縄市）",
        "notes": "简短提示"
      }
    ]
  }
]

只返回JSON，无其他文字。`

  console.log('[Gemini API] Starting AI itinerary generation for:', { location, startDate, endDate, days })

  try {
    let modelToUse = GEMINI_MODEL

    const models = await listModels()
    const supportedModels = models.filter(model => (model.supportedGenerationMethods || []).includes('generateContent'))
    if (supportedModels.length === 0) {
      throw new Error('Gemini API error: No models available for generateContent. Please verify your API key and enabled services in Google AI Studio.')
    }

    const hasPreferred = supportedModels.some(model => model.name === normalizeModelName(GEMINI_MODEL))
    if (!hasPreferred) {
      const fallback = pickFirstGenerateModel(models)
      if (fallback) {
        modelToUse = fallback.replace('models/', '')
      }
    }

    let urlWithKey = buildGenerateUrl(modelToUse)

    let response = await fetch(urlWithKey, {
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
          maxOutputTokens: 16384,
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const message = error.error?.message || 'Unknown error'

      if (message.includes('not found') || message.includes('not supported')) {
        const models = await listModels()
        const fallback = pickFirstGenerateModel(models)
        if (!fallback) {
          throw new Error('Gemini API error: No available models support generateContent. Please check your API key and enabled services.')
        }
        modelToUse = fallback
        urlWithKey = buildGenerateUrl(modelToUse)
        response = await fetch(urlWithKey, {
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
              maxOutputTokens: 16384,
              responseMimeType: 'application/json'
            }
          })
        })

        if (!response.ok) {
          const fallbackError = await response.json().catch(() => ({}))
          throw new Error(`Gemini API error: ${fallbackError.error?.message || 'Unknown error'}`)
        }
      } else {
        throw new Error(`Gemini API error: ${message}`)
      }
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('No content in Gemini response')
    }

    console.log('[Gemini API] Response received, content length:', content.length)

    let itinerary

    // 首先尝试直接解析
    let parsed = tryParse(content)
    if (parsed) {
      console.log('[Gemini API] Direct parse successful')
    }

    // 如果直接解析失败，尝试提取代码块
    if (!parsed) {
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
      if (fenceMatch?.[1]) {
        parsed = tryParse(fenceMatch[1])
      }
    }

    // 如果仍然失败，尝试找到第一个 [ 或 { 并智能提取 JSON
    if (!parsed) {
      const startIdx = content.search(/[\[\{]/)
      if (startIdx !== -1) {
        let extracted = ''
        let bracketCount = 0
        let braceCount = 0
        let inString = false
        let escaped = false
        let started = false
        
        for (let i = startIdx; i < content.length; i++) {
          const char = content[i]
          
          if (escaped) {
            extracted += char
            escaped = false
            continue
          }
          
          if (char === '\\' && inString) {
            extracted += char
            escaped = true
            continue
          }
          
          if (char === '"' && !escaped) {
            inString = !inString
            extracted += char
            continue
          }
          
          if (!inString) {
            if (char === '[') {
              bracketCount++
              started = true
            } else if (char === ']') {
              bracketCount--
            } else if (char === '{') {
              braceCount++
              started = true
            } else if (char === '}') {
              braceCount--
            }
          }
          
          extracted += char
          
          // 检查是否完成了一个 JSON 结构
          if (started && bracketCount === 0 && braceCount === 0 && extracted.length > 2) {
            break
          }
        }
        
        console.log('[Gemini API] Extracted JSON length:', extracted.length, 'brackets:', bracketCount, 'braces:', braceCount)
        
        if (extracted && extracted.length > 2) {
          // 首先尝试直接解析
          parsed = tryParse(extracted)
          
          // 如果失败且有未闭合的括号或花括号，尝试修复
          if (!parsed && (bracketCount > 0 || braceCount > 0 || inString)) {
            console.log('[Gemini API] Attempting to repair incomplete JSON')
            let repaired = extracted
            
            // 如果在字符串中被截断，闭合字符串
            if (inString) {
              repaired += '"'
            }
            
            // 闭合未完成的对象和数组
            if (braceCount > 0) {
              repaired += '}'.repeat(braceCount)
            }
            if (bracketCount > 0) {
              repaired += ']'.repeat(bracketCount)
            }
            
            console.log('[Gemini API] Repaired JSON length:', repaired.length)
            parsed = tryParse(repaired)
            
            if (parsed) {
              console.log('[Gemini API] Successfully repaired JSON')
            }
          }
        }
      }
    }

    // 现在确定 itinerary
    if (Array.isArray(parsed)) {
      itinerary = parsed
      console.log('[Gemini API] Parsed as direct array, items count:', itinerary.length)
    } else if (parsed?.itinerary && Array.isArray(parsed.itinerary)) {
      itinerary = parsed.itinerary
      console.log('[Gemini API] Parsed from .itinerary property')
    } else if (parsed?.data && Array.isArray(parsed.data)) {
      itinerary = parsed.data
      console.log('[Gemini API] Parsed from .data property')
    } else if (parsed?.days && Array.isArray(parsed.days)) {
      itinerary = parsed.days
      console.log('[Gemini API] Parsed from .days property')
    } else {
      // 如果解析失败，输出调试信息
      console.error('Failed to parse Gemini response:', {
        rawContentFirst1000: content.slice(0, 1000),
        rawContentLast200: content.slice(-200),
        parsed,
        contentLength: content.length,
        isArray: Array.isArray(parsed),
        type: typeof parsed
      })
      throw new Error(`Invalid response format from Gemini. Raw response: ${content.slice(0, 300)}`)
    }

    // 规范化：如果返回的是活动数组而不是按天分组
    const looksLikeActivity = (item) => item && (item.startTime || item.time) && item.endTime && (item.category || item.type)
    const isActivityArray = itinerary.length > 0 && itinerary.every(looksLikeActivity)
    if (isActivityArray) {
      itinerary = [
        {
          dayIndex: 1,
          date: startDate,
          activities: itinerary
        }
      ]
    }

    // 规范化：确保每个 day 有 activities 数组
    itinerary = itinerary
      .map((day, index) => {
        if (Array.isArray(day?.activities)) {
          return day
        }
        if (Array.isArray(day?.items)) {
          return { ...day, activities: day.items }
        }
        // 如果 day 本身就是 activity 格式，转换为 day 格式
        if (day?.startTime || day?.time) {
          return {
            dayIndex: 1,
            date: startDate,
            activities: [day]
          }
        }
        return {
          dayIndex: day?.dayIndex ?? index + 1,
          date: day?.date ?? startDate,
          activities: Array.isArray(day) ? day : []
        }
      })
    
    // 保存到缓存
    saveCacheItinerary(location, startDate, endDate, itinerary)
    
    console.log('[Gemini API] Successfully generated itinerary with', itinerary.length, 'day(s), returning to component')
    
    return {
      itinerary,
      fromCache: false
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    throw error
  }
}
