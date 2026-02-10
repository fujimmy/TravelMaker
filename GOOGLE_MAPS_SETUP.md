# Google Maps API 設定說明

## ⚠️ 重要：使用新版 API

本項目使用新版 Google Maps Platform API。如果遇到「Calling a legacy API」的錯誤，請確保在 Google Cloud Console 中啟用了新版的 Places API。

## 如何取得 Google Maps API Key

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用以下 API：
   - **Maps JavaScript API** ✓
   - **Places API (新版)** ✓ 重要！不是舊版
   - **Geocoding API** ✓ （支援地址搜尋）
4. 前往「憑證」頁面建立 API 金鑰
5. （可選）設定 API 限制：
   - 應用程式限制：IP 地址 → 新增 `127.0.0.1`
   - API 限制：選擇 Maps JavaScript API、Places API 和 Geocoding API
6. 複製 API 金鑰

## 設定步驟

1. 開啟 `index.html` 檔案
2. 找到這行：

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&v=weekly" async defer></script>
```

3. 將 `YOUR_API_KEY` 替換為你的 Google Maps API 金鑰

## 範例

```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&libraries=places&v=weekly" async defer></script>
```

## 注意事項

- 使用 `v=weekly` 參數以獲取最新的 API 功能
- 免費方案每月有 $200 美元的免費額度
- 建議設定 API 金鑰的使用限制（HTTP referrers）
- 不要將 API 金鑰提交到公開的版本控制系統

## 常見錯誤

### 錯誤：「You're calling a legacy API」

**原因**：在 Google Cloud Console 中只啟用了舊版 Places API

**解決**：
1. 進入 [Google Cloud Console](https://console.cloud.google.com/)
2. 進入「API 和服務」→「已啟用的 API」
3. 確保 **Places API (新版)** 已啟用
4. 刪除或停用舊版 **Places API (已停用)**
5. 清除瀏覽器快取並重新加載

### 地點搜尋不出現

**可能原因及解決方案**：

1. **確認啟用所有必要的 API**：
   - ✓ Maps JavaScript API
   - ✓ Places API (新版)
   - ✓ Geocoding API（用於地址搜尋）

2. **清除快取並重新加載**：
   - 按 `Ctrl+Shift+Delete` 清除瀏覽器快取
   - 或按 `Ctrl+Shift+R` 強制刷新頁面

3. **檢查瀏覽器控制台**：
   - 按 `F12` 開啟開發者工具
   - 查看「Console」標籤是否有紅色錯誤訊息
   - 常見錯誤：「You're calling a legacy API」表示啟用了舊版 API

4. **確認訪問 URL**：
   - 確保訪問 `http://127.0.0.1:5173`（不是 localhost）

5. **檢查 API Key 權限**：
   - 在 Google Cloud Console 確認 API Key 已授權訪問所有必要的 API
   - 確認 API Key 的 IP 限制包含 `127.0.0.1`

**測試步驟**：
- 試著搜尋簡單的地點名稱（如「台北」、「東京」）
- 試著搜尋具體地點（如「文化路夜市」、「101大樓」）
- 如果都無法搜尋，可能是 API 未正確啟用


