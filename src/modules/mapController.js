/**
 * MapController - Handles map initialization and base functionality
 */
export class MapController {
  constructor(map) {
    this.map = map;
    this.isMinimized = false;
  }

  setupEventListeners() {
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

    // Widget minimize/maximize
    document.getElementById('minimize-btn').addEventListener('click', () => {
      this.toggleWidget();
    });

    // Responsive behavior
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Ensure satellite view stays top-down
    this.setupSatelliteViewListeners();

    // Initialize theme from localStorage or default to light
    this.initializeTheme();
  }

  setupSatelliteViewListeners() {
    // Listen for map type changes to ensure satellite stays top-down
    this.map.addListener('maptypeid_changed', () => {
      if (this.map.getMapTypeId() === google.maps.MapTypeId.SATELLITE) {
        this.enforceSatelliteTopDown();
      }
    });

    // Listen for zoom changes to prevent automatic tilt changes
    this.map.addListener('zoom_changed', () => {
      if (this.map.getMapTypeId() === google.maps.MapTypeId.SATELLITE) {
        this.enforceSatelliteTopDown();
      }
    });

    // Listen for tilt changes and reset to 0
    this.map.addListener('tilt_changed', () => {
      if (this.map.getMapTypeId() === google.maps.MapTypeId.SATELLITE && this.map.getTilt() !== 0) {
        this.map.setTilt(0);
      }
    });

    // Listen for heading changes and reset to 0 (north-up)
    this.map.addListener('heading_changed', () => {
      if (this.map.getMapTypeId() === google.maps.MapTypeId.SATELLITE && this.map.getHeading() !== 0) {
        this.map.setHeading(0);
      }
    });
  }

  enforceSatelliteTopDown() {
    // Ensure satellite view is always top-down (no 45° imagery)
    if (this.map.getTilt() !== 0) {
      this.map.setTilt(0);
    }
    if (this.map.getHeading() !== 0) {
      this.map.setHeading(0);
    }
  }

  toggleMapType(type) {
    const buttons = document.querySelectorAll('.control-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    if (type === 'satellite') {
      this.map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      document.getElementById('toggle-satellite').classList.add('active');
      // Ensure satellite view is top-down
      this.enforceSatelliteTopDown();
    } else if (type === 'terrain') {
      this.map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
      document.getElementById('toggle-terrain').classList.add('active');
    }
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
    // Note: When using mapId, styles are controlled via Google Cloud Console
    if (this.map) {
      console.log(`Map theme requested: ${theme}. Styles are controlled via Google Cloud Console when using mapId.`);
    }
  }

  // Note: applyDarkMapStyle method removed - styles are controlled via Google Cloud Console when using mapId
}