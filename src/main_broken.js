import './style.css'
import { SolarAPIService } from './solarAPI.js'
import { MapOverlayService } from './mapOverlay.js'

// Configuration
const CONFIG = {
  // You'll need to replace this with your actual Google Maps API key
  GOOGLE_MAPS_API_KEY: 'AIzaSyB8sldkCqW9munVjUQ7pdZR2F3C6Izb9WI',
  // You'll need to replace this with your actual Solar API key
  // NOTE: Solar API requires billing enabled and Solar API enabled in Google Cloud Console
  SOLAR_API_KEY: 'AIzaSyB8sldkCqW9munVjUQ7pdZR2F3C6Izb9WI',
  // Default map center (Mainz, Germany)
  DEFAULT_CENTER: { lat: 49.9929, lng: 8.2473 },
  DEFAULT_ZOOM: 13,
  // Enable mock data for development when Solar API is not available
  USE_MOCK_SOLAR_DATA: false
};

class SolarMapApp {
  constructor() {
    this.map = null;
    this.geocoder = null;
    this.autocomplete = null;
    this.selectedLocation = null;
    this.currentStep = 1;
    this.isMinimized = false;
    this.markers = [];
    
    // Balcony solar panel line system
    this.panelLine = null; // Object containing start, end points and configuration
    this.panelLineVisual = null; // Visual representation on map
    this.isDrawingLine = false; // Flag for line drawing mode
    this.lineStartPoint = null; // First click point when drawing line
    
    // Panel configuration
    this.panelLength = 2.0; // Individual panel length in meters
    this.panelWidth = 1.0; // Individual panel width in meters
    this.panelWattage = 400; // Wattage per individual panel
    this.panelTilt = 90; // Panel tilt angle in degrees (90 = vertical, 0 = horizontal)
    this.panelOrientation = 'length'; // 'length' or 'width' - how panels are oriented along the line
    this.railingHeight = 1.1; // Default railing height in meters
    this.panelMounting = 'railing'; // railing, angled, horizontal
    this.panelSide = 'left'; // left, right - which side of the line panels are mounted
    this.maxSystemWattage = 2000; // Maximum allowed system wattage
    this.wattageLeeway = 200; // Small leeway over max wattage (10%)
    
    // Services
    this.solarAPI = null;
    this.mapOverlay = null;
    this.currentSolarData = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadGoogleMapsAPI();
      this.initializeMap();
      this.initializeServices();
      this.setupEventListeners();
      this.showStep(1);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load Google Maps. Please check your API key and internet connection.');
    }
  }

  loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Create script element for Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places,geometry,visualization`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      
      document.head.appendChild(script);
    });
  }

  initializeMap() {
    const mapOptions = {
      center: CONFIG.DEFAULT_CENTER,
      zoom: CONFIG.DEFAULT_ZOOM,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    };

    this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
    this.geocoder = new google.maps.Geocoder();

    // Initialize Places Autocomplete
    this.initializeAutocomplete();

    // Add click listener for location selection
    this.map.addListener('click', (event) => {
      this.handleMapClick(event);
    });

    // Apply current theme to map
    const currentTheme = localStorage.getItem('solarized-theme') || 'light';
    if (currentTheme === 'dark') {
      this.applyDarkMapStyle();
    }
  }

  initializeServices() {
    this.solarAPI = new SolarAPIService(CONFIG.SOLAR_API_KEY);
    this.mapOverlay = new MapOverlayService(this.map);
  }

  setupEventListeners() {
    // Widget minimize/maximize
    document.getElementById('minimize-btn').addEventListener('click', () => {
      this.toggleWidget();
    });

    // Search functionality (kept for manual entry fallback)
    document.getElementById('search-btn').addEventListener('click', () => {
      this.searchAddress();
    });

    document.getElementById('address-search').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        // Prevent default to avoid autocomplete conflicts
        e.preventDefault();
        // Only search manually if autocomplete didn't handle it
        setTimeout(() => {
          if (!this.selectedLocation) {
            this.searchAddress();
          }
        }, 100);
      }
    });

    // Step navigation
    document.getElementById('next-step-1').addEventListener('click', () => {
      this.showStep(2);
    });

    document.getElementById('next-step-2').addEventListener('click', () => {
      this.showStep(3);
    });

    document.getElementById('clear-panel-line').addEventListener('click', () => {
      this.clearPanelLine();
    });

    document.getElementById('back-step-1').addEventListener('click', () => {
      this.showStep(1);
    });

    document.getElementById('calculate-solar').addEventListener('click', () => {
      this.calculatePanelSolarData();
    });

    document.getElementById('back-step-2').addEventListener('click', () => {
      this.showStep(2);
    });

    document.getElementById('new-analysis').addEventListener('click', () => {
      this.resetAnalysis();
    });

    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    // Parameter controls
    document.getElementById('panel-length').addEventListener('input', (e) => {
      this.updatePanelLength(e.target.value);
    });

    document.getElementById('panel-width').addEventListener('input', (e) => {
      this.updatePanelWidth(e.target.value);
    });

    document.getElementById('panel-wattage').addEventListener('input', (e) => {
      this.updatePanelWattage(e.target.value);
    });

    document.getElementById('panel-tilt').addEventListener('input', (e) => {
      this.updatePanelTilt(e.target.value);
    });

    document.getElementById('panel-orientation').addEventListener('change', (e) => {
      this.updatePanelOrientation(e.target.value);
    });

    document.getElementById('panel-side').addEventListener('change', (e) => {
      this.updatePanelSide(e.target.value);
    });

    // Azimuth buttons
    document.querySelectorAll('.azimuth-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectAzimuth(e.target.dataset.azimuth);
      });
    });

    // Map controls
    document.getElementById('toggle-satellite').addEventListener('click', () => {
      this.toggleMapType('satellite');
    });

    document.getElementById('toggle-terrain').addEventListener('click', () => {
      this.toggleMapType('terrain');
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Responsive behavior
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Initialize theme from localStorage or default to light
    this.initializeTheme();
  }

  handleMapClick(event) {
    const latLng = event.latLng;
    
    if (this.currentStep === 1) {
      // Step 1: Location selection
      this.selectLocation(latLng);
    } else if (this.currentStep === 2) {
      // Step 2: Panel line drawing
      this.handleLineDrawing(latLng);
    }
  }

  selectLocation(latLng) {
    // Clear existing markers
    this.clearMarkers();
    
    // Add marker at selected location
    const marker = new google.maps.Marker({
      position: latLng,
      map: this.map,
      title: 'Selected Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="#FF6B35" stroke="#ffffff" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#ffffff"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });
    
    this.markers.push(marker);
    this.selectedLocation = {
      lat: latLng.lat(),
      lng: latLng.lng()
    };
    
    // Reverse geocode to get address
    this.reverseGeocode(latLng).then(address => {
      // Update UI with location info
      document.getElementById('location-coords').textContent = 
        `${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`;
      document.getElementById('location-address').textContent = address;
      
      // Show location info and next button
      document.getElementById('selected-location').classList.remove('hidden');
      document.getElementById('next-step-1').classList.remove('hidden');
    }).catch(error => {
      console.error('Reverse geocoding failed:', error);
      document.getElementById('location-coords').textContent = 
        `${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`;
      document.getElementById('location-address').textContent = 'Address not found';
      
      // Still show location info and next button
      document.getElementById('selected-location').classList.remove('hidden');
      document.getElementById('next-step-1').classList.remove('hidden');
    });
  }

  handleLineDrawing(latLng) {
    if (!this.isDrawingLine) {
      // First click - start drawing line
      console.log('Starting line drawing');
      this.startLineDrawing(latLng);
    } else {
      // Second click - complete the line
      console.log('Completing line drawing');
      this.completeLineDrawing(latLng);
    }
  }

  startLineDrawing(startPoint) {
    this.isDrawingLine = true;
    this.lineStartPoint = startPoint;
    
    // Create temporary start marker
    this.startMarker = new google.maps.Marker({
      position: startPoint,
      map: this.map,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="#FF6B35">
            <circle cx="8" cy="8" r="6" stroke="#ffffff" stroke-width="2"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(16, 16),
        anchor: new google.maps.Point(8, 8)
      },
      title: 'Panel Line Start'
    });
    
    // Update UI to show drawing mode
    this.updateLineDrawingStatus(true);
  }

  completeLineDrawing(endPoint) {
    if (!this.lineStartPoint) return;
    
    // Clear existing panel line
    if (this.panelLine) {
      this.clearPanelLine();
    }
    
    // Calculate line length using Google Maps geometry
    const lineLength = google.maps.geometry.spherical.computeDistanceBetween(
      this.lineStartPoint, 
      endPoint
    );
    
    // Calculate azimuth (direction of the line)
    const azimuth = google.maps.geometry.spherical.computeHeading(
      this.lineStartPoint, 
      endPoint
    );
    
    // Normalize azimuth to 0-360
    const normalizedAzimuth = (azimuth + 360) % 360;
    
    console.log('Line completed:', {
      length: lineLength,
      azimuth: normalizedAzimuth,
      start: this.lineStartPoint,
      end: endPoint
    });
    
    // Create panel line object
    this.panelLine = {
      start: this.lineStartPoint,
      end: endPoint,
      length: lineLength, // in meters
      azimuth: normalizedAzimuth, // direction of the line
      panelAzimuth: this.calculatePanelAzimuth(normalizedAzimuth), // direction panels face
      panelArea: this.calculatePanelArea(lineLength),
      panelConfig: this.calculatePanelConfiguration(lineLength)
    };
    
    // Clean up temporary marker
    if (this.startMarker) {
      this.startMarker.setMap(null);
      this.startMarker = null;
    }
    
    // Draw the line and panel area
    this.drawPanelLine();
    this.drawPanelArea();
    
    // Reset drawing state
    this.isDrawingLine = false;
    this.lineStartPoint = null;
    
    // Update UI
    this.updateLineDrawingStatus(false);
    this.updatePanelLineStatus();
    
    console.log('Panel line created:', this.panelLine);
  }

  updateLineDrawingStatus(isDrawing) {
    const statusElement = document.getElementById('line-drawing-status');
    if (statusElement) {
      if (isDrawing) {
        statusElement.textContent = 'Click second point to complete the panel mounting line';
        statusElement.style.color = '#FF6B35';
        statusElement.style.fontWeight = 'bold';
      } else {
        statusElement.textContent = '';
      }
    }
  }

  selectLocation(latLng) {
    this.selectedLocation = {
      lat: latLng.lat(),
      lng: latLng.lng()
    };

    // Clear existing markers and overlays
    this.clearMarkers();
    this.mapOverlay.clearOverlays();

    // Add new marker
    const marker = new google.maps.Marker({
      position: latLng,
      map: this.map,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ff9500">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(30, 30),
        anchor: new google.maps.Point(15, 30)
      },
      animation: google.maps.Animation.DROP
    });

    this.markers.push(marker);

    // Update location info
    this.updateLocationInfo(latLng);

    // Show next step button
    const nextButton = document.getElementById('next-step-1');
    nextButton.classList.remove('hidden');
    nextButton.disabled = false;
    nextButton.textContent = 'Draw Panel Line';
    
    document.getElementById('selected-location').classList.remove('hidden');
  }

  async updateLocationInfo(latLng) {
    try {
      const response = await new Promise((resolve, reject) => {
        this.geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK') {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });

      const address = response[0]?.formatted_address || 'Address not found';
      
      document.getElementById('location-coords').textContent = 
        `Coordinates: ${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`;
      document.getElementById('location-address').textContent = address;
      document.getElementById('address-search').value = address;

    } catch (error) {
      console.error('Geocoding failed:', error);
      document.getElementById('location-coords').textContent = 
        `Coordinates: ${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`;
      document.getElementById('location-address').textContent = 'Address lookup failed';
    }
  }

  async searchAddress() {
    const address = document.getElementById('address-search').value.trim();
    if (!address) return;

    try {
      const response = await new Promise((resolve, reject) => {
        this.geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK') {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });

      const location = response[0].geometry.location;
      this.map.setCenter(location);
      this.map.setZoom(18);
      this.selectLocation(location);

    } catch (error) {
      console.error('Address search failed:', error);
      this.showError('Address not found. Please try a different search term.');
    }
  }

  showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
      step.style.display = 'none';
    });

    // Show target step
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
      targetStep.style.display = 'block';
      targetStep.classList.remove('hidden');
    }
    
    this.currentStep = stepNumber;
    
    // Handle step-specific logic
    if (stepNumber === 3) {
      // Enable calculate button if we have a panel line with valid configuration
      const calculateBtn = document.getElementById('calculate-solar');
      if (this.panelLine && this.panelLine.panelConfig && calculateBtn) {
        const config = this.panelLine.panelConfig;
        
        // Only enable if we have at least one panel
        if (config.panelCount > 0) {
          calculateBtn.disabled = false;
          calculateBtn.textContent = 'Calculate Solar Potential';
        } else {
          calculateBtn.disabled = true;
          calculateBtn.textContent = 'No panels can fit - adjust configuration';
        }
        
        // Update summary section with current panel info
        this.updateStep3Summary();
      } else {
        // No panel line configured
        if (calculateBtn) {
          calculateBtn.disabled = true;
          calculateBtn.textContent = 'Complete panel configuration first';
        }
      }
    }
    
    // Update step indicator if it exists
    this.updateStepIndicator(stepNumber);
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    const resultsContent = document.getElementById('results-content');
    
    if (show) {
      loading.classList.remove('hidden');
      resultsContent.classList.add('hidden');
    } else {
      loading.classList.add('hidden');
    }
  }

  showError(message) {
    // Create a more sophisticated error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add error styles if not already present
    if (!document.getElementById('error-styles')) {
      const style = document.createElement('style');
      style.id = 'error-styles';
      style.textContent = `
        .error-notification {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          background: #ff4757;
          color: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          animation: slideDown 0.3s ease;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .error-close {
          background: none;
          border: none;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          margin-left: auto;
        }

        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); }
          to { transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  toggleWidget() {
    const widget = document.getElementById('form-widget');
    const mapContainer = document.getElementById('map');
    const button = document.getElementById('minimize-btn');
    
    this.isMinimized = !this.isMinimized;
    
    if (this.isMinimized) {
      widget.classList.add('minimized');
      mapContainer.style.marginLeft = '64px';
      mapContainer.style.width = 'calc(100% - 64px)';
      button.textContent = '+';
      button.setAttribute('aria-label', 'Maximize widget');
    } else {
      widget.classList.remove('minimized');
      mapContainer.style.marginLeft = '420px';
      mapContainer.style.width = 'calc(100% - 420px)';
      button.textContent = '−';
      button.setAttribute('aria-label', 'Minimize widget');
    }

    // Trigger map resize after transition
    setTimeout(() => {
      if (this.map) {
        google.maps.event.trigger(this.map, 'resize');
      }
    }, 300);
  }

  toggleMapType(type) {
    const buttons = document.querySelectorAll('.control-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    if (type === 'satellite') {
      this.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      document.getElementById('toggle-satellite').classList.add('active');
    } else if (type === 'terrain') {
      this.map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
      document.getElementById('toggle-terrain').classList.add('active');
    }
  }

  clearMarkers() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  resetAnalysis() {
    this.clearMarkers();
    this.clearPanelLine();
    this.mapOverlay.clearOverlays();
    this.selectedLocation = null;
    this.currentSolarData = null;
    this.isDrawingLine = false;
    this.lineStartPoint = null;
    this.showStep(1);
    
    document.getElementById('address-search').value = '';
    document.getElementById('selected-location').classList.add('hidden');
    document.getElementById('next-step-1').classList.add('hidden');
  }

  updateStepIndicator(stepNumber) {
    // Update step indicator if it exists
    const indicators = document.querySelectorAll('.step-indicator');
    indicators.forEach((indicator, index) => {
      if (index + 1 <= stepNumber) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });
  }

  calculateBuildingArea(corners) {
    if (!corners || corners.length < 3) return 0;
    
    // Use Shoelace formula to calculate polygon area
    let area = 0;
    const n = corners.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = corners[i].position.lat();
      const lng1 = corners[i].position.lng();
      const lat2 = corners[j].position.lat();
      const lng2 = corners[j].position.lng();
      
      area += lat1 * lng2 - lat2 * lng1;
    }
    
    area = Math.abs(area) / 2;
    
    // Convert to square meters (approximate)
    const latToMeters = 111000; // approximate meters per degree latitude
    const lngToMeters = latToMeters * Math.cos(corners[0].position.lat() * Math.PI / 180);
    
    return area * latToMeters * lngToMeters;
  }

  exportData() {
    if (!this.selectedLocation || !this.currentSolarData) {
      this.showError('No data to export. Please complete a solar analysis first.');
      return;
    }

    const exportData = {
      location: this.selectedLocation,
      timestamp: new Date().toISOString(),
      solarData: this.currentSolarData,
      formattedResults: this.solarAPI.formatForDisplay(this.currentSolarData),
      analysisOptions: {
        solarIrradiance: document.getElementById('solar-irradiance').checked,
        roofSegment: document.getElementById('roof-segment').checked,
        solarPotential: document.getElementById('solar-potential').checked
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Show success message
    this.showSuccess('Solar analysis data exported successfully!');
  }

  showSuccess(message) {
    // Create success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'success-notification';
    successDiv.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span class="success-message">${message}</span>
        <button class="success-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add success styles if not already present
    if (!document.getElementById('success-styles')) {
      const style = document.createElement('style');
      style.id = 'success-styles';
      style.textContent = `
        .success-notification {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          background: #2ed573;
          color: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          animation: slideDown 0.3s ease;
        }

        .success-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .success-close {
          background: none;
          border: none;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          margin-left: auto;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(successDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 3000);
  }

  handleResize() {
    // Trigger map resize
    if (this.map) {
      google.maps.event.trigger(this.map, 'resize');
    }
  }

  // Theme management methods
  initializeTheme() {
    const savedTheme = localStorage.getItem('solarized-theme') || 'light';
    this.setTheme(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('solarized-theme', theme);
    
    // Update theme toggle icon
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }

    // Update map styles for better dark mode compatibility
    if (this.map) {
      if (theme === 'dark') {
        this.applyDarkMapStyle();
      } else {
        this.map.setOptions({ styles: [] }); // Reset to default styles
      }
    }
  }

  applyDarkMapStyle() {
    if (this.map) {
      this.map.setOptions({
        styles: [
          {
            "elementType": "geometry",
            "stylers": [{"color": "#212121"}]
          },
          {
            "elementType": "labels.icon",
            "stylers": [{"visibility": "off"}]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#757575"}]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#212121"}]
          },
          {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{"color": "#757575"}]
          },
          {
            "featureType": "administrative.country",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#9e9e9e"}]
          },
          {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{"color": "#2c2c2c"}]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{"color": "#000000"}]
          }
        ]
      });
    }
  }

  initializeAutocomplete() {
    const input = document.getElementById('address-search');
    this.autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: 'de' }, // Restrict to Germany, change as needed
      fields: ['place_id', 'geometry', 'name', 'formatted_address']
    });

    // Bind the autocomplete to the map's bounds
    this.autocomplete.bindTo('bounds', this.map);

    // Listen for place selection
    this.autocomplete.addListener('place_changed', () => {
      this.handlePlaceSelection();
    });
  }

  handlePlaceSelection() {
    const place = this.autocomplete.getPlace();
    
    if (!place.geometry || !place.geometry.location) {
      this.showError('No details available for this location');
      return;
    }

    // Center map on selected place
    this.map.setCenter(place.geometry.location);
    this.map.setZoom(19); // Higher zoom for building detection
    
    // Select the location
    this.selectLocation(place.geometry.location);
  }

  async detectBuildingCorners(location) {
    try {
      // Use Street View Static API to detect buildings
      const streetViewService = new google.maps.StreetViewService();
      
      // Check if street view is available at this location
      const streetViewData = await new Promise((resolve, reject) => {
        streetViewService.getPanorama({
          location: location,
          radius: 50,
          source: google.maps.StreetViewSource.OUTDOOR
        }, (data, status) => {
          if (status === 'OK') {
            resolve(data);
          } else {
            reject(status);
          }
        });
      });

      // Create a small search area around the selected point
      const bounds = new google.maps.LatLngBounds();
      const offset = 0.0001; // Approximately 10-15 meters
      
      bounds.extend(new google.maps.LatLng(
        location.lat() - offset,
        location.lng() - offset
      ));
      bounds.extend(new google.maps.LatLng(
        location.lat() + offset,
        location.lng() + offset
      ));

      // Use Places API to find nearby buildings
      const service = new google.maps.places.PlacesService(this.map);
      
      const nearbyBuildings = await new Promise((resolve, reject) => {
        service.nearbySearch({
          bounds: bounds,
          type: 'establishment'
        }, (results, status) => {
          if (status === 'OK') {
            resolve(results);
          } else {
            resolve([]); // Return empty array if no buildings found
          }
        });
      });

      // Generate building corner points based on the location
      this.generateBuildingCorners(location);
      
    } catch (error) {
      console.warn('Building detection failed, using estimated corners:', error);
      // Fallback: generate estimated building corners
      this.generateBuildingCorners(location);
    }
  }

  generateBuildingCorners(centerLocation) {
    // Clear existing building markers
    this.clearBuildingMarkers();
    
    // Generate 4 corner points around the selected location
    // This is a simplified approach - in a real application, you'd use
    // building outline data from cadastral maps or aerial imagery analysis
    const offset = 0.00005; // Approximately 5-6 meters
    
    const corners = [
      { // Top-left
        lat: centerLocation.lat() + offset,
        lng: centerLocation.lng() - offset,
        label: 'NW'
      },
      { // Top-right
        lat: centerLocation.lat() + offset,
        lng: centerLocation.lng() + offset,
        label: 'NE'
      },
      { // Bottom-right
        lat: centerLocation.lat() - offset,
        lng: centerLocation.lng() + offset,
        label: 'SE'
      },
      { // Bottom-left
        lat: centerLocation.lat() - offset,
        lng: centerLocation.lng() - offset,
        label: 'SW'
      }
    ];

    this.buildingCorners = [];
    this.buildingMarkers = [];

    corners.forEach((corner, index) => {
      const cornerLatLng = new google.maps.LatLng(corner.lat, corner.lng);
      
      const marker = new google.maps.Marker({
        position: cornerLatLng,
        map: this.map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="#276EF1" stroke="#ffffff" stroke-width="2"/>
              <text x="10" y="14" text-anchor="middle" font-family="Arial" font-size="10" fill="white">${corner.label}</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(20, 20),
          anchor: new google.maps.Point(10, 10)
        },
        title: `Building Corner ${corner.label}`,
        draggable: true
      });

      // Add click listener for corner selection
      marker.addListener('click', () => {
        this.selectBuildingCorner(index, marker);
      });

      // Add drag listener to update corner position
      marker.addListener('dragend', () => {
        this.updateBuildingCorner(index, marker.getPosition());
      });

      this.buildingMarkers.push(marker);
      this.buildingCorners.push({
        position: cornerLatLng,
        selected: false,
        label: corner.label
      });
    });

    // Draw building outline
    this.drawBuildingOutline();
    
    // Show building selection message
    this.showBuildingSelectionUI();
  }

  selectBuildingCorner(index, marker) {
    // Toggle selection state
    this.buildingCorners[index].selected = !this.buildingCorners[index].selected;
    
    // Update marker appearance
    const corner = this.buildingCorners[index];
    const color = corner.selected ? '#00D2AA' : '#276EF1';
    
    marker.setIcon({
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <text x="10" y="14" text-anchor="middle" font-family="Arial" font-size="10" fill="white">${corner.label}</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(20, 20),
      anchor: new google.maps.Point(10, 10)
    });

    this.updateBuildingSelection();
  }

  updateBuildingCorner(index, newPosition) {
    this.buildingCorners[index].position = newPosition;
    this.drawBuildingOutline();
  }

  drawBuildingOutline() {
    // Clear existing outline
    if (this.buildingOutline) {
      this.buildingOutline.setMap(null);
    }

    // Create polygon from corners
    const path = this.buildingCorners.map(corner => corner.position);
    
    this.buildingOutline = new google.maps.Polygon({
      paths: path,
      strokeColor: '#276EF1',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#276EF1',
      fillOpacity: 0.2,
      map: this.map
    });
  }

  updateBuildingSelection() {
    const selectedCorners = this.buildingCorners.filter(corner => corner.selected);
    
    // Update UI to show selected corners
    const selectionInfo = document.getElementById('corner-selection-status');
    if (selectionInfo) {
      selectionInfo.innerHTML = `
        <p><strong>Selected Corners:</strong> ${selectedCorners.length}/4</p>
        ${selectedCorners.length > 0 ? `<p>Selected: ${selectedCorners.map(c => c.label).join(', ')}</p>` : ''}
      `;
    }

    // Enable next step if at least 3 corners are selected
    const nextButton = document.getElementById('next-step-1');
    if (selectedCorners.length >= 3) {
      nextButton.disabled = false;
      nextButton.textContent = 'Analyze Selected Building';
    } else {
      nextButton.disabled = true;
      nextButton.textContent = `Select Building Corners (${selectedCorners.length}/3)`;
    }
  }

  showBuildingSelectionUI() {
    // Add building selection info to the widget
    const locationInfo = document.getElementById('selected-location');
    
    if (!document.getElementById('building-selection-info')) {
      const buildingUI = document.createElement('div');
      buildingUI.id = 'building-selection-info';
      buildingUI.className = 'building-selection';
      buildingUI.innerHTML = `
        <div class="building-instructions">
          <h4>🏢 Building Detection</h4>
          <p>Click on the blue corner markers to select the building area for solar analysis.</p>
          <p><strong>Instructions:</strong></p>
          <ul>
            <li>Drag corners to adjust building outline</li>
            <li>Click corners to select them (turns green)</li>
            <li>Select at least 3 corners to proceed</li>
          </ul>
        </div>
        <div id="corner-selection-status">
          <p><strong>Selected Corners:</strong> 0/4</p>
        </div>
      `;
      
      locationInfo.appendChild(buildingUI);
    }
  }

  clearBuildingMarkers() {
    if (this.buildingMarkers) {
      this.buildingMarkers.forEach(marker => marker.setMap(null));
      this.buildingMarkers = [];
    }
    
    if (this.buildingOutline) {
      this.buildingOutline.setMap(null);
      this.buildingOutline = null;
    }
    
    this.buildingCorners = [];
  }

  createGridSelection() {
    if (!this.selectedLocation || this.buildingCorners.length < 3) {
      this.showError('Please select a location and define building corners first.');
      return;
    }

    const selectedCorners = this.buildingCorners.filter(corner => corner.selected);
    if (selectedCorners.length < 3) {
      this.showError('Please select at least 3 building corners.');
      return;
    }

    // Create 3x3 meter grid within the building outline
    this.generateGridOverlay(selectedCorners);
    this.showStep(3);
  }

  generateGridOverlay(corners) {
    // Clear existing grid
    this.clearGridOverlay();

    // Calculate bounds of the selected building area
    const bounds = this.calculateBounds(corners);
    const gridSize = 3; // 3 meters

    // Create grid cells
    this.gridCells = [];
    const cellsPerSide = Math.max(2, Math.floor(Math.sqrt(this.calculateBuildingArea(corners)) / gridSize));

    const latStep = (bounds.north - bounds.south) / cellsPerSide;
    const lngStep = (bounds.east - bounds.west) / cellsPerSide;

    for (let i = 0; i < cellsPerSide; i++) {
      for (let j = 0; j < cellsPerSide; j++) {
        const cellBounds = {
          north: bounds.south + (i + 1) * latStep,
          south: bounds.south + i * latStep,
          east: bounds.west + (j + 1) * lngStep,
          west: bounds.west + j * lngStep
        };

        // Check if cell center is within building polygon
        const cellCenter = {
          lat: (cellBounds.north + cellBounds.south) / 2,
          lng: (cellBounds.east + cellBounds.west) / 2
        };

        if (this.isPointInPolygon(cellCenter, corners)) {
          const gridCell = new google.maps.Rectangle({
            bounds: cellBounds,
            strokeColor: '#276EF1',
            strokeOpacity: 0.6,
            strokeWeight: 1,
            fillColor: '#276EF1',
            fillOpacity: 0.1,
            map: this.map,
            clickable: true
          });

          gridCell.addListener('click', () => {
            this.toggleGridCell(gridCell, cellBounds);
          });

          this.gridCells.push({
            rectangle: gridCell,
            bounds: cellBounds,
            selected: false,
            id: `cell_${i}_${j}`
          });
        }
      }
    }

    this.updateGridSelectionStatus();
  }

  calculateBounds(corners) {
    let north = -90, south = 90, east = -180, west = 180;
    
    corners.forEach(corner => {
      const lat = corner.position.lat();
      const lng = corner.position.lng();
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    });

    return { north, south, east, west };
  }

  isPointInPolygon(point, polygon) {
    const x = point.lng;
    const y = point.lat;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].position.lng();
      const yi = polygon[i].position.lat();
      const xj = polygon[j].position.lng();
      const yj = polygon[j].position.lat();

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  toggleGridCell(gridCell, bounds) {
    const cellIndex = this.gridCells.findIndex(cell => cell.rectangle === gridCell);
    if cellIndex === -1) return;

    const cell = this.gridCells[cellIndex];
    cell.selected = !cell.selected;

    // Update visual appearance
    if (cell.selected) {
      gridCell.setOptions({
        fillColor: '#00D2AA',
        fillOpacity: 0.4,
        strokeColor: '#00D2AA',
        strokeWeight: 2
      });
    } else {
      gridCell.setOptions({
        fillColor: '#276EF1',
        fillOpacity: 0.1,
        strokeColor: '#276EF1',
        strokeWeight: 1
      });
    }

    this.updateGridSelectionStatus();
  }

  updateTiltAngle(value) {
    this.currentTilt = parseInt(value);
    document.getElementById('tilt-value').textContent = value == 90 ? `${value}° (Vertical)` : `${value}°`;
  }

  updatePanelLength(value) {
    this.panelLength = parseFloat(value);
    document.getElementById('panel-length-value').textContent = `${value}m`;
    this.updatePanelProperties();
  }

  updatePanelWidth(value) {
    this.panelWidth = parseFloat(value);
    document.getElementById('panel-width-value').textContent = `${value}m`;
    this.updatePanelProperties();
  }

  updatePanelWattage(value) {
    // Remove any non-numeric characters except for numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Update the input field to show only numeric value
    const inputField = document.getElementById('panel-wattage');
    if (inputField && inputField.value !== numericValue) {
      inputField.value = numericValue;
    }
    
    // Parse and validate the wattage
    const wattage = parseInt(numericValue);
    
    // Validate reasonable wattage range (100W to 800W per panel)
    if (!isNaN(wattage) && wattage >= 100 && wattage <= 800) {
      this.panelWattage = wattage;
      inputField.classList.remove('error');
    } else if (numericValue === '') {
      // Allow empty field temporarily
      inputField.classList.remove('error');
      return; // Don't update properties with invalid value
    } else {
      // Invalid value - show error but don't update
      inputField.classList.add('error');
      return;
    }
    
    this.updatePanelProperties();
  }

  updatePanelTilt(value) {
    this.panelTilt = parseInt(value);
    const displayText = value == 90 ? `${value}° (Vertical)` : 
                       value == 0 ? `${value}° (Horizontal)` : 
                       `${value}°`;
    document.getElementById('panel-tilt-value').textContent = displayText;
    this.updatePanelProperties();
  }

  updatePanelOrientation(value) {
    this.panelOrientation = value;
    this.updatePanelProperties();
  }

  updateRailingHeight(value) {
    this.railingHeight = parseFloat(value);
    document.getElementById('railing-height-value').textContent = `${value}m`;
    this.updatePanelProperties();
  }

  updatePanelMounting(value) {
    this.panelMounting = value;
    this.updatePanelProperties();
  }

  updatePanelProperties() {
    console.log('Updating panel properties');
    if (this.panelLine) {
      // Recalculate panel azimuth based on new side selection
      this.panelLine.panelAzimuth = this.calculatePanelAzimuth(this.panelLine.azimuth);
      
      // Recalculate panel area based on new mounting/dimensions
      this.panelLine.panelArea = this.calculatePanelArea(this.panelLine.length);
      this.panelLine.panelConfig = this.calculatePanelConfiguration(this.panelLine.length);
      
      console.log('Updated panel configuration:', this.panelLine.panelConfig);
      
      // Redraw visual elements
      this.drawPanelArea();
      this.updatePanelLineStatus();
      
      // Update step 3 summary if we're on step 3
      if (this.currentStep === 3) {
        this.updateStep3Summary();
        
        // Also check and update the calculate button
        const calculateBtn = document.getElementById('calculate-solar');
        if (calculateBtn && this.panelLine.panelConfig) {
          const config = this.panelLine.panelConfig;
          if (config.panelCount > 0) {
            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Calculate Solar Potential';
          } else {
            calculateBtn.disabled = true;
            calculateBtn.textContent = 'No panels can fit - adjust configuration';
          }
        }
      }
      
      console.log('Updated panel properties:', this.panelLine);
    } else {
      console.log('No panel line to update');
    }
  }

  updatePanelLineStatus() {
    const hasLine = this.panelLine !== null;
    
    document.getElementById('panel-line-status').textContent = hasLine ? 'Yes' : 'No';
    
    const detailsDiv = document.getElementById('panel-line-details');
    const nextBtn = document.getElementById('next-step-2');
    const clearBtn = document.getElementById('clear-panel-line');
    
    if (hasLine) {
      detailsDiv.classList.remove('hidden');
      const config = this.panelLine.panelConfig;
      
      document.getElementById('line-length').textContent = `${Math.round(this.panelLine.length * 10) / 10}m`;
      document.getElementById('panel-orientation').textContent = this.getOrientationName(this.panelLine.panelAzimuth);
      document.getElementById('panel-count').textContent = `${config.panelCount} panels`;
      document.getElementById('total-wattage').textContent = `${config.totalWattage}W`;
      document.getElementById('panel-area').textContent = `${Math.round(config.totalArea * 10) / 10} m²`;
      
      // Show constraint information
      if (config.isConstrainedByWattage) {
        document.getElementById('constraint-info').textContent = `Limited by ${this.maxSystemWattage}W max power`;
        document.getElementById('constraint-info').style.color = '#FF6B35';
      } else if (config.isConstrainedByLength) {
        document.getElementById('constraint-info').textContent = `Limited by available line length`;
        document.getElementById('constraint-info').style.color = '#276EF1';
      } else {
        document.getElementById('constraint-info').textContent = '';
      }
      
      nextBtn.disabled = false;
      nextBtn.textContent = 'Configure Panel Parameters';
      clearBtn.classList.remove('hidden');
    } else {
      detailsDiv.classList.add('hidden');
      nextBtn.disabled = true;
      nextBtn.textContent = this.isDrawingLine ? 'Click second point to complete line' : 'Draw Panel Mounting Line';
      clearBtn.classList.add('hidden');
    }
  }

  updateStep3Summary() {
    if (this.panelLine && this.panelLine.panelConfig) {
      const config = this.panelLine.panelConfig;
      
      console.log('Updating step 3 summary with config:', config);
      
      // Update the summary in step 3 (different IDs to avoid conflicts)
      const step3PanelArea = document.querySelector('#step-3 #panel-area');
      const step3PanelOrientation = document.querySelector('#step-3 #panel-orientation');
      const step3MountingType = document.getElementById('mounting-type');
      
      if (step3PanelArea) {
        step3PanelArea.textContent = `${Math.round(config.totalArea * 10) / 10} m²`;
        console.log('Updated step 3 panel area:', step3PanelArea.textContent);
      }
      if (step3PanelOrientation) {
        step3PanelOrientation.textContent = this.getOrientationName(this.panelLine.panelAzimuth);
      }
      if (step3MountingType) {
        step3MountingType.textContent = this.getMountingTypeName(this.panelMounting);
      }
      
      // Update constraint info in step 3
      const step3ConstraintInfo = document.querySelector('#step-3 #constraint-info');
      if (step3ConstraintInfo) {
        if (config.isConstrainedByWattage) {
          step3ConstraintInfo.textContent = `System limited by ${this.maxSystemWattage}W max power (${config.panelCount} panels)`;
          step3ConstraintInfo.style.color = '#FF6B35';
        } else {
          step3ConstraintInfo.textContent = `${config.panelCount} panels fit on ${Math.round(this.panelLine.length * 10) / 10}m line`;
          step3ConstraintInfo.style.color = '#276EF1';
        }
      }
      
      // Also enable the calculate button here if we have valid panels
      const calculateBtn = document.getElementById('calculate-solar');
      if (calculateBtn && config.panelCount > 0) {
        calculateBtn.disabled = false;
        calculateBtn.textContent = 'Calculate Solar Potential';
      }
    } else {
      console.log('No panel line or config available for step 3 summary');
    }
  }

  getMountingTypeName(mountingType) {
    switch(mountingType) {
      case 'railing': return 'Railing Mount (Vertical)';
      case 'angled': return 'Angled Mount (45°)';
      case 'horizontal': return 'Horizontal Mount';
      default: return 'Railing Mount';
    }
  }

  calculatePanelAzimuth(lineAzimuth) {
    // Calculate which direction panels face based on line direction and selected side
    let panelAzimuth;
    
    if (this.panelSide === 'left') {
      // Panels face 90 degrees to the left of line direction
      panelAzimuth = (lineAzimuth - 90 + 360) % 360;
    } else {
      // Panels face 90 degrees to the right of line direction
      panelAzimuth = (lineAzimuth + 90) % 360;
    }
    
    return panelAzimuth;
  }

  getOrientationName(azimuth) {
    // Convert azimuth to compass direction name
    if (azimuth >= 337.5 || azimuth < 22.5) return 'North';
    if (azimuth >= 22.5 && azimuth < 67.5) return 'Northeast';
    if (azimuth >= 67.5 && azimuth < 112.5) return 'East';
    if (azimuth >= 112.5 && azimuth < 157.5) return 'Southeast';
    if (azimuth >= 157.5 && azimuth < 202.5) return 'South';
    if (azimuth >= 202.5 && azimuth < 247.5) return 'Southwest';
    if (azimuth >= 247.5 && azimuth < 292.5) return 'West';
    if (azimuth >= 292.5 && azimuth < 337.5) return 'Northwest';
    return 'Unknown';
  }

  clearPanelLine() {
    // Clear all visual elements
    if (this.panelLineVisual) {
      this.panelLineVisual.setMap(null);
      this.panelLineVisual = null;
    }
    
    if (this.panelAreaVisual) {
      this.panelAreaVisual.setMap(null);
      this.panelAreaVisual = null;
    }
    
    if (this.startMarker) {
      this.startMarker.setMap(null);
      this.startMarker = null;
    }
    
    if (this.endMarker) {
      this.endMarker.setMap(null);
      this.endMarker = null;
    }
    
    // Reset state
    this.panelLine = null;
    this.isDrawingLine = false;
    this.lineStartPoint = null;
    
    // Update UI
    this.updatePanelLineStatus();
  }

  /**
   * Calculate solar power output with German balcony solar regulations
   * - Max 800W AC output to grid (inverter limit)
   * - Max 2000W DC panels allowed
   * - Daily solar irradiance curve modeling
   * - Inverter clipping calculations
   */
  calculateGermanSolarOutput(solarData, panelConfig, efficiency) {
    const MAX_INVERTER_OUTPUT_W = 800; // German regulation: max 800W AC to grid
    const MAX_PANEL_CAPACITY_W = 2000; // German regulation: max 2000W DC panels
    const SYSTEM_EFFICIENCY = 0.85; // 85% system efficiency (inverter, wiring losses)
    
    console.log('=== GERMAN BALCONY SOLAR CALCULATION ===');
    console.log('Panel DC capacity:', panelConfig.totalWattage, 'W');
    console.log('Max inverter AC output:', MAX_INVERTER_OUTPUT_W, 'W');
    console.log('Max allowed DC panels:', MAX_PANEL_CAPACITY_W, 'W');
    
    // Check if system exceeds German limits
    const exceedsInverterCapacity = panelConfig.totalWattage * SYSTEM_EFFICIENCY > MAX_INVERTER_OUTPUT_W;
    const exceedsPanelLimit = panelConfig.totalWattage > MAX_PANEL_CAPACITY_W;
    
    if (exceedsPanelLimit) {
      console.warn('⚠️ System exceeds 2000W DC limit!');
    }
    
    // Get annual sunshine hours from Solar API or use default
    let annualSunshineHours = 1600; // Default for Central Europe
    if (solarData && solarData.solarPotential && solarData.solarPotential.maxSunshineHoursPerYear) {
      annualSunshineHours = solarData.solarPotential.maxSunshineHoursPerYear;
    }
    
    // Generate realistic daily solar irradiance curve for Germany
    const hourlyIrradiance = this.generateGermanSolarCurve();
    
    // Calculate energy production with inverter clipping
    const dailyProduction = this.calculateDailyEnergyWithClipping(
      panelConfig.totalWattage,
      hourlyIrradiance,
      efficiency,
      SYSTEM_EFFICIENCY,
      MAX_INVERTER_OUTPUT_W
    );
    
    // Calculate annual production (average day × 365)
    const annualEnergyProduction = dailyProduction.totalEnergy * 365;
    const annualEnergyLostToClipping = dailyProduction.energyLostToClipping * 365;
    
    // Calculate clipping statistics
    const clippingLossPercentage = dailyProduction.energyLostToClipping > 0 
      ? (annualEnergyLostToClipping / (annualEnergyProduction + annualEnergyLostToClipping)) * 100 
      : 0;
    
    console.log('Daily energy production (clipped):', Math.round(dailyProduction.totalEnergy), 'Wh');
    console.log('Daily energy lost to clipping:', Math.round(dailyProduction.energyLostToClipping), 'Wh');
    console.log('Annual energy production:', Math.round(annualEnergyProduction), 'kWh');
    console.log('Annual clipping loss:', Math.round(clippingLossPercentage * 10) / 10, '%');
    console.log('Peak instantaneous power:', Math.round(dailyProduction.maxInstantaneousPower), 'W');
    console.log('Hours clipped per day:', dailyProduction.hoursClippedPerDay);
    console.log('==========================================');
    
    return {
      annualEnergyProduction: Math.round(annualEnergyProduction / 1000), // Convert to kWh
      unclippedEstimate: Math.round((annualEnergyProduction + annualEnergyLostToClipping) / 1000),
      energyLostToClipping: Math.round(annualEnergyLostToClipping / 1000),
      clippingLossPercentage: Math.round(clippingLossPercentage * 10) / 10,
      hoursClippedPerDay: dailyProduction.hoursClippedPerDay,
      maxInstantaneousPower: Math.round(dailyProduction.maxInstantaneousPower),
      maxInverterOutput: MAX_INVERTER_OUTPUT_W,
      isClippingSignificant: clippingLossPercentage > 5,
      exceedsInverterCapacity,
      exceedsPanelLimit,
      isCompliantWithGermanRules: !exceedsPanelLimit
    };
  }

  /**
   * Generate realistic daily solar irradiance curve for Germany
   * Returns normalized values (0-1) for each hour of the day
   */
  generateGermanSolarCurve() {
    // Realistic solar curve for Central Europe (Germany) - summer average
    // Accounts for latitude ~51°N, seasonal variations, weather patterns
    return [
      0,    // 00:00 - Night
      0,    // 01:00 - Night
      0,    // 02:00 - Night
      0,    // 03:00 - Night
      0,    // 04:00 - Night
      0.02, // 05:00 - Early dawn
      0.08, // 06:00 - Dawn
      0.20, // 07:00 - Early morning
      0.35, // 08:00 - Morning
      0.55, // 09:00 - Mid morning
      0.75, // 10:00 - Late morning
      0.90, // 11:00 - Pre-noon
      1.00, // 12:00 - Peak solar noon
      0.95, // 13:00 - Early afternoon
      0.85, // 14:00 - Afternoon
      0.70, // 15:00 - Mid afternoon
      0.50, // 16:00 - Late afternoon
      0.30, // 17:00 - Early evening
      0.15, // 18:00 - Evening
      0.05, // 19:00 - Dusk
      0.01, // 20:00 - Late dusk
      0,    // 21:00 - Night
      0,    // 22:00 - Night
      0     // 23:00 - Night
    ];
  }

  /**
   * Calculate daily energy production with hourly inverter clipping
   */
  calculateDailyEnergyWithClipping(dcCapacityW, hourlyIrradiance, efficiency, systemEfficiency, maxInverterOutputW) {
    let totalEnergyWh = 0;
    let energyLostToClippingWh = 0;
    let maxInstantaneousPower = 0;
    let hoursClipped = 0;
    
    for (let hour = 0; hour < 24; hour++) {
      const irradianceRatio = hourlyIrradiance[hour];
      
      if (irradianceRatio > 0) {
        // Calculate instantaneous DC power output
        const dcPowerW = dcCapacityW * irradianceRatio * efficiency;
        
        // Apply system efficiency to get AC power before inverter
        const acPowerBeforeClippingW = dcPowerW * systemEfficiency;
        
        // Apply inverter clipping
        const acPowerAfterClippingW = Math.min(acPowerBeforeClippingW, maxInverterOutputW);
        
        // Track statistics
        maxInstantaneousPower = Math.max(maxInstantaneousPower, acPowerBeforeClippingW);
        
        if (acPowerBeforeClippingW > maxInverterOutputW) {
          hoursClipped++;
          energyLostToClippingWh += (acPowerBeforeClippingW - maxInverterOutputW);
        }
        
        // Add to total energy (1 hour of generation)
        totalEnergyWh += acPowerAfterClippingW;
      }
    }
    
    return {
      totalEnergy: totalEnergyWh,
      energyLostToClipping: energyLostToClippingWh,
      maxInstantaneousPower: maxInstantaneousPower,
      hoursClippedPerDay: hoursClipped
    };
  }
