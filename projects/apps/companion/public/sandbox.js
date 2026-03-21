const REGIONS = [
  { name: 'North America', minLat: 30, maxLat: 50, minLng: -125, maxLng: -70 },
  { name: 'Europe', minLat: 35, maxLat: 65, minLng: -10, maxLng: 30 },
  { name: 'Australia', minLat: -35, maxLat: -15, minLng: 115, maxLng: 153 },
  { name: 'South America', minLat: -35, maxLat: 5, minLng: -75, maxLng: -40 },
  { name: 'Japan', minLat: 30, maxLat: 45, minLng: 130, maxLng: 145 },
  { name: 'South Africa', minLat: -34, maxLat: -22, minLng: 18, maxLng: 32 }
];

let map, panorama, svService, currentTarget, currentGuessMarker, guessPolylines = [];
let retryCount = 0;

function initGame() {
  const mapElement = document.getElementById('map');
  const svElement = document.getElementById('street-view');

  map = new google.maps.Map(mapElement, {
    center: { lat: 20, lng: 0 },
    zoom: 1,
    disableDefaultUI: true,
    zoomControl: true,
    draggableCursor: 'crosshair',
    streetViewControl: false,
    mapTypeControl: false,
  });

  panorama = new google.maps.StreetViewPanorama(svElement, {
    addressControl: false,
    showRoadLabels: false,
    disableDefaultUI: true,
    panControl: true,
    zoomControl: true,
  });

  map.setStreetView(panorama);
  svService = new google.maps.StreetViewService();

  map.addListener("click", (e) => {
    placeGuess(e.latLng);
  });

  document.getElementById('guess-button').addEventListener('click', handleGuess);
  document.getElementById('play-again').addEventListener('click', startNewRound);

  startNewRound();
}

function getRandomLocation() {
  const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
  const lat = region.minLat + Math.random() * (region.maxLat - region.minLat);
  const lng = region.minLng + Math.random() * (region.maxLng - region.minLng);
  return new google.maps.LatLng(lat, lng);
}

function findValidStreetView() {
  if (retryCount > 20) {
    // Fallback if we fail too many times
    currentTarget = { lat: 48.8584, lng: 2.2945 };
    panorama.setPosition(currentTarget);
    panorama.setPov({ heading: 0, pitch: 0 });
    document.getElementById('guess-button').innerText = "GUESS";
    return;
  }

  const randomLoc = getRandomLocation();
  
  // Search for the nearest panorama within 50km
  svService.getPanorama({ location: randomLoc, radius: 50000, source: google.maps.StreetViewSource.OUTDOOR }, (data, status) => {
    if (status === google.maps.StreetViewStatus.OK && data.location) {
      currentTarget = { lat: data.location.latLng.lat(), lng: data.location.latLng.lng() };
      panorama.setPano(data.location.pano);
      panorama.setPov({ heading: Math.random() * 360, pitch: 0 }); // Random starting viewing angle
      document.getElementById('guess-button').innerText = "GUESS";
    } else {
      retryCount++;
      setTimeout(findValidStreetView, 100);
    }
  });
}

function startNewRound() {
  document.getElementById('score-overlay').style.display = 'none';
  document.getElementById('guess-button').classList.remove('active');
  document.getElementById('guess-button').innerText = "LOADING...";
  
  if (currentGuessMarker) {
    currentGuessMarker.setMap(null);
    currentGuessMarker = null;
  }
  guessPolylines.forEach(p => p.setMap(null));
  guessPolylines = [];
  
  map.setCenter({ lat: 20, lng: 0 });
  map.setZoom(1);

  retryCount = 0;
  findValidStreetView();
  
  document.getElementById('map-container').style.transform = "scale(1)";
}

function placeGuess(latLng) {
  if (!currentGuessMarker) {
    currentGuessMarker = new google.maps.Marker({
      position: latLng,
      map: map,
      title: 'Your Guess'
    });
    document.getElementById('guess-button').classList.add('active');
  } else {
    currentGuessMarker.setPosition(latLng);
  }
}

function handleGuess() {
  if (!currentGuessMarker || document.getElementById('guess-button').innerText === "LOADING...") return;

  const guessLatLng = currentGuessMarker.getPosition();
  const targetLatLng = new google.maps.LatLng(currentTarget.lat, currentTarget.lng);

  const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(guessLatLng, targetLatLng);
  const distanceKm = distanceMeters / 1000;

  // Simple exponential score drop-off (Max 5000)
  let score = 5000 * Math.exp(-distanceKm / 2000);
  score = Math.max(0, Math.round(score));
  if (distanceKm < 0.1) score = 5000;

  const targetMarker = new google.maps.Marker({
    position: targetLatLng,
    map: map,
    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  });
  guessPolylines.push(targetMarker);

  const flightPath = new google.maps.Polyline({
    path: [guessLatLng, targetLatLng],
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 2,
    map: map
  });
  guessPolylines.push(flightPath);

  const bounds = new google.maps.LatLngBounds();
  bounds.extend(guessLatLng);
  bounds.extend(targetLatLng);
  map.fitBounds(bounds);

  document.getElementById('distance-text').innerText = `You were ${distanceKm.toFixed(2)} km away!`;
  document.getElementById('score-text').innerText = `Score: ${score} / 5000`;
  document.getElementById('score-overlay').style.display = 'flex';
}

window.initGame = initGame;
