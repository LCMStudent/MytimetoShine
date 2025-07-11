// Map Overlay Service for visualizing solar data on Google Maps

export class MapOverlayService {
  constructor(map) {
    this.map = map;
    this.overlays = [];
    this.heatmapLayer = null;
  }

  /**
   * Add solar potential overlay to the map
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Processed solar data
   */
  addSolarOverlay(location, solarData) {
    this.clearOverlays();

    // Create different overlays based on the data available
    this.addRoofSegmentOverlay(location, solarData);
    this.addSolarPotentialHeatmap(location, solarData);
    this.addSolarMetricsInfo(location, solarData);
  }

  /**
   * Add roof segment overlay
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Solar data
   */
  addRoofSegmentOverlay(location, solarData) {
    // Create a polygon representing the roof area
    const roofBounds = this.generateRoofBounds(location);
    
    // Color based on solar potential
    const efficiency = Math.min(solarData.annualEnergyKwh / 5000, 1); // Normalize to 0-1
    const fillColor = this.getEfficiencyColor(efficiency);

    const roofOverlay = new google.maps.Polygon({
      paths: roofBounds,
      strokeColor: '#FF9500',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: fillColor,
      fillOpacity: 0.4,
      map: this.map
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: this.createSolarInfoContent(solarData),
      position: new google.maps.LatLng(location.lat, location.lng)
    });

    roofOverlay.addListener('click', () => {
      infoWindow.open(this.map);
    });

    this.overlays.push(roofOverlay);
    this.overlays.push(infoWindow);
  }

  /**
   * Add solar potential heatmap
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Solar data
   */
  addSolarPotentialHeatmap(location, solarData) {
    // Generate heat map points around the location
    const heatmapData = this.generateHeatmapData(location, solarData);

    if (this.heatmapLayer) {
      this.heatmapLayer.setMap(null);
    }

    this.heatmapLayer = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: 50,
      opacity: 0.6,
      gradient: [
        'rgba(0, 0, 255, 0)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 255, 0, 1)',
        'rgba(255, 255, 0, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    });

    this.heatmapLayer.setMap(this.map);
  }

  /**
   * Add solar metrics information overlay
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Solar data
   */
  addSolarMetricsInfo(location, solarData) {
    // Create custom overlay for displaying solar metrics
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'solar-metrics-overlay';
    metricsDiv.innerHTML = `
      <div class="metrics-card">
        <h4>Solar Analysis</h4>
        <div class="metric">
          <span class="metric-value">${solarData.annualEnergyKwh.toLocaleString()}</span>
          <span class="metric-label">kWh/year</span>
        </div>
        <div class="metric">
          <span class="metric-value">${solarData.panelCount}</span>
          <span class="metric-label">panels</span>
        </div>
        <div class="metric">
          <span class="metric-value">${solarData.co2SavingsKgPerYear.toLocaleString()}</span>
          <span class="metric-label">kg CO₂ saved</span>
        </div>
      </div>
    `;

    // Add CSS for the overlay
    this.addOverlayStyles();

    // Create custom overlay class
    class SolarMetricsOverlay extends google.maps.OverlayView {
      constructor(position, content, map) {
        super();
        this.position = position;
        this.content = content;
        this.setMap(map);
      }

      onAdd() {
        this.div = this.content;
        const panes = this.getPanes();
        panes.overlayLayer.appendChild(this.div);
      }

      draw() {
        const overlayProjection = this.getProjection();
        const position = overlayProjection.fromLatLngToDivPixel(this.position);
        
        if (position) {
          this.div.style.left = (position.x - 100) + 'px';
          this.div.style.top = (position.y - 150) + 'px';
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
        }
      }
    }

    const metricsOverlay = new SolarMetricsOverlay(
      new google.maps.LatLng(location.lat + 0.0005, location.lng + 0.0005),
      metricsDiv,
      this.map
    );

    this.overlays.push(metricsOverlay);
  }

  /**
   * Generate roof bounds for visualization
   * @param {Object} location - {lat, lng}
   * @returns {Array} Array of LatLng coordinates
   */
  generateRoofBounds(location) {
    const offset = 0.0002; // Approximate building size
    return [
      new google.maps.LatLng(location.lat - offset, location.lng - offset),
      new google.maps.LatLng(location.lat - offset, location.lng + offset),
      new google.maps.LatLng(location.lat + offset, location.lng + offset),
      new google.maps.LatLng(location.lat + offset, location.lng - offset)
    ];
  }

  /**
   * Generate heatmap data points
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Solar data
   * @returns {Array} Heatmap data points
   */
  generateHeatmapData(location, solarData) {
    const points = [];
    const intensity = Math.min(solarData.annualEnergyKwh / 3000, 3); // Weight based on energy potential
    
    // Generate points in a grid around the location
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const lat = location.lat + (i * 0.0001);
        const lng = location.lng + (j * 0.0001);
        
        // Vary intensity based on distance from center
        const distance = Math.sqrt(i * i + j * j);
        const pointIntensity = Math.max(0, intensity - distance * 0.5);
        
        if (pointIntensity > 0) {
          points.push({
            location: new google.maps.LatLng(lat, lng),
            weight: pointIntensity
          });
        }
      }
    }
    
    return points;
  }

  /**
   * Get color based on efficiency
   * @param {number} efficiency - Efficiency value (0-1)
   * @returns {string} Color hex code
   */
  getEfficiencyColor(efficiency) {
    if (efficiency >= 0.8) return '#00FF00'; // Green - High efficiency
    if (efficiency >= 0.6) return '#FFFF00'; // Yellow - Medium-high efficiency
    if (efficiency >= 0.4) return '#FFA500'; // Orange - Medium efficiency
    if (efficiency >= 0.2) return '#FF6B47'; // Red-orange - Low-medium efficiency
    return '#FF0000'; // Red - Low efficiency
  }

  /**
   * Create info window content for solar data
   * @param {Object} solarData - Solar data
   * @returns {string} HTML content
   */
  createSolarInfoContent(solarData) {
    return `
      <div class="solar-info-window">
        <h3>Solar Potential Analysis</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>Annual Energy:</strong> ${solarData.annualEnergyKwh.toLocaleString()} kWh
          </div>
          <div class="info-item">
            <strong>Panel Capacity:</strong> ${solarData.panelCount} panels
          </div>
          <div class="info-item">
            <strong>CO₂ Savings:</strong> ${solarData.co2SavingsKgPerYear.toLocaleString()} kg/year
          </div>
          <div class="info-item">
            <strong>Sunshine Hours:</strong> ${solarData.sunshineHoursPerYear.toLocaleString()} hours/year
          </div>
          <div class="info-item">
            <strong>Monthly Savings:</strong> ~$${solarData.monthlySavings}
          </div>
          <div class="info-item">
            <strong>Tree Equivalent:</strong> ${solarData.carbonOffsetTrees} trees
          </div>
        </div>
        ${solarData.isMockData ? '<p class="mock-notice">* Demo data - Connect APIs for real analysis</p>' : ''}
      </div>
    `;
  }

  /**
   * Add CSS styles for overlays
   */
  addOverlayStyles() {
    if (document.getElementById('solar-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'solar-overlay-styles';
    style.textContent = `
      .solar-metrics-overlay {
        position: absolute;
        pointer-events: none;
        z-index: 100;
      }

      .metrics-card {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        border: 2px solid #ff9500;
        min-width: 200px;
        pointer-events: auto;
      }

      .metrics-card h4 {
        margin: 0 0 8px 0;
        color: #ff9500;
        font-size: 14px;
        font-weight: 600;
      }

      .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .metric-value {
        font-weight: 600;
        color: #333;
      }

      .metric-label {
        color: #666;
        font-size: 11px;
      }

      .solar-info-window {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 300px;
      }

      .solar-info-window h3 {
        margin: 0 0 12px 0;
        color: #ff9500;
        font-size: 16px;
        border-bottom: 2px solid #ff9500;
        padding-bottom: 4px;
      }

      .info-grid {
        display: grid;
        gap: 8px;
      }

      .info-item {
        padding: 6px 0;
        border-bottom: 1px solid #eee;
        font-size: 13px;
      }

      .info-item:last-child {
        border-bottom: none;
      }

      .info-item strong {
        color: #333;
      }

      .mock-notice {
        margin-top: 12px;
        padding: 8px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        font-size: 11px;
        color: #856404;
        text-align: center;
      }

      .advanced-solar-info {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 400px;
        min-width: 350px;
      }

      .advanced-solar-info h3 {
        margin: 0 0 15px 0;
        color: #ff9500;
        font-size: 18px;
        border-bottom: 2px solid #ff9500;
        padding-bottom: 8px;
        text-align: center;
      }

      .advanced-solar-info .info-grid {
        display: grid;
        gap: 15px;
      }

      .advanced-solar-info .info-section {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #ff9500;
      }

      .advanced-solar-info .info-section h4 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .advanced-solar-info .info-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #e9ecef;
        font-size: 13px;
      }

      .advanced-solar-info .info-item:last-child {
        border-bottom: none;
      }

      .advanced-solar-info .info-item strong {
        color: #495057;
        font-weight: 500;
      }      .advanced-solar-info .mock-notice {
        margin-top: 12px;
        padding: 8px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 4px;
        font-size: 11px;
        color: #856404;
        text-align: center;
        font-style: italic;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Clear all overlays from the map
   */
  clearOverlays() {
    this.overlays.forEach(overlay => {
      if (overlay.setMap) {
        overlay.setMap(null);
      } else if (overlay.map !== undefined) {
        // Handle AdvancedMarkerElement
        overlay.map = null;
      } else if (overlay.close) {
        overlay.close();
      }
    });
    this.overlays = [];

    if (this.heatmapLayer) {
      this.heatmapLayer.setMap(null);
      this.heatmapLayer = null;
    }
  }

  /**
   * Toggle overlay visibility
   * @param {boolean} visible - Whether overlays should be visible
   */
  toggleOverlays(visible) {
    this.overlays.forEach(overlay => {
      if (overlay.setMap) {
        overlay.setMap(visible ? this.map : null);
      } else if (overlay.map !== undefined) {
        // Handle AdvancedMarkerElement
        overlay.map = visible ? this.map : null;
      }
    });

    if (this.heatmapLayer) {
      this.heatmapLayer.setMap(visible ? this.map : null);
    }
  }

  /**
   * Add advanced solar overlay with grid visualization and parameters
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Advanced solar data
   * @param {Object} config - Configuration including grid cells and parameters
   */
  addAdvancedSolarOverlay(location, solarData, config) {
    this.clearOverlays();

    // Add building outline
    if (config.buildingOutline) {
      const advancedOutline = new google.maps.Polygon({
        paths: config.buildingOutline.getPath(),
        strokeColor: '#FF9500',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        fillColor: 'transparent',
        map: this.map
      });
      this.overlays.push(advancedOutline);
    }

    // Highlight selected grid cells
    if (config.selectedGridCells) {
      config.selectedGridCells.forEach(cell => {
        const selectedOverlay = new google.maps.Rectangle({
          bounds: cell.bounds,
          strokeColor: '#00D2AA',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#00D2AA',
          fillOpacity: 0.3,
          map: this.map
        });
        this.overlays.push(selectedOverlay);
      });
    }

    // Add azimuth direction indicator
    if (config.azimuth !== undefined) {
      this.addAzimuthIndicator(location, config.azimuth);
    }

    // Add efficiency indicator based on parameters
    const efficiency = solarData.efficiencyFactor || 70;
    this.addEfficiencyIndicator(location, efficiency);

    // Add detailed info window
    this.addAdvancedInfoWindow(location, solarData, config);

    // Add parameter-based heatmap
    this.addParameterizedHeatmap(location, solarData, config);
  }

  /**
   * Add azimuth direction indicator
   * @param {Object} location - Center location
   * @param {number} azimuth - Azimuth angle (0-359°)
   */
  addAzimuthIndicator(location, azimuth) {
    // Convert azimuth to radians and calculate direction
    const angleRad = (azimuth - 90) * Math.PI / 180; // Adjust for map orientation
    const distance = 0.0003; // Offset distance

    const arrowEnd = {
      lat: location.lat + Math.cos(angleRad) * distance,
      lng: location.lng + Math.sin(angleRad) * distance
    };

    // Create arrow line
    const arrowLine = new google.maps.Polyline({
      path: [location, arrowEnd],
      geodesic: true,
      strokeColor: '#FF6B00',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: this.map
    });

    // Create arrow head marker using AdvancedMarkerElement
    const arrowElement = document.createElement('div');
    arrowElement.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" style="transform: rotate(${azimuth}deg);">
        <path d="M12 2L22 12L12 22L12 17L2 17L2 7L12 7Z" fill="#FF6B00" stroke="#FF6B00" stroke-width="2"/>
      </svg>
    `;
    arrowElement.style.cursor = 'pointer';
    arrowElement.title = `Azimuth: ${azimuth}°`;
    
    const arrowMarker = new google.maps.marker.AdvancedMarkerElement({
      position: arrowEnd,
      map: this.map,
      content: arrowElement
    });

    this.overlays.push(arrowLine);
    this.overlays.push(arrowMarker);
  }

  /**
   * Add efficiency indicator circle
   * @param {Object} location - Center location
   * @param {number} efficiency - Efficiency percentage
   */
  addEfficiencyIndicator(location, efficiency) {
    const radius = Math.max(20, efficiency / 2); // Scale radius with efficiency
    const color = this.getEfficiencyColor(efficiency / 100);

    const efficiencyCircle = new google.maps.Circle({
      center: location,
      radius: radius,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.2,
      map: this.map
    });

    this.overlays.push(efficiencyCircle);
  }

  /**
   * Add advanced info window with detailed metrics
   * @param {Object} location - Location for info window
   * @param {Object} solarData - Solar data
   * @param {Object} config - Configuration data
   */
  addAdvancedInfoWindow(location, solarData, config) {
    const infoContent = `
      <div class="advanced-solar-info">
        <h3>🔋 Advanced Solar Analysis</h3>
        <div class="info-grid">
          <div class="info-section">
            <h4>Configuration</h4>
            <div class="info-item">
              <strong>Selected Area:</strong> ${solarData.selectedGridArea} m²
            </div>
            <div class="info-item">
              <strong>Grid Cells:</strong> ${solarData.selectedGridCount}
            </div>
            <div class="info-item">
              <strong>Azimuth:</strong> ${config.azimuth}°
            </div>
            <div class="info-item">
              <strong>Tilt:</strong> ${config.tilt}°
            </div>
          </div>
          
          <div class="info-section">
            <h4>Performance</h4>
            <div class="info-item">
              <strong>Annual Energy:</strong> ${solarData.annualEnergyKwh.toLocaleString()} kWh
            </div>
            <div class="info-item">
              <strong>Peak Power:</strong> ${solarData.peakPowerKw} kW
            </div>
            <div class="info-item">
              <strong>Efficiency:</strong> ${solarData.efficiencyFactor}%
            </div>
            <div class="info-item">
              <strong>Panels:</strong> ${solarData.panelCount}
            </div>
          </div>
          
          <div class="info-section">
            <h4>Environmental Impact</h4>
            <div class="info-item">
              <strong>CO₂ Saved:</strong> ${solarData.co2SavingsKgPerYear.toLocaleString()} kg/year
            </div>
            <div class="info-item">
              <strong>Trees Equivalent:</strong> ${solarData.carbonOffsetTrees}
            </div>
            <div class="info-item">
              <strong>Monthly Savings:</strong> $${solarData.monthlySavings}
            </div>
          </div>
        </div>
        ${solarData.isMockData ? '<div class="mock-notice">* Advanced demo data</div>' : ''}
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
      content: infoContent,
      position: new google.maps.LatLng(location.lat + 0.0002, location.lng + 0.0002)
    });

    infoWindow.open(this.map);
    this.overlays.push(infoWindow);
  }

  /**
   * Add parameterized heatmap based on configuration
   * @param {Object} location - Center location
   * @param {Object} solarData - Solar data
   * @param {Object} config - Configuration parameters
   */
  addParameterizedHeatmap(location, solarData, config) {
    const points = [];
    const baseIntensity = solarData.efficiencyFactor / 50; // Scale with efficiency
    
    // Generate heatmap points around selected grid areas
    if (config.selectedGridCells) {
      config.selectedGridCells.forEach(cell => {
        const centerLat = (cell.bounds.north + cell.bounds.south) / 2;
        const centerLng = (cell.bounds.east + cell.bounds.west) / 2;
        
        // Add multiple points per cell for better heatmap visualization
        for (let i = 0; i < 4; i++) {
          const offsetLat = (Math.random() - 0.5) * 0.00005;
          const offsetLng = (Math.random() - 0.5) * 0.00005;
          
          points.push({
            location: new google.maps.LatLng(centerLat + offsetLat, centerLng + offsetLng),
            weight: baseIntensity * (0.8 + Math.random() * 0.4) // Add some variation
          });
        }
      });
    }

    if (points.length > 0) {
      if (this.heatmapLayer) {
        this.heatmapLayer.setMap(null);
      }

      this.heatmapLayer = new google.maps.visualization.HeatmapLayer({
        data: points,
        radius: 25,
        opacity: 0.7,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      });

      this.heatmapLayer.setMap(this.map);
    }
  }

  /**
   * Toggle overlay visibility
   * @param {boolean} visible - Whether overlays should be visible
   */
  toggleOverlays(visible) {
    this.overlays.forEach(overlay => {
      if (overlay.setMap) {
        overlay.setMap(visible ? this.map : null);
      } else if (overlay.map !== undefined) {
        // Handle AdvancedMarkerElement
        overlay.map = visible ? this.map : null;
      }
    });

    if (this.heatmapLayer) {
      this.heatmapLayer.setMap(visible ? this.map : null);
    }
  }

  /**
   * Add advanced solar overlay with grid visualization and parameter info
   * @param {Object} location - {lat, lng}
   * @param {Object} solarData - Advanced solar data
   * @param {Object} options - Additional options including grid, azimuth, tilt
   */
  addAdvancedSolarOverlay(location, solarData, options = {}) {
    this.clearOverlays();

    // Add building outline if available
    if (options.buildingCorners && options.buildingCorners.length >= 3) {
      this.addBuildingOutline(options.buildingCorners);
    }

    // Add grid overlay if available
    if (options.gridCells && options.gridCells.length > 0) {
      this.addGridOverlay(options.gridCells, options.selectedGridCells || []);
    }

    // Add parameter visualization (azimuth direction)
    this.addParameterVisualization(location, {
      azimuth: solarData.azimuth,
      tilt: solarData.tilt,
      efficiencyFactor: solarData.efficiencyFactor
    });

    // Add enhanced solar metrics
    this.addAdvancedSolarMetrics(location, solarData);

    // Add efficiency heatmap based on parameters
    this.addParameterizedHeatmap(location, solarData, {
      azimuth: solarData.azimuth,
      tilt: solarData.tilt,
      selectedArea: solarData.selectedGridArea
    });
  }

  /**
   * Add building outline to the map
   * @param {Array} corners - Array of building corner coordinates
   */
  addBuildingOutline(corners) {
    const selectedCorners = corners.filter(corner => corner.selected);
    if (selectedCorners.length < 3) return;

    const path = selectedCorners.map(corner => 
      new google.maps.LatLng(corner.lat, corner.lng)
    );

    const buildingPolygon = new google.maps.Polygon({
      paths: path,
      strokeColor: '#007AFF',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: '#007AFF',
      fillOpacity: 0.1,
      map: this.map
    });

    this.overlays.push(buildingPolygon);
  }

  /**
   * Add grid overlay showing 3x3m cells
   * @param {Array} gridCells - All grid cells
   * @param {Array} selectedGridCells - Selected grid cells
   */
  addGridOverlay(gridCells, selectedGridCells) {
    gridCells.forEach(cell => {
      const isSelected = selectedGridCells.some(selected => 
        selected.row === cell.row && selected.col === cell.col
      );

      const rectangle = new google.maps.Rectangle({
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(cell.bounds.south, cell.bounds.west),
          new google.maps.LatLng(cell.bounds.north, cell.bounds.east)
        ),
        strokeColor: isSelected ? '#00FF00' : '#CCCCCC',
        strokeOpacity: 0.8,
        strokeWeight: isSelected ? 2 : 1,
        fillColor: isSelected ? '#00FF00' : '#FFFFFF',
        fillOpacity: isSelected ? 0.3 : 0.1,
        map: this.map,
        clickable: false
      });

      this.overlays.push(rectangle);
    });
  }

  /**
   * Add parameter visualization (azimuth arrow and efficiency indicator)
   * @param {Object} location - Center location
   * @param {Object} params - Parameters (azimuth, tilt, efficiency)
   */
  addParameterVisualization(location, params) {
    // Add azimuth direction arrow
    this.addAzimuthArrow(location, params.azimuth);
    
    // Add efficiency indicator circle
    this.addEfficiencyIndicator(location, params.efficiencyFactor);
  }

  /**
   * Add azimuth direction arrow
   * @param {Object} location - Center location
   * @param {number} azimuth - Azimuth angle in degrees
   */
  addAzimuthArrow(location, azimuth) {
    // Convert azimuth to Google Maps bearing (0° = North)
    const bearing = azimuth;
    
    // Calculate arrow end point (200 meters in azimuth direction)
    const distance = 0.002; // Approximate distance in degrees
    const radians = (bearing * Math.PI) / 180;
    
    const endLat = location.lat + distance * Math.cos(radians);
    const endLng = location.lng + distance * Math.sin(radians);

    // Create arrow line
    const arrowLine = new google.maps.Polyline({
      path: [
        new google.maps.LatLng(location.lat, location.lng),
        new google.maps.LatLng(endLat, endLng)
      ],
      geodesic: true,
      strokeColor: '#FF9500',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: this.map,
      icons: [{
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 4,
          strokeColor: '#FF9500',
          fillColor: '#FF9500',
          fillOpacity: 1
        },
        offset: '100%'
      }]
    });

    // Add azimuth label using AdvancedMarkerElement
    const labelElement = document.createElement('div');
    labelElement.innerHTML = `${azimuth}°`;
    labelElement.style.cssText = `
      color: #FF9500;
      font-weight: bold;
      font-size: 12px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
      pointer-events: none;
    `;
    
    const azimuthLabel = new google.maps.marker.AdvancedMarkerElement({
      position: new google.maps.LatLng(endLat, endLng),
      map: this.map,
      content: labelElement
    });

    this.overlays.push(arrowLine);
    this.overlays.push(azimuthLabel);
  }

  /**
   * Add efficiency indicator circle
   * @param {Object} location - Center location
   * @param {number} efficiency - Efficiency percentage
   */
  addEfficiencyIndicator(location, efficiency) {
    const radius = Math.max(20, efficiency / 2); // Scale radius with efficiency
    const color = this.getEfficiencyColor(efficiency / 100);

    const efficiencyCircle = new google.maps.Circle({
      center: location,
      radius: radius,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.2,
      map: this.map
    });

    this.overlays.push(efficiencyCircle);
  }

  /**
   * Add advanced solar metrics overlay
   * @param {Object} location - Location for overlay
   * @param {Object} solarData - Advanced solar data
   */
  addAdvancedSolarMetrics(location, solarData) {
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'advanced-solar-metrics-overlay';
    
    const getAzimuthDirection = (azimuth) => {
      const directions = [
        { angle: 0, name: 'North', symbol: 'N' },
        { angle: 45, name: 'Northeast', symbol: 'NE' },
        { angle: 90, name: 'East', symbol: 'E' },
        { angle: 135, name: 'Southeast', symbol: 'SE' },
        { angle: 180, name: 'South', symbol: 'S' },
        { angle: 225, name: 'Southwest', symbol: 'SW' },
        { angle: 270, name: 'West', symbol: 'W' },
        { angle: 315, name: 'Northwest', symbol: 'NW' }
      ];
      
      const closest = directions.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.angle - azimuth);
        const currDiff = Math.abs(curr.angle - azimuth);
        return currDiff < prevDiff ? curr : prev;
      });
      
      return closest.symbol;
    };

    metricsDiv.innerHTML = `
      <div class="advanced-metrics-card">
        <h4>🌞 Advanced Solar Analysis</h4>
        <div class="metrics-grid">
          <div class="metric-group">
            <div class="metric-header">Energy Production</div>
            <div class="metric">
              <span class="metric-value">${solarData.annualEnergyKwh.toLocaleString()}</span>
              <span class="metric-label">kWh/year</span>
            </div>
            <div class="metric">
              <span class="metric-value">${solarData.peakPowerKw}</span>
              <span class="metric-label">kW peak</span>
            </div>
          </div>
          
          <div class="metric-group">
            <div class="metric-header">Configuration</div>
            <div class="metric">
              <span class="metric-value">${getAzimuthDirection(solarData.azimuth)} ${solarData.azimuth}°</span>
              <span class="metric-label">orientation</span>
            </div>
            <div class="metric">
              <span class="metric-value">${solarData.tilt}°</span>
              <span class="metric-label">tilt angle</span>
            </div>
            <div class="metric">
              <span class="metric-value">${solarData.efficiencyFactor}%</span>
              <span class="metric-label">efficiency</span>
            </div>
          </div>
          
          <div class="metric-group">
            <div class="metric-header">Environmental Impact</div>
            <div class="metric">
              <span class="metric-value">${solarData.co2SavingsKgPerYear.toLocaleString()}</span>
              <span class="metric-label">kg CO₂ saved</span>
            </div>
            <div class="metric">
              <span class="metric-value">${solarData.carbonOffsetTrees}</span>
              <span class="metric-label">trees equivalent</span>
            </div>
          </div>
          
          <div class="metric-group">
            <div class="metric-header">Area & Panels</div>
            <div class="metric">
              <span class="metric-value">${solarData.selectedGridArea}</span>
              <span class="metric-label">m² selected</span>
            </div>
            <div class="metric">
              <span class="metric-value">${solarData.panelCount}</span>
              <span class="metric-label">panels fit</span>
            </div>
          </div>
        </div>
        <div class="savings-highlight">
          <span class="savings-label">Estimated monthly savings:</span>
          <span class="savings-value">~$${solarData.monthlySavings}</span>
        </div>
        ${solarData.isMockData ? '<div class="mock-notice">📊 Demo data - Connect APIs for real analysis</div>' : ''}
      </div>
    `;

    // Add enhanced CSS for advanced overlay
    this.addAdvancedOverlayStyles();

    // Create custom overlay class for advanced metrics
    class AdvancedSolarMetricsOverlay extends google.maps.OverlayView {
      constructor(position, content, map) {
        super();
        this.position = position;
        this.content = content;
        this.setMap(map);
      }

      onAdd() {
        this.div = this.content;
        const panes = this.getPanes();
        panes.overlayLayer.appendChild(this.div);
      }

      draw() {
        const overlayProjection = this.getProjection();
        const position = overlayProjection.fromLatLngToDivPixel(this.position);
        
        if (position) {
          this.div.style.left = (position.x - 180) + 'px';
          this.div.style.top = (position.y - 200) + 'px';
        }
      }

      onRemove() {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
        }
      }
    }

    const metricsOverlay = new AdvancedSolarMetricsOverlay(
      new google.maps.LatLng(location.lat + 0.001, location.lng + 0.001),
      metricsDiv,
      this.map
    );

    this.overlays.push(metricsOverlay);
  }

  /**
   * Add parameterized heatmap based on azimuth, tilt, and selected area
   * @param {Object} location - Center location
   * @param {Object} solarData - Solar data
   * @param {Object} params - Parameters for heatmap generation
   */
  addParameterizedHeatmap(location, solarData, params) {
    const heatmapData = this.generateParameterizedHeatmapData(location, solarData, params);

    if (this.heatmapLayer) {
      this.heatmapLayer.setMap(null);
    }

    this.heatmapLayer = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: 40,
      opacity: 0.5,
      gradient: [
        'rgba(0, 0, 255, 0)',      // Transparent blue
        'rgba(0, 0, 255, 0.5)',    // Light blue
        'rgba(0, 255, 255, 0.7)',  // Cyan
        'rgba(0, 255, 0, 0.8)',    // Green
        'rgba(255, 255, 0, 0.9)',  // Yellow
        'rgba(255, 165, 0, 1)',    // Orange
        'rgba(255, 0, 0, 1)'       // Red
      ]
    });

    this.heatmapLayer.setMap(this.map);
  }

  /**
   * Generate parameterized heatmap data based on solar parameters
   * @param {Object} location - Center location
   * @param {Object} solarData - Solar data
   * @param {Object} params - Parameters
   * @returns {Array} Heatmap data points
   */
  generateParameterizedHeatmapData(location, solarData, params) {
    const points = [];
    const baseIntensity = params.selectedArea / 100; // Base intensity from selected area
    const efficiencyMultiplier = solarData.efficiencyFactor / 100;
    
    // Generate points in a grid around the selected area
    const gridSize = 5;
    const cellSize = 0.0001;
    
    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const lat = location.lat + (i * cellSize);
        const lng = location.lng + (j * cellSize);
        
        // Calculate distance from center
        const distance = Math.sqrt(i * i + j * j);
        
        // Calculate intensity based on parameters and distance
        let intensity = baseIntensity * efficiencyMultiplier;
        
        // Reduce intensity with distance from center
        intensity *= Math.max(0, 1 - (distance / gridSize));
        
        // Add some variation based on azimuth (higher intensity in south-facing direction)
        const angleToPoint = Math.atan2(j, i) * 180 / Math.PI;
        const azimuthDiff = Math.abs(((params.azimuth - angleToPoint + 180) % 360) - 180);
        const azimuthFactor = 1 - (azimuthDiff / 180) * 0.3; // Reduce up to 30% for opposite direction
        
        intensity *= azimuthFactor;
        
        if (intensity > 0.1) {
          points.push({
            location: new google.maps.LatLng(lat, lng),
            weight: Math.min(intensity * 10, 10) // Scale and cap intensity
          });
        }
      }
    }
    
    return points;
  }

  /**
   * Add enhanced CSS styles for advanced overlays
   */
  addAdvancedOverlayStyles() {
    if (document.getElementById('advanced-solar-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'advanced-solar-overlay-styles';
    style.textContent = `
      .advanced-solar-metrics-overlay {
        position: absolute;
        pointer-events: none;
        z-index: 100;
      }

      .advanced-metrics-card {
        background: rgba(255, 255, 255, 0.97);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        border: 2px solid #ff9500;
        min-width: 360px;
        max-width: 400px;
        pointer-events: auto;
        backdrop-filter: blur(10px);
      }

      .advanced-metrics-card h4 {
        margin: 0 0 16px 0;
        color: #ff9500;
        font-size: 16px;
        font-weight: 700;
        text-align: center;
        border-bottom: 2px solid #ff9500;
        padding-bottom: 8px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }

      .metric-group {
        background: rgba(248, 249, 250, 0.8);
        border-radius: 8px;
        padding: 12px;
        border: 1px solid #e9ecef;
      }

      .metric-header {
        font-weight: 600;
        color: #495057;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        border-bottom: 1px solid #dee2e6;
        padding-bottom: 4px;
      }

      .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 12px;
      }

      .metric:last-child {
        margin-bottom: 0;
      }

      .metric-value {
        font-weight: 700;
        color: #007AFF;
        font-size: 13px;
      }

      .metric-label {
        color: #6c757d;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .savings-highlight {
        background: linear-gradient(135deg, #00c851, #007e33);
        color: white;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 12px;
      }

      .savings-label {
        display: block;
        font-size: 11px;
        opacity: 0.9;
        margin-bottom: 4px;
      }

      .savings-value {
        display: block;
        font-size: 18px;
        font-weight: 700;
      }

      .mock-notice {
        background: rgba(255, 243, 205, 0.95);
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 8px;
        font-size: 10px;
        color: #856404;
        text-align: center;
        margin-top: 8px;
      }

      /* Dark theme support */
      .dark-theme .advanced-metrics-card {
        background: rgba(28, 28, 30, 0.97);
        border-color: #ff9500;
        color: #ffffff;
      }

      .dark-theme .metric-group {
        background: rgba(44, 44, 46, 0.8);
        border-color: #48484a;
      }

      .dark-theme .metric-header {
        color: #e5e5e7;
        border-color: #48484a;
      }

      .dark-theme .metric-value {
        color: #007AFF;
      }

      .dark-theme .metric-label {
        color: #a1a1a6;
      }

      .dark-theme .mock-notice {
        background: rgba(102, 68, 4, 0.2);
        border-color: #856404;
        color: #ffeaa7;
      }
    `;
    
    document.head.appendChild(style);
  }
}
