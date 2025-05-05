let map, marker, interval, orbitLines = [];
let isMapLocked = true;
let terminator, isTerminatorVisible = true;
let simulationTime = null;
let simulationStartTime = null;
let isRealTime = true;
let clickMarker = null;
let circles = [];
let satrec = null;
let tleLines = null;
let satNameGlobal = 'Satélite Desconhecido';
let markerCoords = null;
let selectedTimezoneOffset = null;

function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap> contributors'
    }).addTo(map);

    const satelliteIcon = L.icon({
        iconUrl: 'images/satelite.png',
        iconSize: [25, 25],
        iconAnchor: [12.5, 12.5],
        popupAnchor: [0, -41]
    });

    marker = L.marker([0, 0], { icon: satelliteIcon }).addTo(map);

    try {
        terminator = L.terminator({
            fillColor: '#000',
            fillOpacity: 0.4,
            color: '#000',
            opacity: 0.2,
            resolution: 2
        }).addTo(map);
    } catch (error) {
        console.error('Erro ao inicializar o Terminator:', error);
        isTerminatorVisible = false;
    }

    setInterval(updateTerminator, 60000);
    updateTerminator();

    map.on('dblclick', handleMapDoubleClick);
}

function initTimezoneSelector() {
    const timezoneSelect = document.getElementById('timezoneSelect');
    timezoneSelect.addEventListener('change', function() {
        selectedTimezoneOffset = this.value !== '' ? parseInt(this.value) : null;
    });
}

function handleMapDoubleClick(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (clickMarker) {
        map.removeLayer(clickMarker);
    }
    circles.forEach(circle => map.removeLayer(circle));
    circles = [];

    clickMarker = L.marker([lat, lng]).addTo(map);

    const outerCircle = L.circle([lat, lng], {
        radius: 200000,
        color: '#ff0000',
        fillColor: '#ff0000',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    circles.push(outerCircle);

    const middleCircle = L.circle([lat, lng], {
        radius: 133333,
        color: '#ffa500',
        fillColor: '#ffa500',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    circles.push(middleCircle);

    const innerCircle = L.circle([lat, lng], {
        radius: 66666,
        color: '#008000',
        fillColor: '#008000',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    circles.push(innerCircle);

    markerCoords = { lat, lng };

    document.getElementById('markerCoords').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    document.getElementById('predictPass').disabled = false;
}

function updateTerminator() {
    if (isTerminatorVisible && terminator) {
        try {
            terminator.setTime(simulationTime || new Date());
        } catch (error) {
            console.error('Erro ao atualizar o Terminator:', error);
        }
    }
}

function toggleTerminator() {
    isTerminatorVisible = !isTerminatorVisible;
    const toggleButton = document.getElementById('toggleTerminator');
    if (isTerminatorVisible && terminator) {
        terminator.addTo(map);
        toggleButton.textContent = 'Esconder Terminator';
    } else {
        if (terminator) {
            map.removeLayer(terminator);
        }
        toggleButton.textContent = 'Mostrar Terminator';
    }
}

function resetToRealTime() {
    isRealTime = true;
    simulationTime = null;
    simulationStartTime = null;
    document.getElementById('datetimeInput').value = '';
    if (interval) {
        clearInterval(interval);
        startTracking();
    }
    updateTerminator();
}

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('leaflet')) :
    typeof define === 'function' && define.amd ? define(['leaflet'], factory) :
    (global.L = global.L || {}, global.L.terminator = factory(global.L));
}(this, (function (L) { 'use strict';
    L = L && L.hasOwnProperty('default') ? L['default'] : L;
    function julian(date) {
        return (date / 86400000) + 2440587.5;
    }
    function GMST(julianDay) {
        var d = julianDay - 2451545.0;
        return (18.697374558 + 24.06570982441908 * d) % 24;
    }
    var Terminator = L.Polygon.extend({
        options: {
            color: '#00',
            opacity: 0.5,
            fillColor: '#00',
            fillOpacity: 0.5,
            resolution: 2
        },
        initialize: function (options) {
            this.version = '0.1.0';
            this._R2D = 180 / Math.PI;
            this._D2R = Math.PI / 180;
            L.Util.setOptions(this, options);
            var latLng = this._compute(this.options.time);
            this.setLatLngs(latLng);
        },
        setTime: function (date) {
            this.options.time = date;
            var latLng = this._compute(date);
            this.setLatLngs(latLng);
        },
        _sunEclipticPosition: function (julianDay) {
            var n = julianDay - 2451545.0;
            var L$$1 = 280.460 + 0.9856474 * n;
            L$$1 %= 360;
            var g = 357.528 + 0.9856003 * n;
            g %= 360;
            var lambda = L$$1 + 1.915 * Math.sin(g * this._D2R) + 0.02 * Math.sin(2 * g * this._D2R);
            var R = 1.00014 - 0.01671 * Math.cos(g * this._D2R) - 0.0014 * Math.cos(2 * g * this._D2R);
            return {lambda: lambda, R: R};
        },
        _eclipticObliquity: function (julianDay) {
            var n = julianDay - 2451545.0;
            var T = n / 36525;
            var epsilon = 23.43929111 - T * (46.836769 / 3600 - T * (0.0001831 / 3600 + T * (0.00200340 / 3600 - T * (0.576e-6 / 3600 - T * 4.34e-8 / 3600))));
            return epsilon;
        },
        _sunEquatorialPosition: function (sunEclLng, eclObliq) {
            var alpha = Math.atan(Math.cos(eclObliq * this._D2R) * Math.tan(sunEclLng * this._D2R)) * this._R2D;
            var delta = Math.asin(Math.sin(eclObliq * this._D2R) * Math.sin(sunEclLng * this._D2R)) * this._R2D;
            var lQuadrant = Math.floor(sunEclLng / 90) * 90;
            var raQuadrant = Math.floor(alpha / 90) * 90;
            alpha = alpha + (lQuadrant - raQuadrant);
            return {alpha: alpha, delta: delta};
        },
        _hourAngle: function (lng, sunPos, gst) {
            var lst = gst + lng / 15;
            return lst * 15 - sunPos.alpha;
        },
        _latitude: function (ha, sunPos) {
            var lat = Math.atan(-Math.cos(ha * this._D2R) / Math.tan(sunPos.delta * this._D2R)) * this._R2D;
            return lat;
        },
        _compute: function (time) {
            var today = time ? new Date(time) : new Date();
            var julianDay = julian(today);
            var gst = GMST(julianDay);
            var latLng = [];
            var sunEclPos = this._sunEclipticPosition(julianDay);
            var eclObliq = this._eclipticObliquity(julianDay);
            var sunEqPos = this._sunEquatorialPosition(sunEclPos.lambda, eclObliq);
            for (var i = 0; i <= 720 * this.options.resolution; i++) {
                var lng = -360 + i / this.options.resolution;
                var ha = this._hourAngle(lng, sunEqPos, gst);
                latLng[i + 1] = [this._latitude(ha, sunEqPos), lng];
            }
            if (sunEqPos.delta < 0) {
                latLng[0] = [90, -360];
                latLng[latLng.length] = [90, 360];
            } else {
                latLng[0] = [-90, -360];
                latLng[latLng.length] = [-90, 360];
            }
            return latLng;
        }
    });
    function terminator(options) {
        return new Terminator(options);
    }
    return terminator;
})));

function formatDateUTC(date, timezoneOffset) {
    const adjustedDate = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
    const year = adjustedDate.getUTCFullYear();
    const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
    const hours = String(adjustedDate.getUTCHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function isTleOutdated(tleLine1) {
    const epochStr = tleLine1.substring(18, 32);
    const year = parseInt(epochStr.substring(0, 2)) + (epochStr[0] < '7' ? 2000 : 1900);
    const dayOfYear = parseFloat(epochStr.substring(2));
    
    const epochDate = new Date(year, 0);
    epochDate.setDate(dayOfYear);
    
    const now = new Date();
    const diffDays = (now - epochDate) / (1000 * 60 * 60 * 24);
    
    return diffDays > 30;
}

function calculatePeriodFromTLE(tleLine2) {
    const meanMotion = parseFloat(tleLine2.substring(52, 63));
    const periodMinutes = (24 * 60) / meanMotion;
    return periodMinutes;
}

function calculateApogeePerigee(satrec) {
    const earthRadius = 6378.137;
    const mu = 398600.4418;
    const n = satrec.no / 60;
    const a = Math.pow(mu / (n * n), 1/3);
    const e = satrec.ecco;
    const apogee = (a * (1 + e)) - earthRadius;
    const perigee = (a * (1 - e)) - earthRadius;
    return { apogee, perigee };
}

function calculateVelocity(velocityEci) {
    const vx = velocityEci.x;
    const vy = velocityEci.y;
    const vz = velocityEci.z;
    const speedKms = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const speedKmh = speedKms * 3600;
    return speedKmh;
}

function calculateOrbitPath(satrec, now, steps = 360, period) {
    const orbitPoints = [];
    const stepTime = (period * 60 * 1000) / steps;

    for (let i = 0; i <= steps; i++) {
        const time = new Date(now.getTime() + i * stepTime);
        const positionAndVelocity = satellite.propagate(satrec, time);
        const gmst = satellite.gstime(time);

        if (positionAndVelocity.position) {
            const positionEci = positionAndVelocity.position;
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);
            const latitude = satellite.degreesLat(positionGd.latitude);
            const longitude = satellite.degreesLong(positionGd.longitude);
            orbitPoints.push([latitude, longitude]);
        }
    }
    return orbitPoints;
}

function drawOrbitPath(satrec, now, period) {
    orbitLines.forEach(line => map.removeLayer(line));
    orbitLines = [];

    const orbitPoints = calculateOrbitPath(satrec, now, 360, period);

    let currentSegment = [];
    const segments = [];

    for (let i = 0; i < orbitPoints.length; i++) {
        const point = orbitPoints[i];
        if (i > 0 && Math.abs(orbitPoints[i][1] - orbitPoints[i-1][1]) > 180) {
            if (currentSegment.length > 1) {
                segments.push(currentSegment);
            }
            currentSegment = [point];
        } else {
            currentSegment.push(point);
        }
    }

    if (currentSegment.length > 1) {
        segments.push(currentSegment);
    }

    segments.forEach(segment => {
        const line = L.polyline(segment, {
            color: '#000000',
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 10'
        }).addTo(map);
        orbitLines.push(line);
    });
}

function calculatePasses(satrec, centerLat, centerLng, startTime, days = 15) {
    const passes = [];
    const stepSeconds = 10;
    const endTime = new Date(startTime.getTime() + days * 24 * 60 * 60 * 1000);
    let wasInside = false;
    let minDistance = Infinity;
    let passStartTime = null;

    for (let time = new Date(startTime); time <= endTime; time.setSeconds(time.getSeconds() + stepSeconds)) {
        const positionAndVelocity = satellite.propagate(satrec, time);
        const gmst = satellite.gstime(time);

        if (positionAndVelocity.position) {
            const positionEci = positionAndVelocity.position;
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);
            const lat = satellite.degreesLat(positionGd.latitude);
            const lng = satellite.degreesLong(positionGd.longitude);

            const distance = map.distance([lat, lng], [centerLat, centerLng]);

            const isInside = distance <= 200000;

            if (isInside) {
                if (!wasInside) {
                    passStartTime = new Date(time);
                    minDistance = distance;
                } else {
                    minDistance = Math.min(minDistance, distance);
                }
            }

            if (!isInside && wasInside) {
                let elevation;
                if (minDistance <= 66666) {
                    elevation = 'Alta';
                } else if (minDistance <= 133333) {
                    elevation = 'Mediana';
                } else {
                    elevation = 'Baixa';
                }
                passes.push({ time: new Date(passStartTime), elevation });
                minDistance = Infinity;
                passStartTime = null;
            }

            wasInside = isInside;
        }
    }

    if (wasInside && passStartTime) {
        let elevation;
        if (minDistance <= 66666) {
            elevation = 'Alta';
        } else if (minDistance <= 133333) {
            elevation = 'Mediana';
        } else {
            elevation = 'Baixa';
        }
        passes.push({ time: new Date(passStartTime), elevation });
    }

    return passes;
}

function generatePassPredictions() {
    if (!clickMarker || !satrec || !markerCoords) {
        alert('Por favor, adicione um marcador no mapa e inicie o rastreamento de um satélite.');
        return;
    }

    if (selectedTimezoneOffset === null) {
        alert('Por favor, selecione um fuso horário antes de gerar as previsões.');
        return;
    }

    const centerLat = clickMarker.getLatLng().lat;
    const centerLng = clickMarker.getLatLng().lng;
    const now = new Date();
    const passes = calculatePasses(satrec, centerLat, centerLng, now);

    const timezoneLabel = selectedTimezoneOffset >= 0 ? `GMT+${selectedTimezoneOffset}` : `GMT${selectedTimezoneOffset}`;

    let html = `
        <h3>Previsão de Passagens do Satélite</h3>
        <table>
            <tr>
                <th>Data e Hora (${timezoneLabel})</th>
                <th>Elevação</th>
                <th>Simulação</th>
            </tr>
    `;

    passes.forEach(pass => {
        const passTimeFormatted = formatDateUTC(pass.time, selectedTimezoneOffset);

        const elevation = pass.elevation;
        const year = pass.time.getUTCFullYear();
        const month = String(pass.time.getUTCMonth() + 1).padStart(2, '0');
        const day = String(pass.time.getUTCDate()).padStart(2, '0');
        const hours = String(pass.time.getUTCHours()).padStart(2, '0');
        const minutes = String(pass.time.getUTCMinutes()).padStart(2, '0');
        const passTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}Z`;

        const encodedTLE = encodeURIComponent(tleLines.join('\n'));
        const encodedSatName = encodeURIComponent(satNameGlobal);
        const encodedLat = encodeURIComponent(markerCoords.lat);
        const encodedLng = encodeURIComponent(markerCoords.lng);
        const encodedTimezone = encodeURIComponent(selectedTimezoneOffset);

        html += `
            <tr>
                <td>${passTimeFormatted}</td>
                <td>${elevation}</td>
                <td><a href="#" onclick="simulatePass('${encodedTLE}', '${encodedSatName}', '${encodeURIComponent(passTimeLocal)}', '${encodedLat}', '${encodedLng}', '${encodedTimezone}'); return false;">Ver no Mapa</a></td>
            </tr>
        `;
    });

    html += `</table>`;

    document.getElementById('passPredictions').innerHTML = html;
}

function simulatePass(encodedTLE, encodedSatName, passTimeLocal, encodedLat, encodedLng, encodedTimezone) {
    document.getElementById('tleInput').value = decodeURIComponent(encodedTLE);
    document.getElementById('satNameInput').value = decodeURIComponent(encodedSatName);
    selectedTimezoneOffset = parseInt(decodeURIComponent(encodedTimezone));
    document.getElementById('timezoneSelect').value = selectedTimezoneOffset;

    const passTimeUTC = new Date(decodeURIComponent(passTimeLocal));
    
    if (isNaN(passTimeUTC.getTime())) {
        alert('Data de simulação inválida recebida.');
        return;
    }
    
    const passTimeAdjusted = new Date(passTimeUTC.getTime() + selectedTimezoneOffset * 60 * 60 * 1000);
    const year = passTimeAdjusted.getUTCFullYear();
    const month = String(passTimeAdjusted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(passTimeAdjusted.getUTCDate()).padStart(2, '0');
    const hours = String(passTimeAdjusted.getUTCHours()).padStart(2, '0');
    const minutes = String(passTimeAdjusted.getUTCMinutes()).padStart(2, '0');
    const passTimeFormatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('datetimeInput').value = passTimeFormatted;

    console.log('passTimeUTC para simulação:', passTimeUTC.toISOString());

    const markerLat = parseFloat(decodeURIComponent(encodedLat));
    const markerLng = parseFloat(decodeURIComponent(encodedLng));
    markerCoords = { lat: markerLat, lng: markerLng };

    if (clickMarker) {
        map.removeLayer(clickMarker);
    }
    circles.forEach(circle => map.removeLayer(circle));
    circles = [];

    clickMarker = L.marker([markerLat, markerLng]).addTo(map);

    const outerCircle = L.circle([markerLat, markerLng], {
        radius: 200000,
        color: '#ff0000',
        fillColor: '#ff0000',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    circles.push(outerCircle);

    const middleCircle = L.circle([markerLat, markerLng], {
        radius: 133333,
        color: '#ffa500',
        fillColor: '#ffa500',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    circles.push(middleCircle);

    const innerCircle = L.circle([markerLat, markerLng], {
        radius: 66666,
        color: '#008000',
        fillColor: '#008000',
        fillOpacity: 0.1,
        weight: 1
    }).addTo(map);
    circles.push(innerCircle);

    document.getElementById('markerCoords').textContent = `${markerLat.toFixed(4)}, ${markerLng.toFixed(4)}`;
    document.getElementById('predictPass').disabled = false;

    startTracking();
}

function toggleMapLock() {
    isMapLocked = !isMapLocked;
    const toggleButton = document.getElementById('toggleLock');
    toggleButton.textContent = isMapLocked ? 'Destravar Mapa' : 'Travar Mapa';
}

function isTleOutdated(tleLine1) {
    const epochStr = tleLine1.substring(18, 32);
    const year = parseInt(epochStr.substring(0, 2)) + (epochStr[0] < '7' ? 2000 : 1900);
    const dayOfYear = parseFloat(epochStr.substring(2));
    
    const epochDate = new Date(year, 0);
    epochDate.setDate(dayOfYear);
    
    const now = new Date();
    const diffDays = (now - epochDate) / (1000 * 60 * 60 * 24);
    
    return diffDays > 30;
}

function startTracking() {
    if (interval) clearInterval(interval);

    const tleInput = document.getElementById('tleInput').value.trim().split('\n');
    const satNameInput = document.getElementById('satNameInput').value.trim();
    const datetimeInput = document.getElementById('datetimeInput').value.trim();

    if (tleInput.length < 2) {
        alert('Por favor, insira um TLE válido com duas linhas.');
        return;
    }

    tleLines = [tleInput[0].trim(), tleInput[1].trim()];
    satNameGlobal = satNameInput || 'Satélite Desconhecido';

    if (isTleOutdated(tleLines[0])) {
        alert('Aviso: O TLE parece estar desatualizado (mais de 30 dias). Isso pode causar erros na propagação em tempo real. Considere usar um TLE mais recente.');
    }

    if (datetimeInput) {
        const [datePart, timePart] = datetimeInput.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        // Usa 0 como offset padrão se nenhum fuso horário for selecionado
        const timezoneOffset = selectedTimezoneOffset !== null ? selectedTimezoneOffset : 0;
        const customDateUTC = new Date(Date.UTC(year, month - 1, day, hours - timezoneOffset, minutes));
        
        if (isNaN(customDateUTC.getTime())) {
            alert('Por favor, selecione uma data e hora válidas.');
            return;
        }
        
        console.log('customDateUTC para simulação:', customDateUTC.toISOString());
        
        isRealTime = false;
        simulationStartTime = customDateUTC;
        simulationTime = new Date(customDateUTC);
    } else {
        isRealTime = true;
        simulationTime = null;
        simulationStartTime = null;
    }

    if (!map) initMap();

    document.getElementById('satName').textContent = satNameGlobal;
    satrec = satellite.twoline2satrec(tleLines[0], tleLines[1]);

    const period = calculatePeriodFromTLE(tleLines[1]);

    const { apogee, perigee } = calculateApogeePerigee(satrec);
    document.getElementById('apogee').textContent = apogee.toFixed(2);
    document.getElementById('perigee').textContent = perigee.toFixed(2);

    const now = simulationTime || new Date();
    console.log('Tempo usado para drawOrbitPath:', now.toISOString());
    drawOrbitPath(satrec, now, period);

    updateTerminator();

    function updatePosition() {
        const currentTime = isRealTime ? new Date() : new Date(simulationTime.getTime() + 1000);
        if (!isRealTime) {
            simulationTime = currentTime;
        }
        console.log('Tempo usado para propagate:', currentTime.toISOString());

        const positionAndVelocity = satellite.propagate(satrec, currentTime);
        const gmst = satellite.gstime(currentTime);

        if (positionAndVelocity.position && positionAndVelocity.velocity) {
            const positionEci = positionAndVelocity.position;
            const velocityEci = positionAndVelocity.velocity;
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);

            const latitude = satellite.degreesLat(positionGd.latitude);
            const longitude = satellite.degreesLong(positionGd.longitude);
            const altitude = positionGd.height;

            marker.setLatLng([latitude, longitude]);

            if (isMapLocked) {
                map.setView([latitude, longitude], map.getZoom());
            }

            document.getElementById('latitude').textContent = latitude.toFixed(4);
            document.getElementById('longitude').textContent = longitude.toFixed(4);
            document.getElementById('altitude').textContent = altitude.toFixed(2);
            document.getElementById('velocity').textContent = calculateVelocity(velocityEci).toFixed(2);
        } else {
            console.error('Erro ao calcular a posição ou velocidade do satélite.');
        }
    }

    updatePosition();
    interval = setInterval(updatePosition, 1000);

    isMapLocked = true;
    document.getElementById('toggleLock').textContent = 'Destravar Mapa';
}

function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tle = urlParams.get('tle');
    const satName = urlParams.get('satName');
    const datetime = urlParams.get('datetime');
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const timezone = urlParams.get('timezone');

    if (tle) {
        document.getElementById('tleInput').value = decodeURIComponent(tle);
    }
    if (satName) {
        document.getElementById('satNameInput').value = decodeURIComponent(satName);
    }
    if (timezone) {
        selectedTimezoneOffset = parseInt(decodeURIComponent(timezone));
        document.getElementById('timezoneSelect').value = selectedTimezoneOffset;
    }
    if (datetime) {
        const passTimeUTC = new Date(decodeURIComponent(datetime));
        // Usa 0 como offset padrão se nenhum fuso horário for selecionado
        const timezoneOffset = selectedTimezoneOffset !== null ? selectedTimezoneOffset : 0;
        const passTimeAdjusted = new Date(passTimeUTC.getTime() + timezoneOffset * 60 * 60 * 1000);
        const year = passTimeAdjusted.getUTCFullYear();
        const month = String(passTimeAdjusted.getUTCMonth() + 1).padStart(2, '0');
        const day = String(passTimeAdjusted.getUTCDate()).padStart(2, '0');
        const hours = String(passTimeAdjusted.getUTCHours()).padStart(2, '0');
        const minutes = String(passTimeAdjusted.getUTCMinutes()).padStart(2, '0');
        const passTimeFormatted = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('datetimeInput').value = passTimeFormatted;
    }

    if (lat && lng) {
        const markerLat = parseFloat(decodeURIComponent(lat));
        const markerLng = parseFloat(decodeURIComponent(lng));
        markerCoords = { lat: markerLat, lng: markerLng };

        if (clickMarker) {
            map.removeLayer(clickMarker);
        }
        circles.forEach(circle => map.removeLayer(circle));
        circles = [];

        clickMarker = L.marker([markerLat, markerLng]).addTo(map);

        const outerCircle = L.circle([markerLat, markerLng], {
            radius: 200000,
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
        circles.push(outerCircle);

        const middleCircle = L.circle([markerLat, markerLng], {
            radius: 133333,
            color: '#ffa500',
            fillColor: '#ffa500',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
        circles.push(middleCircle);

        const innerCircle = L.circle([markerLat, markerLng], {
            radius: 66666,
            color: '#008000',
            fillColor: '#008000',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
        circles.push(innerCircle);

        document.getElementById('markerCoords').textContent = `${markerLat.toFixed(4)}, ${markerLng.toFixed(4)}`;
        document.getElementById('predictPass').disabled = false;
    }

    if (tle && satName && datetime && timezone) {
        startTracking();
    }
}

window.onload = function() {
    initMap();
    initTimezoneSelector();
    loadFromUrlParams();
};