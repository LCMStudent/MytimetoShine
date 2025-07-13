import { getAzimuthDirection } from './utils.js';

/**
 * UIController - Handles UI state management and user interactions
 */
export class UIController {
  constructor(app) {
    this.app = app;
    this.cacheDOMElements();
  }

  cacheDOMElements() {
    this.elements = {
      // Main buttons
      calculateSolarBtn: document.getElementById('calculate-solar'),
      newAnalysisBtn: document.getElementById('new-analysis'),
      
      // Location search
      addressSearchInput: document.getElementById('address-search'),
      selectedLocationDiv: document.getElementById('selected-location'),
      nextStep1Btn: document.getElementById('next-step-1'),

      // Standard View
      standardAnnualEnergy: document.getElementById('standard-annual-energy'),
      standardAnnualSavings: document.getElementById('standard-annual-savings'),
      
      // Nerds View: Energy
      nerdsAnnualEnergy: document.getElementById('nerds-annual-energy'),
      nerdsDailyEnergy: document.getElementById('nerds-daily-energy'),
      nerdsPeakSunHours: document.getElementById('nerds-peak-sun-hours'),
      
      // Nerds View: System
      nerdsPanelCount: document.getElementById('nerds-panel-count'),
      nerdsDcPower: document.getElementById('nerds-dc-power'),
      nerdsPanelArea: document.getElementById('nerds-panel-area'),
      nerdsPanelAzimuth: document.getElementById('nerds-panel-azimuth'),
      nerdsPanelTilt: document.getElementById('nerds-panel-tilt'),
      nerdsSystemEfficiency: document.getElementById('nerds-system-efficiency'),
      
      // Nerds View: Economics
      nerdsAnnualSavings: document.getElementById('nerds-annual-savings'),
      nerdsLifetimeSavings: document.getElementById('nerds-lifetime-savings'),
      nerdsCo2Reduction: document.getElementById('nerds-co2-reduction'),
      electricityPriceInput: document.getElementById('electricity-price'),
      
      // Nerds View: Compliance
      nerdsComplianceStatus: document.getElementById('nerds-compliance-status'),

      // Nerds View: Seasonal
      nerdsWinterDaily: document.getElementById('nerds-winter-daily'),
      nerdsWinterMonthly: document.getElementById('nerds-winter-monthly'),
      nerdsSpringDaily: document.getElementById('nerds-spring-daily'),
      nerdsSpringMonthly: document.getElementById('nerds-spring-monthly'),
      nerdsSummerDaily: document.getElementById('nerds-summer-daily'),
      nerdsSummerMonthly: document.getElementById('nerds-summer-monthly'),
      nerdsFallDaily: document.getElementById('nerds-fall-daily'),
      nerdsFallMonthly: document.getElementById('nerds-fall-monthly'),
      
      // View Containers & Toggles
      standardView: document.getElementById('standard-view'),
      nerdsView: document.getElementById('nerds-view'),
      standardViewBtn: document.getElementById('standard-view-btn'),
      nerdsViewBtn: document.getElementById('nerds-view-btn'),
      
      // General UI
      resultsContent: document.getElementById('results-content'),
    };
  }

  setupEventListeners() {
    // Step navigation
    this.elements.calculateSolarBtn?.addEventListener('click', () => {
      this.calculatePanelSolarData();
    });

    this.elements.newAnalysisBtn?.addEventListener('click', () => {
      this.resetAnalysis();
    });

    // Electricity price input
    this.elements.electricityPriceInput?.addEventListener('input', (e) => {
      this.updateEconomicsCalculations();
    });
  }

  async calculatePanelSolarData() {
    if (!this.app.selectedLocation || !this.app.panelController.panelLine) {
      this.showError('Please select a location and draw a panel line first.');
      return;
    }

    // Navigate to step 4 first to show the results page
    this.showStep(4);

    try {
      const panelConfig = this.app.panelController.panelLine.panelConfig;
      const panelAzimuth = this.app.panelController.panelLine.panelAzimuth;
      const panelTilt = this.app.panelController.panelTilt;

      const solarResults = await this.app.solarCalculator.calculatePanelSolarData(
        this.app.selectedLocation,
        panelConfig,
        panelAzimuth,
        panelTilt
      );

      this.app.setCurrentSolarData(solarResults);
      this.displayPanelResults(solarResults);
      
    } catch (error) {
      console.error('Solar calculation failed:', error);
      this.showError('Failed to calculate solar potential. Please try again.');
    }
  }

  displayPanelResults(solarResults) {
    const { efficiency, germanOutput, panelConfig, panelAzimuth, panelTilt } = solarResults;
    
    console.log('Displaying panel results:', solarResults);
    
    try {
      // Show results content
      if (this.elements.resultsContent) {
        this.elements.resultsContent.classList.remove('hidden');
      }
      
      // Populate Standard View
      this.populateStandardView(germanOutput);
      
      // Populate Stats for Nerds View
      this.populateNerdsView(germanOutput, panelConfig, panelAzimuth, panelTilt, efficiency);
      
      // Set up view toggle
      this.setupViewToggle();
      
    } catch (error) {
      console.error('Error displaying panel results:', error);
      this.showError('Failed to display results');
    }
  }

  populateStandardView(germanOutput) {
    // Store the german output for economics updates
    this.currentGermanOutput = germanOutput;
    
    // Standard View - Simple and clean
    if (this.elements.standardAnnualEnergy) {
      this.elements.standardAnnualEnergy.textContent = `${germanOutput.annualEnergyProduction} kWh`;
    }
    
    // Update savings with current electricity price
    this.updateEconomicsCalculations();
  }

  populateNerdsView(germanOutput, panelConfig, panelAzimuth, panelTilt, efficiency) {
    const {
      nerdsAnnualEnergy, nerdsDailyEnergy, nerdsPeakSunHours,
      nerdsPanelCount, nerdsDcPower, nerdsPanelArea, nerdsPanelAzimuth, nerdsPanelTilt, nerdsSystemEfficiency,
      nerdsAnnualSavings, nerdsLifetimeSavings, nerdsCo2Reduction,
      nerdsComplianceStatus
    } = this.elements;

    // Store the german output for economics updates
    this.currentGermanOutput = germanOutput;

    // Energy Production Section
    if (nerdsAnnualEnergy) nerdsAnnualEnergy.textContent = `${germanOutput.annualEnergyProduction} kWh/year`;
    if (nerdsDailyEnergy) nerdsDailyEnergy.textContent = `${(germanOutput.annualEnergyProduction / 365).toFixed(2)} kWh/day`;
    if (nerdsPeakSunHours) nerdsPeakSunHours.textContent = `${germanOutput.peakSunHours.toFixed(2)} hours/day`;
    
    // System Configuration Section
    if (nerdsPanelCount) nerdsPanelCount.textContent = `${panelConfig.panelCount} panels`;
    if (nerdsDcPower) nerdsDcPower.textContent = `${panelConfig.totalWattage}W DC`;
    if (nerdsPanelArea) nerdsPanelArea.textContent = `${panelConfig.totalArea.toFixed(1)} m²`;
    if (nerdsPanelAzimuth) nerdsPanelAzimuth.textContent = `${Math.round(panelAzimuth)}° (${getAzimuthDirection(panelAzimuth)})`;
    if (nerdsPanelTilt) nerdsPanelTilt.textContent = `${panelTilt}° (${panelTilt === 90 ? 'Vertical' : 'Tilted'})`;
    if (nerdsSystemEfficiency) nerdsSystemEfficiency.textContent = `${(efficiency * 100).toFixed(1)}%`;
    
    // Economics Section - will be updated by updateEconomicsCalculations()
    this.updateEconomicsCalculations();
    
    // German Compliance Section
    if (nerdsComplianceStatus) {
      let status = 'Compliant';
      let className = 'compliance-good';
      
      if (germanOutput.exceedsPanelLimit) {
        status = 'Exceeds 2000W DC limit';
        className = 'compliance-error';
      } else if (germanOutput.isClippingSignificant) {
        status = 'Oversized (clipping)';
        className = 'compliance-warning';
      }
      
      nerdsComplianceStatus.textContent = status;
      nerdsComplianceStatus.className = `compliance-status ${className}`;
    }
    
    // Seasonal Analysis Section
    if (germanOutput.seasonalData?.length > 0) {
      this.populateSeasonalData(germanOutput.seasonalData);
    }
  }

  populateSeasonalData(seasonalData) {
    const seasonMapping = {
      'Winter Solstice': { daily: this.elements.nerdsWinterDaily, monthly: this.elements.nerdsWinterMonthly },
      'Spring Equinox': { daily: this.elements.nerdsSpringDaily, monthly: this.elements.nerdsSpringMonthly },
      'Summer Solstice': { daily: this.elements.nerdsSummerDaily, monthly: this.elements.nerdsSummerMonthly },
      'Fall Equinox': { daily: this.elements.nerdsFallDaily, monthly: this.elements.nerdsFallMonthly }
    };
    
    console.log('Populating seasonal data:', seasonalData);
    
    seasonalData.forEach(data => {
      const elements = seasonMapping[data.season];
      if (elements) {
        if (elements.daily) {
          elements.daily.textContent = `${data.dailyEnergyKwh.toFixed(2)} kWh`;
          elements.daily.title = `Peak sun hours: ${data.peakSunHours?.toFixed(1) || 'N/A'} hrs, Clipping: ${data.clippingLossPercent?.toFixed(1) || 0}%`;
        }
        if (elements.monthly) {
          elements.monthly.textContent = `${data.monthlyEnergyKwh.toFixed(0)} kWh/month`;
        }
      }
    });
  }

  setupViewToggle() {
    const { standardViewBtn, nerdsViewBtn, standardView, nerdsView } = this.elements;
    
    if (standardViewBtn && nerdsViewBtn && standardView && nerdsView) {
      standardViewBtn.addEventListener('click', () => {
        standardViewBtn.classList.add('active');
        nerdsViewBtn.classList.remove('active');
        standardView.classList.remove('hidden');
        nerdsView.classList.add('hidden');
      });
      
      nerdsViewBtn.addEventListener('click', () => {
        nerdsViewBtn.classList.add('active');
        standardViewBtn.classList.remove('active');
        nerdsView.classList.remove('hidden');
        standardView.classList.add('hidden');
      });
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
    
    this.app.currentStep = stepNumber;
    
    // Handle step-specific logic
    if (stepNumber === 3) {
      // Enable calculate button if we have a panel line with valid configuration
      const calculateBtn = this.elements.calculateSolarBtn;
      if (this.app.panelController.panelLine?.panelConfig && calculateBtn) {
        const config = this.app.panelController.panelLine.panelConfig;
        
        // Only enable if we have at least one panel
        if (config.panelCount > 0) {
          calculateBtn.disabled = false;
          calculateBtn.textContent = 'Calculate Solar Potential';
        } else {
          calculateBtn.disabled = true;
          calculateBtn.textContent = 'No panels can fit';
        }
        
        // Update summary section with current panel info
        this.app.panelController.updateStep3Summary();
      } else if (calculateBtn) {
        // No panel line configured
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Complete panel configuration';
      }
    }
    
    // Update step indicator if it exists
    this.updateStepIndicator(stepNumber);
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

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'success') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}-notification`;
    notificationDiv.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✅' : '⚠️'}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    document.body.appendChild(notificationDiv);

    const duration = type === 'success' ? 3000 : 5000;
    setTimeout(() => notificationDiv.remove(), duration);
  }

  resetAnalysis() {
    this.app.locationController.clearMarkers();
    this.app.panelController.clearPanelLine();
    this.app.mapOverlay.clearOverlays();
    this.app.selectedLocation = null;
    this.app.currentSolarData = null;
    this.currentGermanOutput = null;
    this.showStep(1);
    
    if (this.elements.addressSearchInput) this.elements.addressSearchInput.value = '';
    if (this.elements.selectedLocationDiv) this.elements.selectedLocationDiv.classList.add('hidden');
    if (this.elements.nextStep1Btn) this.elements.nextStep1Btn.classList.add('hidden');
    
    // Keep electricity price setting - don't reset it
  }

  updateEconomicsCalculations() {
    if (!this.currentGermanOutput) return;

    const electricityPrice = parseFloat(this.elements.electricityPriceInput?.value || 0.32);
    const germanOutput = this.currentGermanOutput;
    
    // Calculate economics based on current electricity price
    const annualSavings = Math.round(germanOutput.annualEnergyProduction * electricityPrice);
    const lifetimeSavings = Math.round(germanOutput.annualEnergyProduction * electricityPrice * 20);
    const co2Saved = Math.round(germanOutput.annualEnergyProduction * 0.4); // 0.4 kg CO2/kWh for German grid
    
    // Update UI elements
    if (this.elements.nerdsAnnualSavings) {
      this.elements.nerdsAnnualSavings.textContent = `€${annualSavings}/year`;
    }
    if (this.elements.nerdsLifetimeSavings) {
      this.elements.nerdsLifetimeSavings.textContent = `€${lifetimeSavings}`;
    }
    if (this.elements.nerdsCo2Reduction) {
      this.elements.nerdsCo2Reduction.textContent = `${co2Saved} kg/year`;
    }
    
    // Also update standard view
    if (this.elements.standardAnnualSavings) {
      this.elements.standardAnnualSavings.textContent = `€${annualSavings}`;
    }
  }
}
