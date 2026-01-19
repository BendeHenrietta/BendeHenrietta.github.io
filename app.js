const CSV_FILE_PATH = 'airline_new.csv'; 

const EUR_RATE =0.0095; 

let rawData = [];
let filteredData = [];


const commonConfig = {
    background: "transparent",
    axis: {
        labelColor: "#94a3b8",
        titleColor: "#f8fafc",
        gridColor: "rgba(255,255,255,0.1)",
        domainColor: "rgba(255,255,255,0.1)",
        labelFontSize: 11,
        titleFontSize: 12
    },
    legend: {
        labelColor: "#94a3b8",
        titleColor: "#f8fafc",
        labelFontSize: 11,
        titleFontSize: 12
    },
    title: { 
        color: "#f8fafc",
        fontSize: 14
    },
    view: { 
        stroke: "transparent" 
    }
};


document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initialized');
    loadDataAutomatically();
});

function loadDataAutomatically() {
    const loader = document.getElementById('loader');
    
    fetch(CSV_FILE_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP hiba! Státusz: ${response.status} - A fájl nem található.`);
            }
            return response.text();
        })
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    console.log(`✅ Parsed ${results.data.length} rows`);
                    
                  
                    rawData = results.data.filter(d => 
                        d.price && 
                        d.airline && 
                        d.source_city && 
                        d.destination_city
                    );

                    // Adatbővítés: Útvonal és Euró ár kiszámolása
                    rawData.forEach(d => {
                        d.route = `${d.source_city} → ${d.destination_city}`;
                        d.price_eur = Math.round(d.price * EUR_RATE); // EUR kalkuláció
                    });

                    filteredData = [...rawData];

                    populateFilters();
                    updateDashboard();
                    generateInsights();

                    loader.style.display = 'none';
                    console.log('✨ Dashboard ready!');
                },
                error: (err) => {
                    console.error('❌ CSV Parse Error:', err);
                    loader.innerHTML = `<div class="upload-container"><h2 style="color:#f43f5e">Hiba</h2><p>${err.message}</p></div>`;
                }
            });
        })
        .catch(error => {
            console.error('❌ Fetch Error:', error);
            loader.innerHTML = `<div class="upload-container"><h2 style="color:#f43f5e">Hiba</h2><p>Fájl nem található: ${CSV_FILE_PATH}</p></div>`;
        });
}


function populateFilters() {
    // Airlines
    const airlines = [...new Set(rawData.map(d => d.airline))].sort();
    const airlineSelect = document.getElementById('filter-airline');
    airlines.forEach(airline => {
        const option = document.createElement('option');
        option.value = airline;
        option.textContent = airline;
        airlineSelect.appendChild(option);
    });

    // Times
    const times = ['Early_Morning', 'Morning', 'Afternoon', 'Evening', 'Night', 'Late_Night'];
    const timeSelect = document.getElementById('filter-time');
    times.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time.replace('_', ' ');
        timeSelect.appendChild(option);
    });

    // Stops
    const stops = [...new Set(rawData.map(d => d.stops))].sort();
    const stopSelect = document.getElementById('filter-stops');
    stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop === 'zero' ? 'Direct' : stop === 'one' ? '1 Stop' : '2+ Stops';
        stopSelect.appendChild(option);
    });
}



function updateDashboard() {
    const airlineVal = document.getElementById('filter-airline').value;
    const timeVal = document.getElementById('filter-time').value;
    const stopsVal = document.getElementById('filter-stops').value;
    const daysVal = parseInt(document.getElementById('filter-days').value);

    document.getElementById('days-val').textContent = daysVal;

    filteredData = rawData.filter(d => {
        return (
            (airlineVal === 'all' || d.airline === airlineVal) &&
            (timeVal === 'all' || d.departure_time === timeVal) &&
            (stopsVal === 'all' || d.stops === stopsVal) &&
            (d.days_left <= daysVal)
        );
    });

    updateStats();
    renderCharts();
    generateInsights();
}

function resetFilters() {
    document.getElementById('filter-airline').value = 'all';
    document.getElementById('filter-time').value = 'all';
    document.getElementById('filter-stops').value = 'all';
    document.getElementById('filter-days').value = 50;
    updateDashboard();
}

function formatCurrency(inr) {
    const eur = Math.round(inr * EUR_RATE);
    return `₹${inr.toLocaleString()} (€${eur.toLocaleString()})`;
}

function updateStats() {
    const prices = filteredData.map(d => d.price);
    const total = prices.length;
    const avg = total ? prices.reduce((a, b) => a + b, 0) / total : 0;
    const min = total ? Math.min(...prices) : 0;
    const max = total ? Math.max(...prices) : 0;

    document.getElementById('stat-total').textContent = total.toLocaleString();
    
    // Itt használjuk az új formázást
    document.getElementById('stat-avg').textContent = formatCurrency(Math.round(avg));
    document.getElementById('stat-min').textContent = formatCurrency(min);
    document.getElementById('stat-max').textContent = formatCurrency(max);
    
    document.getElementById('data-count').textContent = total.toLocaleString();
}

function generateInsights() {
    const insights = [];

    if (filteredData.length === 0) {
        insights.push('No data matches current filters.');
    } else {
        
        const avgByAirline = {};
        filteredData.forEach(d => {
            if (!avgByAirline[d.airline]) avgByAirline[d.airline] = [];
            avgByAirline[d.airline].push(d.price);
        });
        
        const airlineAvgs = Object.entries(avgByAirline).map(([airline, prices]) => ({
            airline,
            avg: prices.reduce((a, b) => a + b) / prices.length
        }));
        
        airlineAvgs.sort((a, b) => a.avg - b.avg);
        
        if (airlineAvgs.length > 0) {
            const bestPrice = Math.round(airlineAvgs[0].avg);
            insights.push(`💡 <strong>${airlineAvgs[0].airline}</strong> offers the lowest average price at ${formatCurrency(bestPrice)}`);
        }

        
        const directFlights = filteredData.filter(d => d.stops === 'zero');
        const connectingFlights = filteredData.filter(d => d.stops !== 'zero');
        
        if (directFlights.length > 0 && connectingFlights.length > 0) {
            const directAvg = directFlights.reduce((sum, d) => sum + d.price, 0) / directFlights.length;
            const connectingAvg = connectingFlights.reduce((sum, d) => sum + d.price, 0) / connectingFlights.length;
            const diff = Math.abs(directAvg - connectingAvg);
            
            insights.push(`🛑 Difference between Direct and Connecting: ${formatCurrency(Math.round(diff))}`);
        }
    }

    const insightsList = document.getElementById('insights-list');
    insightsList.innerHTML = insights.map(insight => `<li>${insight}</li>`).join('');
}



function renderCharts() {
    const dataObj = { values: filteredData };

    // Common tooltip setup: showing both INR and EUR
    const priceTooltips = [
        { field: "airline", title: "Airline" },
        { field: "price", title: "Price (₹)", format: "," },
        { field: "price_eur", title: "Price (€)", format: "," }, // ÚJ: Euró kijelzés
    ];

    // Chart 1: Days vs Price
    vegaEmbed('#viz-days', {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: "container", height: 320, data: dataObj,
        mark: { type: "circle", size: 60, opacity: 0.6 },
        encoding: {
            x: { field: "days_left", type: "quantitative", title: "Days Before Departure" },
            y: { field: "price", type: "quantitative", title: "Price (₹)" },
            color: { field: "airline", type: "nominal", legend: { title: "Airline" } },
            tooltip: [
                ...priceTooltips,
                { field: "days_left", title: "Days Left" }
            ]
        },
        config: commonConfig
    }, { actions: false });

    // Chart 2: Airline Comparison
    vegaEmbed('#viz-airline', {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: "container", height: 280, data: dataObj,
        mark: { type: "bar", cornerRadiusEnd: 5, color: "#6366f1" },
        encoding: {
            x: { field: "airline", type: "nominal", sort: "-y", title: null, axis: { labelAngle: -45 } },
            y: { field: "price", aggregate: "average", type: "quantitative", title: "Avg Price (₹)" },
            tooltip: [
                { field: "airline", title: "Airline" },
                { field: "price", aggregate: "average", title: "Avg Price (₹)", format: ",.0f" },
                { field: "price_eur", aggregate: "average", title: "Avg Price (€)", format: ",.0f" }
            ]
        },
        config: commonConfig
    }, { actions: false });

    // Chart 3: Stops
    vegaEmbed('#viz-stops', {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: "container", height: 280, data: dataObj,
        mark: { type: "boxplot", extent: 1.5 },
        encoding: {
            x: { field: "stops", type: "nominal", sort: ["zero", "one", "two_or_more"], title: null },
            y: { field: "price", type: "quantitative", title: "Price (₹)" },
            color: { field: "stops", legend: null },
            tooltip: [
                { field: "stops", title: "Stops" },
                { field: "price", title: "Price (₹)", format: "," },
                { field: "price_eur", title: "Price (€)", format: "," }
            ]
        },
        config: commonConfig
    }, { actions: false });

    // Chart 4: Heatmap
    vegaEmbed('#viz-heatmap', {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: "container", height: 320, data: dataObj,
        mark: "rect",
        encoding: {
            x: { field: "airline", type: "nominal", axis: { labelAngle: -45 } },
            y: { field: "route", type: "nominal", title: "Route" },
            color: { field: "price", aggregate: "average", type: "quantitative", scale: { scheme: "inferno" }, title: "Avg (₹)" },
            tooltip: [
                { field: "route", title: "Route" },
                { field: "airline", title: "Airline" },
                { field: "price", aggregate: "average", title: "Avg (₹)", format: ",.0f" },
                { field: "price_eur", aggregate: "average", title: "Avg (€)", format: ",.0f" }
            ]
        },
        config: commonConfig
    }, { actions: false });

    // Chart 5: Time Analysis
    vegaEmbed('#viz-time', {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: "container", height: 280, data: dataObj,
        mark: { type: "line", point: true, strokeWidth: 3, color: "#f43f5e" },
        encoding: {
            x: { field: "departure_time", type: "nominal", sort: ['Early_Morning', 'Morning', 'Afternoon', 'Evening', 'Night', 'Late_Night'], axis: { labelAngle: -45 } },
            y: { field: "price", aggregate: "average", type: "quantitative", title: "Avg Price (₹)" },
            tooltip: [
                { field: "departure_time", title: "Time" },
                { field: "price", aggregate: "average", title: "Avg (₹)", format: ",.0f" },
                { field: "price_eur", aggregate: "average", title: "Avg (€)", format: ",.0f" }
            ]
        },
        config: commonConfig
    }, { actions: false });

    // Chart 6: Duration
    vegaEmbed('#viz-duration', {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: "container", height: 280, data: dataObj,
        mark: { type: "point", filled: true, size: 50, opacity: 0.6 },
        encoding: {
            x: { field: "duration", type: "quantitative", title: "Hours" },
            y: { field: "price", type: "quantitative", title: "Price (₹)" },
            color: { field: "stops", type: "nominal" },
            tooltip: [
                { field: "duration", title: "Duration (h)" },
                { field: "price", title: "Price (₹)", format: "," },
                { field: "price_eur", title: "Price (€)", format: "," },
                { field: "stops", title: "Stops" }
            ]
        },
        config: commonConfig
    }, { actions: false });
}

console.log('Flight Analytics Dashboard Ready');