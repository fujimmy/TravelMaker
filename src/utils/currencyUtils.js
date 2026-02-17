// 貨幣工具函數

// 貨幣代碼映射表（僅作為 AI 未提供符號時的備用方案）
const currencySymbols = {
  'TWD': { symbol: 'NT$', name: '台幣' },
  'JPY': { symbol: '¥', name: '日圓' },
  'KRW': { symbol: '₩', name: '韓圓' },
  'THB': { symbol: '฿', name: '泰銖' },
  'USD': { symbol: '$', name: '美元' },
  'EUR': { symbol: '€', name: '歐元' },
  'GBP': { symbol: '£', name: '英鎊' },
  'SGD': { symbol: 'S$', name: '新加坡幣' },
  'HKD': { symbol: 'HK$', name: '港幣' },
  'CNY': { symbol: '¥', name: '人民幣' },
  'AUD': { symbol: 'A$', name: '澳幣' },
  'CAD': { symbol: 'C$', name: '加幣' },
  'NZD': { symbol: 'NZ$', name: '紐幣' },
  'CHF': { symbol: 'CHF', name: '瑞士法郎' },
  // 其他常見貨幣（僅保留最常用的）
  'MYR': { symbol: 'RM', name: '馬來西亞令吉' },
  'IDR': { symbol: 'Rp', name: '印尼盾' },
  'VND': { symbol: '₫', name: '越南盾' },
  'PHP': { symbol: '₱', name: '菲律賓披索' },
}

// 根據貨幣代碼獲取貨幣資訊
export function getCurrencyInfo(currencyCode) {
  const code = currencyCode?.toUpperCase()
  const info = currencySymbols[code]
  
  if (info) {
    return { code, ...info }
  }
  
  // 如果找不到，返回代碼作為符號
  return {
    code: code || 'TWD',
    symbol: code || 'NT$',
    name: code || '台幣'
  }
}

// 根據地點判斷當地貨幣（僅作為 AI 未提供時的簡單備用方案）
export function getLocalCurrency(location) {
  // 簡化的常見地區判斷
  if (!location) return { code: 'TWD', symbol: 'NT$', name: '台幣' }
  
  const loc = location.toLowerCase()
  
  // 歐元區（使用簡單的關鍵字匹配）
  if (loc.includes('法') || loc.includes('德') || loc.includes('義') || 
      loc.includes('西班牙') || loc.includes('荷') || loc.includes('比利時') ||
      loc.includes('葡萄牙') || loc.includes('希臘') || loc.includes('奧地利') ||
      loc.includes('愛爾蘭') || loc.includes('芬蘭') ||
      loc.includes('paris') || loc.includes('berlin') || loc.includes('rome') ||
      loc.includes('madrid') || loc.includes('amsterdam') || loc.includes('brussels')) {
    return { code: 'EUR', symbol: '€', name: '歐元' }
  }
  
  // 其他常見貨幣
  if (loc.includes('日') || loc.includes('東京') || loc.includes('大阪') || loc.includes('japan') || loc.includes('tokyo')) {
    return { code: 'JPY', symbol: '¥', name: '日圓' }
  }
  if (loc.includes('韓') || loc.includes('首爾') || loc.includes('korea') || loc.includes('seoul')) {
    return { code: 'KRW', symbol: '₩', name: '韓圓' }
  }
  if (loc.includes('泰') || loc.includes('曼谷') || loc.includes('thailand') || loc.includes('bangkok')) {
    return { code: 'THB', symbol: '฿', name: '泰銖' }
  }
  if (loc.includes('美') || loc.includes('紐約') || loc.includes('洛杉磯') || loc.includes('usa') || loc.includes('new york')) {
    return { code: 'USD', symbol: '$', name: '美元' }
  }
  if (loc.includes('英') || loc.includes('倫敦') || loc.includes('uk') || loc.includes('london')) {
    return { code: 'GBP', symbol: '£', name: '英鎊' }
  }
  if (loc.includes('新加坡') || loc.includes('singapore')) {
    return { code: 'SGD', symbol: 'S$', name: '新加坡幣' }
  }
  if (loc.includes('香港') || loc.includes('hong kong')) {
    return { code: 'HKD', symbol: 'HK$', name: '港幣' }
  }
  
  // 預設返回台幣
  return { code: 'TWD', symbol: 'NT$', name: '台幣' }
}

// 獲取匯率（使用免費的 exchangerate-api.com）
const EXCHANGE_RATE_CACHE_KEY = 'exchange_rates_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 小時

export async function getExchangeRate(fromCurrency, toCurrency = 'TWD') {
  if (fromCurrency === toCurrency) {
    return 1
  }
  
  try {
    // 檢查快取
    const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY)
    if (cached) {
      const data = JSON.parse(cached)
      const now = Date.now()
      
      // 檢查快取是否過期
      if (data.timestamp && now - data.timestamp < CACHE_DURATION) {
        const rate = data.rates?.[fromCurrency]?.[toCurrency]
        if (rate) {
          console.log(`[Currency] Using cached rate: ${fromCurrency} -> ${toCurrency} = ${rate}`)
          return rate
        }
      }
    }
    
    // 使用 exchangerate-api 的免費 API
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate')
    }
    
    const data = await response.json()
    const rate = data.rates[toCurrency]
    
    if (!rate) {
      throw new Error(`No rate found for ${toCurrency}`)
    }
    
    // 保存到快取
    const cachedData = JSON.parse(localStorage.getItem(EXCHANGE_RATE_CACHE_KEY) || '{"rates":{}}')
    if (!cachedData.rates[fromCurrency]) {
      cachedData.rates[fromCurrency] = {}
    }
    cachedData.rates[fromCurrency][toCurrency] = rate
    cachedData.timestamp = Date.now()
    localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(cachedData))
    
    console.log(`[Currency] Fetched new rate: ${fromCurrency} -> ${toCurrency} = ${rate}`)
    return rate
  } catch (error) {
    console.error('Error fetching exchange rate:', error)
    // 返回備用匯率（手動維護的常見匯率）
    return getFallbackRate(fromCurrency, toCurrency)
  }
}

// 備用匯率（當 API 失敗時使用）
function getFallbackRate(fromCurrency, toCurrency = 'TWD') {
  const fallbackRates = {
    'JPY': 0.21,    // 日圓
    'KRW': 0.024,   // 韓圓
    'THB': 0.89,    // 泰銖
    'SGD': 23.5,    // 新加坡幣
    'HKD': 4.0,     // 港幣
    'CNY': 4.3,     // 人民幣
    'USD': 31.5,    // 美元
    'EUR': 34.0,    // 歐元
    'GBP': 39.5,    // 英鎊
    'AUD': 20.5,    // 澳幣
    'CAD': 23.0,    // 加幣
    'NZD': 19.0,    // 紐幣
    'CHF': 35.5,    // 瑞士法郎
    'MYR': 7.0,     // 馬來西亞令吉
    'IDR': 0.002,   // 印尼盾
    'VND': 0.0013,  // 越南盾
    'PHP': 0.55,    // 菲律賓披索
    'TRY': 0.95,    // 土耳其里拉
    'AED': 8.6,     // 阿聯酋迪拉姆
    'CZK': 1.4,     // 捷克克朗
    'PLN': 7.8,     // 波蘭茲羅提
    'RUB': 0.33,    // 俄羅斯盧布
  }
  
  if (fromCurrency === 'TWD') return 1
  return fallbackRates[fromCurrency] || 1
}

// 格式化金額顯示（包含當地貨幣和台幣）
export function formatCostWithExchangeRate(cost, localCurrency, exchangeRate) {
  const localAmount = cost || 0
  const twdAmount = Math.round(localAmount * exchangeRate)
  
  return {
    local: `${localCurrency.symbol}${localAmount.toLocaleString()}`,
    twd: `NT$ ${twdAmount.toLocaleString()}`,
    localAmount,
    twdAmount,
    rate: exchangeRate
  }
}
