/**
 * PanelController - Handles panel line drawing and configuration
 */
export class PanelController {
  constructor(map, app) {
    this.map = map;
    this.app = app;
    
    // Balcony solar panel line system
    this.panelLine = null;
    this.panelLineVisual = null;
    this.panelAreaVisual = null;
    this.isDrawingLine = false;
    this.lineStartPoint = null;
    this.startMarker = null;
    this.endMarker = null;
    
    // Panel configuration
    this.panelLength = 2.0;
    this.panelWidth = 1.0;
    this.panelWattage = 400;
    this.panelTilt = 90;
    this.panelOrientation = 'length';
    this.railingHeight = 1.1;
    this.panelMounting = 'railing';
    this.panelSide = 'left';
    this.maxSystemWattage = 2000;
    this.wattageLeeway = 200;
    
    // Panel count override
    this.panelCountOverride = false;
    this.maxPanelCount = 4;
  }

  setupEventListeners() {
    // Step navigation
    document.getElementById('next-step-2').addEventListener('click', () => {
      this.app.showStep(3);
    });

    document.getElementById('clear-panel-line').addEventListener('click', () => {
      this.clearPanelLine();
    });

    document.getElementById('back-step-2').addEventListener('click', () => {
      this.app.showStep(2);
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

    // Button group event listeners for orientation and side
    document.querySelectorAll('.btn-option[data-group="orientation"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectButtonOption(e.target, 'orientation');
        this.updatePanelOrientation(e.target.dataset.value);
      });
    });

    document.querySelectorAll('.btn-option[data-group="side"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectButtonOption(e.target, 'side');
        this.updatePanelSide(e.target.dataset.value);
      });
    });

    // Azimuth buttons
    document.querySelectorAll('.azimuth-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectAzimuth(e.target.dataset.azimuth);
      });
    });

    // Panel count override controls
    document.getElementById('enable-panel-count').addEventListener('change', (e) => {
      this.togglePanelCountOverride(e.target.checked);
    });

    document.getElementById('panel-count-slider').addEventListener('input', (e) => {
      this.updatePanelCountOverride(parseInt(e.target.value));
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
    const startMarkerElement = document.createElement('div');
    startMarkerElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="#FF6B35">
        <circle cx="8" cy="8" r="6" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `;
    startMarkerElement.style.cursor = 'pointer';
    startMarkerElement.title = 'Panel Line Start';
    
    this.startMarker = new google.maps.marker.AdvancedMarkerElement({
      position: startPoint,
      map: this.map,
      content: startMarkerElement
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
      length: lineLength,
      azimuth: normalizedAzimuth,
      panelAzimuth: this.calculatePanelAzimuth(normalizedAzimuth),
      panelArea: this.calculatePanelArea(lineLength),
      panelConfig: this.calculatePanelConfiguration(lineLength)
    };
    
    // Clean up temporary marker
    if (this.startMarker) {
      this.startMarker.map = null;
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

  calculatePanelArea(lineLength) {
    // Calculate total panel area based on mounting configuration
    let panelArea = 0;
    
    if (this.panelOrientation === 'length') {
      // Panels mounted with length along the line
      const panelsPerLine = Math.floor(lineLength / this.panelLength);
      panelArea = panelsPerLine * this.panelLength * this.panelWidth;
    } else {
      // Panels mounted with width along the line
      const panelsPerLine = Math.floor(lineLength / this.panelWidth);
      panelArea = panelsPerLine * this.panelLength * this.panelWidth;
    }
    
    return panelArea;
  }

  calculatePanelConfiguration(lineLength) {
    let panelCount, availableLength, totalWattage, totalArea;
    let isConstrainedByLength = false;
    let isConstrainedByWattage = false;
    let isConstrainedByCount = false;
    
    // Check if panel count override is enabled
    if (this.panelCountOverride) {
      // Use the manually set panel count
      panelCount = this.maxPanelCount;
      isConstrainedByCount = true;
      console.log('Using panel count override:', panelCount, 'panels');
    } else {
      // Calculate panel count based on available line length
      if (this.panelOrientation === 'length') {
        // Panels mounted with length along the line
        availableLength = lineLength;
        panelCount = Math.floor(availableLength / this.panelLength);
      } else {
        // Panels mounted with width along the line
        availableLength = lineLength;
        panelCount = Math.floor(availableLength / this.panelWidth);
      }
      
      // Check if we exceed maximum system wattage
      const maxPanelsByWattage = Math.floor((this.maxSystemWattage + this.wattageLeeway) / this.panelWattage);
      
      if (panelCount > maxPanelsByWattage) {
        panelCount = maxPanelsByWattage;
        isConstrainedByWattage = true;
      } else {
        isConstrainedByLength = true;
      }
    }
    
    // Calculate total wattage and area
    totalWattage = panelCount * this.panelWattage;
    totalArea = panelCount * this.panelLength * this.panelWidth;
    
    return {
      panelCount,
      totalWattage,
      totalArea,
      isConstrainedByLength,
      isConstrainedByWattage,
      isConstrainedByCount,
      availableLength
    };
  }

  drawPanelLine() {
    if (!this.panelLine) return;
    
    // Clear existing line
    if (this.panelLineVisual) {
      this.panelLineVisual.setMap(null);
    }
    
    // Draw the line
    this.panelLineVisual = new google.maps.Polyline({
      path: [this.panelLine.start, this.panelLine.end],
      geodesic: false,
      strokeColor: '#FF6B35',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: this.map
    });
    
    // Add end marker
    const endMarkerElement = document.createElement('div');
    endMarkerElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="#FF6B35">
        <circle cx="8" cy="8" r="6" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `;
    endMarkerElement.style.cursor = 'pointer';
    endMarkerElement.title = 'Panel Line End';
    
    this.endMarker = new google.maps.marker.AdvancedMarkerElement({
      position: this.panelLine.end,
      map: this.map,
      content: endMarkerElement
    });
  }

  drawPanelArea() {
    if (!this.panelLine) return;
    
    // Clear existing area visualization
    if (this.panelAreaVisual) {
      this.panelAreaVisual.setMap(null);
    }
    
    // Calculate panel area rectangle based on side selection
    const lineVector = {
      lat: this.panelLine.end.lat() - this.panelLine.start.lat(),
      lng: this.panelLine.end.lng() - this.panelLine.start.lng()
    };
    
    // Normalize the vector
    const lineLength = Math.sqrt(lineVector.lat * lineVector.lat + lineVector.lng * lineVector.lng);
    const unitVector = {
      lat: lineVector.lat / lineLength,
      lng: lineVector.lng / lineLength
    };
    
    // Calculate perpendicular vector (90 degrees)
    const perpVector = {
      lat: -unitVector.lng,
      lng: unitVector.lat
    };
    
    // Panel depth (how far panels extend from the line)
    const panelDepth = this.panelOrientation === 'length' ? this.panelWidth : this.panelLength;
    const depthInDegrees = panelDepth / 111000; // Approximate conversion to degrees
    
    // Determine which side of the line panels are on
    const sideMultiplier = this.panelSide === 'left' ? -1 : 1;
    
    // Calculate rectangle corners
    const rect = [
      this.panelLine.start,
      this.panelLine.end,
      new google.maps.LatLng(
        this.panelLine.end.lat() + (perpVector.lat * depthInDegrees * sideMultiplier),
        this.panelLine.end.lng() + (perpVector.lng * depthInDegrees * sideMultiplier)
      ),
      new google.maps.LatLng(
        this.panelLine.start.lat() + (perpVector.lat * depthInDegrees * sideMultiplier),
        this.panelLine.start.lng() + (perpVector.lng * depthInDegrees * sideMultiplier)
      )
    ];
    
    // Draw the panel area
    this.panelAreaVisual = new google.maps.Polygon({
      paths: rect,
      strokeColor: '#00D2AA',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#00D2AA',
      fillOpacity: 0.3,
      map: this.map
    });
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

  updatePanelLineStatus() {
    const hasLine = this.panelLine !== null;
    
    const statusElement = document.getElementById('panel-line-status');
    statusElement.textContent = hasLine ? 'Yes' : 'No';
    statusElement.setAttribute('data-status', hasLine ? 'yes' : 'no');
    
    const detailsDiv = document.getElementById('panel-line-details');
    const nextBtn = document.getElementById('next-step-2');
    const clearBtn = document.getElementById('clear-panel-line');
    
    if (hasLine) {
      detailsDiv.classList.remove('hidden');
      const config = this.panelLine.panelConfig;
      
      document.getElementById('line-length').textContent = `${Math.round(this.panelLine.length * 10) / 10}m`;
      document.getElementById('panel-count').textContent = `${config.panelCount} panels`;
      document.getElementById('total-wattage').textContent = `${config.totalWattage}W`;
      document.getElementById('panel-area').textContent = `${Math.round(config.totalArea * 10) / 10} m²`;
      
      // Update panel orientation display
      const orientationName = this.getOrientationName(this.panelLine.azimuth);
      const orientationElement = document.getElementById('panel-orientation');
      orientationElement.innerHTML = `<span class="compass-direction ${orientationName.toLowerCase()}">${orientationName}</span> (${Math.round(this.panelLine.azimuth)}°)`;
      
      // Show constraint information
      if (config.isConstrainedByCount) {
        document.getElementById('constraint-info').textContent = `Limited by manual panel count setting`;
        document.getElementById('constraint-info').style.color = '#10B981';
      } else if (config.isConstrainedByWattage) {
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
      
      // Note: Summary section was removed from Step 3
      console.log('Panel properties updated successfully');
      
      // Update constraint info in step 3
      const step3ConstraintInfo = document.querySelector('#step-3 #constraint-info');
      if (step3ConstraintInfo) {
        if (config.isConstrainedByCount) {
          step3ConstraintInfo.textContent = `Manual panel count limit: ${config.panelCount} panels`;
          step3ConstraintInfo.style.color = '#10B981';
        } else if (config.isConstrainedByWattage) {
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
      this.startMarker.map = null;
      this.startMarker = null;
    }
    
    if (this.endMarker) {
      this.endMarker.map = null;
      this.endMarker = null;
    }
    
    // Reset state
    this.panelLine = null;
    this.isDrawingLine = false;
    this.lineStartPoint = null;
    
    // Update UI
    this.updatePanelLineStatus();
  }

  // Parameter update methods
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
      return;
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

  selectButtonOption(selectedButton, groupName) {
    // Remove active class from all buttons in the group
    document.querySelectorAll(`.btn-option[data-group="${groupName}"]`).forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to selected button
    selectedButton.classList.add('active');
  }

  updatePanelOrientation(value) {
    this.panelOrientation = value;
    this.updatePanelProperties();
  }

  updatePanelSide(value) {
    this.panelSide = value;
    this.updatePanelProperties();
  }

  selectAzimuth(azimuth) {
    // Handle azimuth selection for manual override
    console.log('Selected azimuth:', azimuth);
    // TODO: Implement azimuth override if needed
  }

  togglePanelCountOverride(enabled) {
    this.panelCountOverride = enabled;
    const slider = document.getElementById('panel-count-slider');
    const valueDisplay = document.getElementById('panel-count-value');
    const container = document.getElementById('panel-count-control');
    
    if (enabled) {
      slider.disabled = false;
      container.classList.remove('disabled');
      console.log('Panel count override enabled:', this.maxPanelCount, 'panels');
    } else {
      slider.disabled = true;
      container.classList.add('disabled');
      console.log('Panel count override disabled - using length-based calculation');
    }
    
    // Update panel configuration if line exists
    this.updatePanelProperties();
  }

  updatePanelCountOverride(count) {
    this.maxPanelCount = count;
    const valueDisplay = document.getElementById('panel-count-value');
    valueDisplay.textContent = `${count} panel${count !== 1 ? 's' : ''}`;
    
    console.log('Panel count override set to:', count, 'panels');
    
    // Update panel configuration if line exists
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
      if (this.app.currentStep === 3) {
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

  getMountingTypeName(mountingType) {
    switch(mountingType) {
      case 'railing': return 'Railing Mount (Vertical)';
      case 'angled': return 'Angled Mount (45°)';
      case 'horizontal': return 'Horizontal Mount';
      default: return 'Railing Mount';
    }
  }
}
