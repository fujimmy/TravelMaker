# 127.0.0.1 本地運行指南

由於 Google Maps API 限制只能在 `127.0.0.1` 呼叫，項目已配置為在此 IP 上運行。

## 運行方式

### 方法 1：使用預設設置（推薦）

```bash
npm run dev
```

Vite 會自動在 `http://127.0.0.1:5173` 上運行。

### 方法 2：指定 IP 和 Port

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

## 訪問方式

在瀏覽器中使用以下網址訪問：

```
http://127.0.0.1:5173
```

⚠️ **重要**：不要使用 `localhost` 或其他 IP，必須使用 `127.0.0.1`，否則 Google Maps API 會因 CORS 限制而無法使用。

## 配置說明

項目的 `vite.config.js` 已配置為：

```javascript
server: {
  host: '127.0.0.1',  // 限制只能在 127.0.0.1 訪問
  port: 5173,
  strictPort: false,   // 如果 5173 被占用，自動使用下一個可用 port
}
```

## 如果要使用其他 Port

編輯 `vite.config.js` 中的 `port` 值，例如改為 `3000`：

```javascript
server: {
  host: '127.0.0.1',
  port: 3000,  // 改為 3000
  strictPort: false,
}
```

然後訪問 `http://127.0.0.1:3000`

## 生產環境構建

```bash
npm run build
```

構建完成的檔案在 `dist` 資料夾中，可部署到支援 127.0.0.1 訪問的伺服器。

## 常見問題

### Q: 為什麼不能用 localhost？
A: localhost 和 127.0.0.1 雖然在技術上指向同一地址，但被視為不同的源（origin）。Google Maps API 的白名單嚴格區分這兩者。

### Q: 如何在其他機器上訪問？
A: 如果 API 白名單中有你的外網 IP，可以在 vite.config.js 中改為：
```javascript
host: '0.0.0.0'
```
然後用你的機器 IP 訪問。但此時 Google Maps API 可能無法使用。

### Q: Port 被占用怎麼辦？
A: 設置 `strictPort: false` 後，Vite 會自動用下一個可用的 port 並在終端顯示。
