// Solar API Service for integrating with Google Solar API
// Documentation: https://developers.google.com/maps/documentation/solar

export class SolarAPIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://solar.googleapis.com/v1';
  }

  /**
   * Get building insights for a specific location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object>} Building insights data
   */
  async getBuildingInsights(lat, lng) {
    try {
      const url = `${this.baseUrl}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${this.apiKey}`;
      
      console.log('Solar API URL:', url);
      console.log('Making request to Solar API...');
      
      const response = await fetch(url);
      
      console.log('Solar API Response Status:', response.status);
      console.log('Solar API Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Solar API Error Response:', errorText);
        throw new Error(`Solar API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Solar API Success:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch building insights:', error);
      throw error;
    }
  }

  /**
   * Get data layers for solar analysis
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusMeters - Radius in meters
   * @param {string} view - View type (FULL_LAYERS, DSM_LAYER, etc.)
   * @returns {Promise<Object>} Data layers
   */
  async getDataLayers(lat, lng, radiusMeters = 100, view = 'FULL_LAYERS') {
    try {
      const url = `${this.baseUrl}/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=${radiusMeters}&view=${view}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Solar API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch data layers:', error);
      throw error;
    }
  }

  /**
   * Get solar potential for a specific area
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} buildingInfo - Building information including corners and area
   * @returns {Promise<Object>} Processed solar data
   */
  async getSolarPotential(lat, lng, buildingInfo = null) {
    try {
      const buildingInsights = await this.getBuildingInsights(lat, lng);
      return this.processSolarData(buildingInsights, buildingInfo);
    } catch (error) {
      console.error('Failed to get solar potential:', error);
      // Return mock data for development with building info
      return this.getMockSolarData(buildingInfo);
    }
  }

  /**
   * Process raw solar data into usable format
   * @param {Object} rawData - Raw building insights data
   * @param {Object} buildingInfo - Building information including corners and area
   * @returns {Object} Processed solar data
   */
  processSolarData(rawData, buildingInfo = null) {
    if (!rawData || !rawData.solarPotential) {
      return this.getMockSolarData(buildingInfo);
    }

    const solarPotential = rawData.solarPotential;
    const roofSegmentStats = solarPotential.roofSegmentStats || [];
    
    // Calculate totals
    let totalPanelsCount = 0;
    let totalYearlyEnergyDcKwh = 0;
    let maxSunshineHoursPerYear = 0;

    roofSegmentStats.forEach(segment => {
      totalPanelsCount += segment.panelsCount || 0;
      totalYearlyEnergyDcKwh += segment.yearlyEnergyDcKwh || 0;
      maxSunshineHoursPerYear = Math.max(maxSunshineHoursPerYear, segment.stats?.sunshineQuantiles?.[5] || 0);
    });

    // Adjust calculations based on selected building area if provided
    if (buildingInfo && buildingInfo.buildingArea) {
      const buildingAreaSqM = buildingInfo.buildingArea;
      const selectedCorners = buildingInfo.buildingCorners?.filter(c => c.selected) || [];
      
      if (selectedCorners.length >= 3) {
        // Adjust solar potential based on selected area
        // Assume average building area is 150 sq meters for scaling
        const scaleFactor = Math.min(buildingAreaSqM / 150, 3); // Cap at 3x for very large buildings
        totalPanelsCount = Math.round(totalPanelsCount * scaleFactor);
        totalYearlyEnergyDcKwh = Math.round(totalYearlyEnergyDcKwh * scaleFactor);
      }
    }

    // Calculate CO2 savings (approximate)
    const co2SavingsKgPerYear = totalYearlyEnergyDcKwh * 0.5; // ~0.5 kg CO2 per kWh

    return {
      annualEnergyKwh: Math.round(totalYearlyEnergyDcKwh),
      panelCount: totalPanelsCount,
      co2SavingsKgPerYear: Math.round(co2SavingsKgPerYear),
      sunshineHoursPerYear: Math.round(maxSunshineHoursPerYear),
      roofSegments: roofSegmentStats.length,
      carbonOffsetTrees: Math.round(co2SavingsKgPerYear / 21), // ~21 kg CO2 per tree per year
      monthlySavings: Math.round((totalYearlyEnergyDcKwh * 0.12) / 12), // Assume $0.12 per kWh
      buildingArea: buildingInfo?.buildingArea || null,
      selectedCorners: buildingInfo?.buildingCorners?.filter(c => c.selected) || [],
      buildingInsights: rawData
    };
  }

  /**
   * Get mock solar data for development/demo purposes
   * @param {Object} buildingInfo - Building information including corners and area
   * @returns {Object} Mock solar data
   */
  getMockSolarData(buildingInfo = null) {
    let baseEnergy = 3000 + Math.random() * 2000;
    
    // Adjust based on building area if provided
    if (buildingInfo && buildingInfo.buildingArea) {
      const buildingAreaSqM = buildingInfo.buildingArea;
      const selectedCorners = buildingInfo.buildingCorners?.filter(c => c.selected) || [];
      
      if (selectedCorners.length >= 3) {
        // Scale energy based on building area (assuming ~20 kWh per sq meter per year)
        baseEnergy = Math.max(1000, buildingAreaSqM * 20);
      }
    }
    
    const panelCount = Math.round(baseEnergy / 300); // ~300 kWh per panel per year
    const co2Savings = Math.round(baseEnergy * 0.5);
    
    return {
      annualEnergyKwh: Math.round(baseEnergy),
      panelCount: panelCount,
      co2SavingsKgPerYear: co2Savings,
      sunshineHoursPerYear: Math.round(2200 + Math.random() * 600),
      roofSegments: Math.round(1 + Math.random() * 3),
      carbonOffsetTrees: Math.round(co2Savings / 21),
      monthlySavings: Math.round((baseEnergy * 0.12) / 12),
      buildingArea: buildingInfo?.buildingArea || null,
      selectedCorners: buildingInfo?.buildingCorners?.filter(c => c.selected) || [],
      buildingInsights: null,
      isMockData: true
    };
  }

  /**
   * Format solar data for display
   * @param {Object} solarData - Processed solar data
   * @returns {Object} Formatted data for UI
   */
  formatForDisplay(solarData) {
    const result = {
      annualEnergy: `${solarData.annualEnergyKwh.toLocaleString()} kWh/year`,
      panelPotential: `${solarData.panelCount} panels`,
      co2Savings: `${solarData.co2SavingsKgPerYear.toLocaleString()} kg/year`,
      sunshineHours: `${solarData.sunshineHoursPerYear.toLocaleString()} hours/year`,
      roofSegments: `${solarData.roofSegments} roof segments`,
      treesEquivalent: `Equivalent to ${solarData.carbonOffsetTrees} trees`,
      monthlySavings: `~$${solarData.monthlySavings}/month`,
      isMockData: solarData.isMockData || false
    };

    // Add building area information if available
    if (solarData.buildingArea) {
      result.buildingArea = `${Math.round(solarData.buildingArea)} sq meters`;
      result.selectedCorners = `${solarData.selectedCorners?.length || 0} corners selected`;
    }

    return result;
  }

  /**
   * Get advanced solar potential with grid selection, azimuth, and tilt
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} buildingInfo - Detailed building and configuration info
   * @returns {Promise<Object>} Advanced solar data
   */
  async getAdvancedSolarPotential(lat, lng, buildingInfo) {
    try {
      // Request data with expanded radius for better accuracy
      const dataLayers = await this.getDataLayers(lat, lng, buildingInfo.radiusMeters);
      const buildingInsights = await this.getBuildingInsights(lat, lng);
      
      return this.processAdvancedSolarData(buildingInsights, dataLayers, buildingInfo);
    } catch (error) {
      console.error('Failed to get advanced solar potential:', error);
      // Return enhanced mock data
      return this.getAdvancedMockSolarData(buildingInfo);
    }
  }

  /**
   * Process solar data with advanced parameters
   * @param {Object} buildingData - Building insights data
   * @param {Object} layerData - Solar data layers
   * @param {Object} buildingInfo - Configuration parameters
   * @returns {Object} Processed advanced solar data
   */
  processAdvancedSolarData(buildingData, layerData, buildingInfo) {
    // Calculate efficiency based on azimuth and tilt
    const azimuthEfficiency = this.calculateAzimuthEfficiency(buildingInfo.azimuth);
    const tiltEfficiency = this.calculateTiltEfficiency(buildingInfo.tilt, buildingInfo.azimuth);
    const combinedEfficiency = azimuthEfficiency * tiltEfficiency;

    // Base calculations from building data
    let baseEnergyKwh = 4000; // Default base energy
    let basePanelCount = 15; // Default panel count

    if (buildingData && buildingData.solarPotential) {
      const solarPotential = buildingData.solarPotential;
      const roofSegmentStats = solarPotential.roofSegmentStats || [];
      
      baseEnergyKwh = roofSegmentStats.reduce((sum, segment) => 
        sum + (segment.yearlyEnergyDcKwh || 0), 0);
      basePanelCount = roofSegmentStats.reduce((sum, segment) => 
        sum + (segment.panelsCount || 0), 0);
    }

    // Scale based on selected grid area
    const areaScale = buildingInfo.selectedGridArea / Math.max(buildingInfo.buildingArea, 50);
    const scaledEnergyKwh = baseEnergyKwh * areaScale * combinedEfficiency;
    const scaledPanelCount = Math.round(basePanelCount * areaScale);

    // Calculate peak power (assuming 300W panels)
    const peakPowerKw = scaledPanelCount * 0.3;

    // Environmental calculations
    const co2SavingsKg = scaledEnergyKwh * 0.5; // ~0.5 kg CO2 per kWh
    const treesEquivalent = co2SavingsKg / 21; // ~21 kg CO2 per tree per year
    const carMilesOffset = co2SavingsKg * 2.31; // ~2.31 miles per kg CO2

    return {
      annualEnergyKwh: Math.round(scaledEnergyKwh),
      panelCount: scaledPanelCount,
      peakPowerKw: Math.round(peakPowerKw * 10) / 10,
      co2SavingsKgPerYear: Math.round(co2SavingsKg),
      sunshineHoursPerYear: Math.round(2200 + Math.random() * 600),
      efficiencyFactor: Math.round(combinedEfficiency * 100),
      azimuth: buildingInfo.azimuth,
      tilt: buildingInfo.tilt,
      selectedGridArea: buildingInfo.selectedGridArea,
      selectedGridCount: buildingInfo.selectedGridCount,
      buildingArea: buildingInfo.buildingArea,
      carbonOffsetTrees: Math.round(treesEquivalent),
      carMilesOffset: Math.round(carMilesOffset),
      monthlySavings: Math.round((scaledEnergyKwh * 0.12) / 12),
      buildingInsights: buildingData,
      dataLayers: layerData
    };
  }

  /**
   * Calculate efficiency based on azimuth (roof orientation)
   * @param {number} azimuth - Azimuth angle (0-359°)
   * @returns {number} Efficiency factor (0-1)
   */
  calculateAzimuthEfficiency(azimuth) {
    // Optimal is South (180°) for Northern Hemisphere
    const optimalAzimuth = 180;
    const azimuthDiff = Math.abs(azimuth - optimalAzimuth);
    
    // Handle wrap-around (e.g., 350° vs 10°)
    const actualDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
    
    // Efficiency drops as we move away from south
    // 100% at south, ~85% at SE/SW, ~60% at E/W, ~30% at N
    if (actualDiff <= 45) {
      return 1.0 - (actualDiff / 45) * 0.15; // 100% to 85%
    } else if (actualDiff <= 90) {
      return 0.85 - ((actualDiff - 45) / 45) * 0.25; // 85% to 60%
    } else if (actualDiff <= 135) {
      return 0.60 - ((actualDiff - 90) / 45) * 0.30; // 60% to 30%
    } else {
      return 0.30; // North-facing
    }
  }

  /**
   * Calculate efficiency based on tilt angle
   * @param {number} tilt - Tilt angle (0-90°)
   * @param {number} azimuth - Azimuth for context
   * @returns {number} Efficiency factor (0-1)
   */
  calculateTiltEfficiency(tilt, azimuth) {
    // Optimal tilt varies by latitude, but generally 30-35° is good
    const optimalTilt = 32; // Optimal for central Europe
    const tiltDiff = Math.abs(tilt - optimalTilt);
    
    // Efficiency curve for tilt angle
    if (tiltDiff <= 15) {
      return 1.0 - (tiltDiff / 15) * 0.05; // 100% to 95%
    } else if (tiltDiff <= 30) {
      return 0.95 - ((tiltDiff - 15) / 15) * 0.15; // 95% to 80%
    } else if (tiltDiff <= 45) {
      return 0.80 - ((tiltDiff - 30) / 15) * 0.20; // 80% to 60%
    } else {
      return Math.max(0.30, 0.60 - ((tiltDiff - 45) / 45) * 0.30); // 60% to 30%
    }
  }

  /**
   * Get enhanced mock data for advanced analysis
   * @param {Object} buildingInfo - Building configuration
   * @returns {Object} Enhanced mock solar data
   */
  getAdvancedMockSolarData(buildingInfo) {
    const azimuthEfficiency = this.calculateAzimuthEfficiency(buildingInfo.azimuth);
    const tiltEfficiency = this.calculateTiltEfficiency(buildingInfo.tilt, buildingInfo.azimuth);
    const combinedEfficiency = azimuthEfficiency * tiltEfficiency;

    // Base energy scaled by selected area and efficiency
    const baseEnergyPerSqM = 20; // kWh per square meter per year
    const scaledEnergy = buildingInfo.selectedGridArea * baseEnergyPerSqM * combinedEfficiency;
    
    const panelCount = Math.round(buildingInfo.selectedGridArea / 2); // ~2 sq meters per panel
    const peakPowerKw = panelCount * 0.3; // 300W per panel
    const co2Savings = scaledEnergy * 0.5;

    return {
      annualEnergyKwh: Math.round(scaledEnergy),
      panelCount: panelCount,
      peakPowerKw: Math.round(peakPowerKw * 10) / 10,
      co2SavingsKgPerYear: Math.round(co2Savings),
      sunshineHoursPerYear: Math.round(2200 + Math.random() * 600),
      efficiencyFactor: Math.round(combinedEfficiency * 100),
      azimuth: buildingInfo.azimuth,
      tilt: buildingInfo.tilt,
      selectedGridArea: buildingInfo.selectedGridArea,
      selectedGridCount: buildingInfo.selectedGridCount,
      buildingArea: buildingInfo.buildingArea,
      carbonOffsetTrees: Math.round(co2Savings / 21),
      carMilesOffset: Math.round(co2Savings * 2.31),
      monthlySavings: Math.round((scaledEnergy * 0.12) / 12),
      buildingInsights: null,
      dataLayers: null,
      isMockData: true
    };
  }

  /**
   * Format advanced solar data for display
   * @param {Object} solarData - Advanced solar data
   * @returns {Object} Formatted data for UI
   */
  formatAdvancedDisplay(solarData) {
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
      
      return `${closest.symbol} (${azimuth}°)`;
    };

    return {
      annualEnergy: `${solarData.annualEnergyKwh.toLocaleString()} kWh/year`,
      panelPotential: `${solarData.panelCount} panels`,
      co2Savings: `${solarData.co2SavingsKgPerYear.toLocaleString()} kg/year`,
      selectedArea: `${solarData.selectedGridArea} m²`,
      gridCount: `${solarData.selectedGridCount} cells`,
      tiltAngle: `${solarData.tilt}°`,
      azimuthDirection: getAzimuthDirection(solarData.azimuth),
      efficiencyFactor: `${solarData.efficiencyFactor}%`,
      peakPower: `${solarData.peakPowerKw} kW`,
      sunshineHours: `${solarData.sunshineHoursPerYear.toLocaleString()} hours/year`,
      monthlySavings: `~$${solarData.monthlySavings}/month`,
      treesEquivalent: `${solarData.carbonOffsetTrees} trees/year`,
      carMilesOffset: `${solarData.carMilesOffset.toLocaleString()} miles/year`,
      isMockData: solarData.isMockData || false
    };
  }
}
