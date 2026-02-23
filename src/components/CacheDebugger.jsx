import React from 'react';

export const CacheDebugger = () => {
  const exportCachedData = () => {
    const allKeys = Object.keys(localStorage);
    const cacheKeys = allKeys.filter(key => 
      key.startsWith('gemini_itinerary_cache') || 
      key === 'travelmaker_trips'
    );

    console.log('=== CACHED DATA DEBUG ===');
    console.log(`Found ${cacheKeys.length} cache keys:\n`);

    const report = {};
    cacheKeys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        report[key] = data;
        console.log(`\n📦 ${key}:`);
        
        if (data.itinerary && Array.isArray(data.itinerary)) {
          console.log(`   ${data.itinerary.length} dates found`);
          
          data.itinerary.forEach((dayData, dayIdx) => {
            console.log(`\n   Day ${dayIdx + 1}:`);
            if (dayData.activities && Array.isArray(dayData.activities)) {
              dayData.activities.forEach((activity, actIdx) => {
                console.log(`     Activity ${actIdx + 1}: "${activity.location}"`);
              });
            }
          });
        } else if (Array.isArray(data)) {
          console.log(`   ${data.length} trips found`);
          data.forEach((trip, idx) => {
            console.log(`   Trip ${idx + 1}: ${trip.location} (${trip.startDate} to ${trip.endDate})`);
          });
        }
      } catch (e) {
        console.error(`Failed to parse ${key}:`, e);
      }
    });

    // Generate downloadable JSON
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'travelmaker-cache-debug.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return report;
  };

  const testOkinawaLocations = async () => {
    const testLocations = [
      "コザミュージックタウン",
      "サムズアンカーイン沖縄市店",
      "那覇空港",
      "恩納村",
      "古宇利島",
      "首里城",
      "国際通り",
      "ひめゆりの塔"
    ];

    console.log('=== TESTING OKINAWA LOCATIONS ===\n');
    
    for (const location of testLocations) {
      try {
        const response = await fetch(
          `/api/nominatim/search?format=json&q=${encodeURIComponent(location)}&limit=1`
        );
        const result = await response.json();
        const coords = result.length > 0 ? `✅ (${result[0].lat}, ${result[0].lon})` : '❌ No results';
        console.log(`${location}: ${coords}`);
      } catch (e) {
        console.log(`${location}: ⚠️ Error - ${e.message}`);
      }
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px', margin: '20px' }}>
      <h3>🔍 Cache Debugger</h3>
      <button onClick={exportCachedData} style={{ padding: '8px 16px', marginRight: '10px' }}>
        Export Cache & Log to Console
      </button>
      <button onClick={testOkinawaLocations} style={{ padding: '8px 16px' }}>
        Test Okinawa Locations
      </button>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        Open DevTools (F12) → Console to see detailed output. A JSON file will be downloaded when exporting.
      </p>
    </div>
  );
};

export default CacheDebugger;
