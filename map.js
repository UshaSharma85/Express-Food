// ===============================
// Foodie Express - map.js
// Clean production version
// ===============================

(function(){
  'use strict';

  function initMap(){
    var mapEl = document.getElementById('map');
    if (!mapEl) return;
    if (typeof L === 'undefined'){
      mapEl.textContent = 'Live map loading... (Leaflet not found)';
      return;
    }
    try {
      // Prevent double init
      if (mapEl._leaflet_id) return;

      // Restaurant Location (Connaught Place, Delhi)
      var restaurant = [28.6139, 77.2090];
      // Customer Location
      var customer = [28.6205, 77.2180];

      var map = L.map('map', { scrollWheelZoom: false }).setView(restaurant, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap Contributors'
      }).addTo(map);

      L.marker(restaurant).addTo(map)
        .bindPopup('🍔 Foodie Express Restaurant')
        .openPopup();

      L.marker(customer).addTo(map)
        .bindPopup('🏠 Delivery Address');

      var bikeIcon = L.divIcon({
        html: '🛵',
        className: 'delivery-bike-icon',
        iconSize: [35, 35],
        iconAnchor: [17, 17]
      });

      var rider = L.marker(restaurant, { icon: bikeIcon }).addTo(map);

      var route = L.polyline([restaurant, customer], {
        color: '#ff3366',
        weight: 5,
        opacity: 0.8
      }).addTo(map);

      try { map.fitBounds(route.getBounds(), { padding: [30, 30] }); } catch(e){}

      // Delivery Animation
      var progress = 0;
      var move = setInterval(function(){
        progress += 0.008;
        if (progress >= 1){
          rider.setLatLng(customer);
          rider.bindPopup('✅ Order Delivered').openPopup();
          clearInterval(move);
          return;
        }
        var lat = restaurant[0] + (customer[0] - restaurant[0]) * progress;
        var lng = restaurant[1] + (customer[1] - restaurant[1]) * progress;
        rider.setLatLng([lat, lng]);
      }, 300);

    } catch(err){
      console.warn('Map init failed:', err);
      if (mapEl) mapEl.textContent = 'Live Delivery Map';
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initMap);
  } else {
    initMap();
  }
})();
