// Heat Index Calculation Function
function calculateHeatIndex(temperature, humidity) {
    // Only calculate if temperature is 27°C or higher (per requirements)
    if (temperature < 27) {
        return temperature;
    }
    
    // Heat Index formula (Steadman)
    let c1 = -42.379;
    let c2 = 2.04901523;
    let c3 = 10.14333127;
    let c4 = -0.22475541;
    let c5 = -0.00683783;
    let c6 = -0.05481717;
    let c7 = 0.00122874;
    let c8 = 0.00085282;
    let c9 = -0.00000199;
    
    let t = temperature;
    let rh = humidity;
    
    let heatIndex = c1 + (c2 * t) + (c3 * rh) + (c4 * t * rh) + 
                    (c5 * t * t) + (c6 * rh * rh) + (c7 * t * t * rh) + 
                    (c8 * t * rh * rh) + (c9 * t * t * rh * rh);
    
    return heatIndex;
}

// Function to determine warning level and message
function getWarningLevel(heatIndex) {
    if (heatIndex < 27) {
        return { level: 'Aman', message: 'Tidak ada resiko heatstroke.', color: '#00ff22' };
    } else if (heatIndex < 32) {
        return { level: 'Peringatan', message: 'Kemungkinan kecil terjadi kelelahan dan heat cramp bila melakukan aktivitas berat.', color: '#ff9d00' };
    } else if (heatIndex < 41) {
        return { level: 'Waspada', message: 'Kemungkinan besar terjadi kelelahan dan heat cramp.', color: '#ff1900' };
    } else if (heatIndex < 54) {
        return { level: 'Bahaya', message: 'Kemungkinan terjadi heatstroke bila terlalu lama terekspos.', color: '#b300ff' };
    } else {
        return { level: 'Ancaman', message: 'Heat stroke akan terjadi tanpa perlindungan!', color: '#1f2933' };
    }
}

// Display result function
function displayResult(heatIndex, warning) {
    let resultSection = document.getElementById('resultSection');
    let resultValue = document.getElementById('resultValue');
    let resultWarning = document.getElementById('resultWarning');
    let resultBox = document.getElementById('resultBox');
    
    resultValue.textContent = heatIndex.toFixed(2) + '°C';
    resultWarning.textContent = warning.level + ': ' + warning.message;
    
    // Set color based on warning level
    resultBox.style.borderColor = warning.color;
    resultBox.style.backgroundColor = warning.color + '20'; // 20% opacity
    
    resultSection.style.display = 'block';
}

// Event listener for Calculate button
document.addEventListener('DOMContentLoaded', function() {
    let calculateBtn = document.querySelector('.btn-calculate');
    
    calculateBtn.addEventListener('click', function() {
        let temperature = parseFloat(document.getElementById('temperature').value);
        let humidity = parseFloat(document.getElementById('humidity').value);
        
        // Validation
        if (isNaN(temperature) || isNaN(humidity)) {
            alert('Please enter both temperature and humidity values');
            return;
        }
        
        if (humidity < 0 || humidity > 100) {
            alert('Humidity must be between 0 and 100%');
            return;
        }
        
        // Calculate heat index
        let heatIndex = calculateHeatIndex(temperature, humidity);
        
        // Get warning level
        let warning = getWarningLevel(heatIndex);
        
        // Display result
        displayResult(heatIndex, warning);
    });
    
    // Allow Enter key to trigger calculation
    document.getElementById('temperature').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.querySelector('.btn-calculate').click();
    });
    
    document.getElementById('humidity').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.querySelector('.btn-calculate').click();
    });
});