/**
 * LocationController - Handles location selection and address search
 */
export class LocationController {
  constructor(map, app) {
    this.map = map;
    this.app = app;
    this.geocoder = new google.maps.Geocoder();
    this.autocompleteElement = null;
    this.markers = [];
    
    this.initializeAutocomplete();
  }

  setupEventListeners() {
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
          if (!this.app.selectedLocation) {
            this.searchAddress();
          }
        }, 100);
      }
    });

    // Step navigation
    document.getElementById('next-step-1').addEventListener('click', () => {
      this.app.showStep(2);
    });

    document.getElementById('back-step-1').addEventListener('click', () => {
      this.app.showStep(1);
    });
  }

  initializeAutocomplete() {
    try {
      const input = document.getElementById('address-search');
      
      // Create the new PlaceAutocompleteElement
      this.autocompleteElement = new google.maps.places.PlaceAutocompleteElement();
      
      // Configure the element
      this.autocompleteElement.componentRestrictions = { country: 'de' }; // Restrict to Germany
      this.autocompleteElement.types = ['address'];

      // Replace the input with the autocomplete element
      input.replaceWith(this.autocompleteElement);
      this.autocompleteElement.id = 'address-search';
      this.autocompleteElement.className = 'search-input';
      this.autocompleteElement.placeholder = 'Search for an address...';

      // Listen for place selection
      this.autocompleteElement.addEventListener('gmp-placeselect', (event) => {
        this.handlePlaceSelection(event.place);
      });
    } catch (error) {
      console.error('Failed to initialize autocomplete:', error);
      // Keep the original input as fallback
    }
  }

  handlePlaceSelection(place) {
    try {
      if (!place) {
        this.app.uiController.showError('No place selected');
        return;
      }

      // Handle different place object structures
      let location;
      if (place.geometry && place.geometry.location) {
        location = place.geometry.location;
      } else if (place.location) {
        location = place.location;
      } else {
        this.app.uiController.showError('No location details available for this place');
        return;
      }

      // Center map on selected place
      this.map.setCenter(location);
      this.map.setZoom(19); // Higher zoom for building detection
      
      // Select the location
      this.selectLocation(location);
    } catch (error) {
      console.error('Error handling place selection:', error);
      this.app.uiController.showError('Failed to process selected location');
    }
  }

  selectLocation(latLng) {
    // Clear existing markers
    this.clearMarkers();
    
    // Create marker content with SVG icon
    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="12" fill="#FF6B35" stroke="#ffffff" stroke-width="3"/>
        <circle cx="16" cy="16" r="6" fill="#ffffff"/>
      </svg>
    `;
    
    // Add marker using AdvancedMarkerElement
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: latLng,
      map: this.map,
      title: 'Selected Location',
      content: markerElement
    });
    
    this.markers.push(marker);
    this.app.setSelectedLocation({
      lat: latLng.lat(),
      lng: latLng.lng()
    });
    
    // Reverse geocode to get address
    this.reverseGeocode(latLng).then(address => {
      // Update UI with location info
      this.updateLocationInfo(latLng, address);
    }).catch(error => {
      console.error('Reverse geocoding failed:', error);
      this.updateLocationInfo(latLng, 'Address not found');
    });
  }

  async reverseGeocode(latLng) {
    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          reject(status);
        }
      });
    });
  }

  updateLocationInfo(latLng, address) {
    document.getElementById('location-coords').textContent = 
      `${latLng.lat().toFixed(6)}, ${latLng.lng().toFixed(6)}`;
    document.getElementById('location-address').textContent = address;
    
    // Update the autocomplete element value
    if (this.autocompleteElement) {
      this.autocompleteElement.value = address;
    }
    
    // Show location info and next button
    document.getElementById('selected-location').classList.remove('hidden');
    document.getElementById('next-step-1').classList.remove('hidden');
  }

  async searchAddress() {
    // PlaceAutocompleteElement doesn't have a value property like regular inputs
    // For now, we'll skip manual search as the autocomplete handles place selection automatically
    console.log('Manual address search not available with PlaceAutocompleteElement');
    return;
  }

  clearMarkers() {
    this.markers.forEach(marker => {
      marker.map = null; // Remove marker from map
    });
    this.markers = [];
  }
}
