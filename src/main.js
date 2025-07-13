// Core SolarMapApp class - main controller
import './style.css'
import { SolarAPIService } from './solarAPI.js'
import { MapOverlayService } from './mapOverlay.js'
import { MapController } from './modules/mapController.js'
import { LocationController } from './modules/locationController.js'
import { PanelController } from './modules/panelController.js'
import { SolarCalculator } from './modules/solarCalculator.js'
import { UIController } from './modules/uiController.js'

// Configuration from environment variables
const CONFIG = {
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  SOLAR_API_KEY: import.meta.env.VITE_SOLAR_API_KEY,
  DEFAULT_CENTER: { 
    lat: parseFloat(import.meta.env.VITE_DEFAULT_LAT) || 49.9929, 
    lng: parseFloat(import.meta.env.VITE_DEFAULT_LNG) || 8.2473 
  },
  DEFAULT_ZOOM: parseInt(import.meta.env.VITE_DEFAULT_ZOOM) || 13,
  USE_MOCK_SOLAR_DATA: import.meta.env.VITE_USE_MOCK_SOLAR_DATA === 'true'
};

// Validate required environment variables
if (!CONFIG.GOOGLE_MAPS_API_KEY) {
  console.error('❌ Missing VITE_GOOGLE_MAPS_API_KEY in environment variables');
  console.log('📝 Please create a .env file with your API keys. See .env.example for reference.');
}

if (!CONFIG.SOLAR_API_KEY) {
  console.error('❌ Missing VITE_SOLAR_API_KEY in environment variables');
}

class SolarMapApp {
  constructor() {
    this.config = CONFIG;
    
    // Core properties
    this.map = null;
    this.selectedLocation = null;
    this.currentStep = 1;
    this.currentSolarData = null;
    
    // Controllers
    this.mapController = null;
    this.locationController = null;
    this.panelController = null;
    this.solarCalculator = null;
    this.uiController = null;
    
    // Services
    this.solarAPI = null;
    this.mapOverlay = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadGoogleMapsAPI();
      this.initializeMap();
      this.initializeServices();
      this.initializeControllers();
      this.setupEventListeners();
      
      // Only call showStep if uiController was successfully initialized
      if (this.uiController) {
        this.uiController.showStep(1);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load Google Maps. Please check your API key and internet connection.');
    }
  }

  loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Set up the callback function globally
      window.initMap = () => {
        resolve();
        delete window.initMap; // Clean up
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places,geometry,visualization,marker&v=beta&callback=initMap&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      
      document.head.appendChild(script);
    });
  }

  initializeMap() {
    const mapOptions = {
      center: CONFIG.DEFAULT_CENTER,
      zoom: CONFIG.DEFAULT_ZOOM,
      mapTypeId: google.maps.MapTypeId.SATELLITE, // Pure satellite view
      // Remove Google Maps default controls
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      mapId: 'solarized-map', // Required for AdvancedMarkerElement
      // Force satellite view settings
      tilt: 0, // Ensure top-down view (no 45° imagery)
      heading: 0, // North-up orientation
      restriction: {
        strictBounds: false,
      },
      // Satellite specific options
      mapTypeControlOptions: {
        mapTypeIds: [google.maps.MapTypeId.SATELLITE]
      }
    };

    this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
  }

  initializeServices() {
    this.solarAPI = new SolarAPIService(CONFIG.SOLAR_API_KEY);
    this.mapOverlay = new MapOverlayService(this.map);
  }

  initializeControllers() {
    this.mapController = new MapController(this.map);
    this.locationController = new LocationController(this.map, this);
    this.panelController = new PanelController(this.map, this);
    this.solarCalculator = new SolarCalculator(this.solarAPI);
    this.uiController = new UIController(this);
    
    // Ensure satellite view is enforced from the start
    if (this.mapController) {
      this.mapController.enforceSatelliteTopDown();
    }
  }

  setupEventListeners() {
    // Map click handler
    this.map.addListener('click', (event) => {
      if (this.currentStep === 1) {
        this.locationController.selectLocation(event.latLng);
      } else if (this.currentStep === 2) {
        this.panelController.handleLineDrawing(event.latLng);
      }
    });

    // UI event listeners
    this.uiController.setupEventListeners();
    this.mapController.setupEventListeners();
    this.locationController.setupEventListeners();
    this.panelController.setupEventListeners();
  }

  // Public methods for controllers to communicate
  setSelectedLocation(location) {
    this.selectedLocation = location;
  }

  setCurrentSolarData(data) {
    this.currentSolarData = data;
  }

  showStep(stepNumber) {
    this.currentStep = stepNumber;
    this.uiController.showStep(stepNumber);
  }

  showError(message) {
    if (this.uiController) {
      this.uiController.showError(message);
    } else {
      // Fallback if uiController is not initialized
      console.error('UI Error:', message);
      alert(message); // Simple fallback
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SolarMapApp();
});

export { SolarMapApp };
