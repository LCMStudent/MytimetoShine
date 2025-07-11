// Core SolarMapApp class - main controller
import './style.css'
import { SolarAPIService } from './solarAPI.js'
import { MapOverlayService } from './mapOverlay.js'
import { MapController } from './modules/mapController.js'
import { LocationController } from './modules/locationController.js'
import { PanelController } from './modules/panelController.js'
import { SolarCalculator } from './modules/solarCalculator.js'
import { UIController } from './modules/uiController.js'

// Configuration
const CONFIG = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyB8sldkCqW9munVjUQ7pdZR2F3C6Izb9WI',
  SOLAR_API_KEY: 'AIzaSyB8sldkCqW9munVjUQ7pdZR2F3C6Izb9WI',
  DEFAULT_CENTER: { lat: 49.9929, lng: 8.2473 },
  DEFAULT_ZOOM: 13,
  USE_MOCK_SOLAR_DATA: false
};

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
      this.uiController.showStep(1);
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
      // Remove Google Maps default controls
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
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
    this.uiController.showError(message);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SolarMapApp();
});

export { SolarMapApp };
