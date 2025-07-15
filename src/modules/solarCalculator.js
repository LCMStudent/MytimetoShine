/**
 * SolarCalculator - Handles solar calculations and German regulations
 */
export class SolarCalculator {
  constructor(solarAPI) {
    this.solarAPI = solarAPI;
  }

  /**
   * Calculate solar energy production for a panel configuration
   */
  async calculatePanelSolarData(location, panelConfig, panelAzimuth, panelTilt) {
    try {
      // Get solar data from API
      const solarData = await this.solarAPI.getSolarData(location.lat, location.lng);
      
      if (!solarData) {
        throw new Error('Failed to get solar data from API');
      }
      
      // Calculate efficiency based on orientation and tilt
      const efficiency = this.calculatePanelEfficiency(panelAzimuth, panelTilt);
      
      // Calculate German balcony solar output with regulations
      const germanOutput = this.calculateGermanSolarOutput(solarData, panelConfig, efficiency, panelAzimuth, panelTilt);
      
      return {
        solarData,
        efficiency,
        germanOutput,
        panelConfig,
        panelAzimuth,
        panelTilt
      };
      
    } catch (error) {
      console.error('Solar calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate panel efficiency based on orientation and tilt
   */
  calculatePanelEfficiency(azimuth, tilt) {
    // Optimal azimuth for Germany is around 180° (south-facing)
    // Optimal tilt is around 30-35° for Germany's latitude
    
    // Calculate azimuth efficiency (south = 100%, north = 70%)
    const azimuthRadians = azimuth * Math.PI / 180;
    const southAzimuth = 180 * Math.PI / 180;
    const azimuthDifference = Math.abs(azimuthRadians - southAzimuth);
    const normalizedAzimuthDiff = Math.min(azimuthDifference, 2 * Math.PI - azimuthDifference);
    const azimuthEfficiency = 0.7 + 0.3 * Math.cos(normalizedAzimuthDiff);
    
    // Calculate tilt efficiency (30° = 100%, 0° = 85%, 90° = 75%)
    let tiltEfficiency;
    if (tilt <= 30) {
      tiltEfficiency = 0.85 + (tilt / 30) * 0.15;
    } else if (tilt <= 60) {
      tiltEfficiency = 1.0 - ((tilt - 30) / 30) * 0.15;
    } else {
      tiltEfficiency = 0.85 - ((tilt - 60) / 30) * 0.10;
    }
    
    // Combine efficiencies
    const totalEfficiency = azimuthEfficiency * tiltEfficiency;
    
    return totalEfficiency;
  }

  /**
   * Calculate solar power output with German balcony solar regulations
   * - Max 800W AC output to grid (inverter limit)
   * - Max 2000W DC panels allowed
   * - Uses real Solar API data when available
   */
  calculateGermanSolarOutput(solarData, panelConfig, efficiency, panelAzimuth = 180, panelTilt = 30) {
    const MAX_INVERTER_OUTPUT_W = 800; // German regulation: max 800W AC to grid
    const MAX_PANEL_CAPACITY_W = 2000; // German regulation: max 2000W DC panels
    
    // Check if system exceeds German limits
    const exceedsPanelLimit = panelConfig.totalWattage > MAX_PANEL_CAPACITY_W;
    
    // Use real Solar API data when available, fallback to German averages
    let annualSunshineHours, peakSunHours;
    
    if (solarData && solarData.solarPotential && solarData.solarPotential.maxSunshineHoursPerYear) {
      // Use real data from Solar API
      annualSunshineHours = solarData.solarPotential.maxSunshineHoursPerYear;
      peakSunHours = annualSunshineHours / 365; // Convert to daily average
      console.log('Using real Solar API data:', { annualSunshineHours, peakSunHours });
    } else {
      // Fallback to German averages
      const annualIrradianceKwhPerSqm = 1100; // Typical for Germany
      peakSunHours = annualIrradianceKwhPerSqm / 365; // ~3.0 hours/day average
      annualSunshineHours = peakSunHours * 365;
      console.log('Using fallback German averages:', { annualIrradianceKwhPerSqm, peakSunHours });
    }
    
    // Calculate realistic daily energy production with clipping
    const dailyProduction = this.calculateDailyEnergyWithClipping(
      panelConfig.totalWattage,
      peakSunHours,
      efficiency,
      MAX_INVERTER_OUTPUT_W,
      panelAzimuth,  // Pass panel orientation
      panelTilt,     // Pass panel tilt
      172            // Summer solstice for base calculation
    );
    
    // Annual calculation: daily average × 365
    const annualEnergyProduction = dailyProduction.totalEnergy * 365;
    const annualEnergyLostToClipping = dailyProduction.energyLostToClipping * 365;
    
    // Calculate clipping statistics
    const totalPotentialEnergy = annualEnergyProduction + annualEnergyLostToClipping;
    const clippingLossPercentage = totalPotentialEnergy > 0 
      ? (annualEnergyLostToClipping / totalPotentialEnergy) * 100 
      : 0;
    
    console.log('Peak sun hours per day:', Math.round(peakSunHours * 100) / 100);
    console.log('Daily energy production (clipped):', Math.round(dailyProduction.totalEnergy), 'Wh');
    console.log('Daily energy lost to clipping:', Math.round(dailyProduction.energyLostToClipping), 'Wh');
    console.log('Annual energy production:', Math.round(annualEnergyProduction / 1000), 'kWh');
    console.log('Annual clipping loss:', Math.round(clippingLossPercentage * 10) / 10, '%');
    console.log('Peak instantaneous power:', Math.round(dailyProduction.maxInstantaneousPower), 'W');
    console.log('Hours clipped per day:', Math.round(dailyProduction.hoursClippedPerDay * 100) / 100);
    
    // Add seasonal analysis for detailed insights
    const seasonalData = this.calculateSeasonalVariations(
      panelConfig.totalWattage,
      efficiency,
      MAX_INVERTER_OUTPUT_W,
      panelAzimuth,
      panelTilt,
      solarData // Pass Solar API data for realistic seasonal calculations
    );
    
    return {
      annualEnergyProduction: Math.round(annualEnergyProduction / 1000), // Convert to kWh
      unclippedEstimate: Math.round(totalPotentialEnergy / 1000),
      energyLostToClipping: Math.round(annualEnergyLostToClipping / 1000),
      clippingLossPercentage: Math.round(clippingLossPercentage * 10) / 10,
      hoursClippedPerDay: Math.round(dailyProduction.hoursClippedPerDay * 100) / 100,
      maxInstantaneousPower: Math.round(dailyProduction.maxInstantaneousPower),
      maxInverterOutput: MAX_INVERTER_OUTPUT_W,
      isClippingSignificant: clippingLossPercentage > 5,
      exceedsInverterCapacity: dailyProduction.maxInstantaneousPower > MAX_INVERTER_OUTPUT_W,
      exceedsPanelLimit,
      isCompliantWithGermanRules: !exceedsPanelLimit,
      peakSunHours: Math.round(peakSunHours * 100) / 100,
      seasonalData: seasonalData, // Add seasonal analysis data
      dailyEnergyWh: Math.round(dailyProduction.totalEnergy) // Add daily energy for detailed view
    };
  }

  /**
   * Calculate solar position and irradiance throughout the day
   * Uses proper solar geometry for German latitude (~51°N)
   */
  calculateSolarPosition(hour, dayOfYear = 172, latitude = 51.0) {
    // Convert hour to decimal (e.g., 12.5 for 12:30)
    const solarHour = hour - 12; // Hours from solar noon
    
    // Solar declination angle (varies throughout year)
    const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    
    // Hour angle (15° per hour from solar noon)
    const hourAngle = 15 * solarHour;
    
    // Solar elevation angle
    const latRad = latitude * Math.PI / 180;
    const declRad = declination * Math.PI / 180;
    const hourRad = hourAngle * Math.PI / 180;
    
    const sinElevation = Math.sin(latRad) * Math.sin(declRad) + 
                        Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourRad);
    
    const elevation = Math.asin(sinElevation) * 180 / Math.PI;
    
    // Solar azimuth angle
    const cosAzimuth = (Math.sin(declRad) * Math.cos(latRad) - 
                       Math.cos(declRad) * Math.sin(latRad) * Math.cos(hourRad)) / 
                       Math.cos(elevation * Math.PI / 180);
    
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * 180 / Math.PI;
    if (hourAngle > 0) azimuth = 360 - azimuth;
    
    return {
      elevation: Math.max(0, elevation), // Sun below horizon = 0
      azimuth: azimuth,
      hourAngle: hourAngle
    };
  }

  /**
   * Calculate atmospheric attenuation based on air mass
   */
  calculateAtmosphericAttenuation(elevation) {
    if (elevation <= 0) return 0;
    
    // Air mass calculation (simplified Kasten-Young formula)
    const elevationRad = elevation * Math.PI / 180;
    const airMass = 1 / (Math.sin(elevationRad) + 0.50572 * Math.pow(elevation + 6.07995, -1.6364));
    
    // Atmospheric attenuation (simplified model)
    // Clear sky conditions with typical German atmospheric conditions
    const directNormalIrradiance = 900 * Math.exp(-0.357 * Math.pow(airMass, 0.678));
    const diffuseIrradiance = 100 * Math.sin(elevationRad);
    
    // Total irradiance on horizontal surface
    const totalIrradiance = directNormalIrradiance * Math.sin(elevationRad) + diffuseIrradiance;
    
    return Math.max(0, totalIrradiance / 1000); // Normalize to 0-1 scale (1000 W/m² = peak)
  }

  /**
   * Generate realistic daily solar irradiance curve for Germany
   * Uses proper solar geometry and atmospheric modeling
   */
  generateGermanSolarCurve(dayOfYear = 172, latitude = 51.0) {
    const hourlyIrradiance = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const solarPos = this.calculateSolarPosition(hour, dayOfYear, latitude);
      
      if (solarPos.elevation > 0) {
        // Calculate base irradiance from solar geometry
        let irradiance = this.calculateAtmosphericAttenuation(solarPos.elevation);
        
        // Apply German weather corrections
        const weatherFactor = this.getGermanWeatherFactor(dayOfYear);
        
        irradiance *= weatherFactor;
        
        // Apply consistent variation pattern (based on hour for consistency)
        const variationFactor = 0.9 + 0.2 * Math.sin((hour * Math.PI) / 12); // Sine wave variation
        irradiance *= variationFactor;
        
        hourlyIrradiance.push(Math.max(0, Math.min(1, irradiance)));
      } else {
        hourlyIrradiance.push(0); // Sun below horizon
      }
    }
    
    return hourlyIrradiance;
  }

  /**
   * Calculate daily energy production with inverter clipping
   * Now accounts for realistic sun movement, panel orientation, and atmospheric effects
   */
  calculateDailyEnergyWithClipping(dcCapacityW, peakSunHours, efficiency, maxInverterOutputW, panelAzimuth = 180, panelTilt = 30, dayOfYear = 172) {
    let totalEnergyWh = 0;
    let energyLostToClippingWh = 0;
    let maxInstantaneousPower = 0;
    let hoursClipped = 0;
    
    // Calculate hourly production accounting for sun movement and panel orientation
    for (let hour = 0; hour < 24; hour++) {
      const baseIrradiance = this.getHourlyIrradiance(hour, peakSunHours, dayOfYear, 51.0);
      
      if (baseIrradiance > 0.001) { // Only process significant irradiance
        // Get actual sun position for this hour
        const sunPosition = this.calculateSolarPosition(hour, dayOfYear);
        
        // Calculate how well the panel is oriented relative to the sun
        const panelOrientationFactor = this.calculatePanelOrientationFactor(
          sunPosition.elevation, 
          sunPosition.azimuth, 
          panelTilt, 
          panelAzimuth
        );
        
        // Effective irradiance considering panel orientation
        const effectiveIrradiance = baseIrradiance * panelOrientationFactor;
        
        // Calculate instantaneous power for this hour
        const instantaneousPower = dcCapacityW * efficiency * effectiveIrradiance;
        
        // Track maximum power
        maxInstantaneousPower = Math.max(maxInstantaneousPower, instantaneousPower);
        
        // Apply inverter clipping
        let actualPower = instantaneousPower;
        if (instantaneousPower > maxInverterOutputW) {
          actualPower = maxInverterOutputW;
          energyLostToClippingWh += (instantaneousPower - maxInverterOutputW);
          
          // Calculate fractional clipping (more accurate than just counting hours)
          const clippingFactor = (instantaneousPower - maxInverterOutputW) / instantaneousPower;
          hoursClipped += clippingFactor; // This gives us fractional hours of clipping
        }
        
        // Add to total energy (1 hour of generation)
        totalEnergyWh += actualPower;
      }
    }
    
    
    return {
      totalEnergy: totalEnergyWh,
      energyLostToClipping: energyLostToClippingWh,
      maxInstantaneousPower: maxInstantaneousPower,
      hoursClippedPerDay: hoursClipped
    };
  }

  /**
   * Calculate how well a panel is oriented relative to the sun at a given time
   * Returns a factor from 0 (no direct sunlight) to 1 (optimal orientation)
   */
  calculatePanelOrientationFactor(sunElevation, sunAzimuth, panelTilt, panelAzimuth) {
    if (sunElevation <= 0) return 0; // Sun below horizon
    
    // Convert angles to radians
    const sunElev = sunElevation * Math.PI / 180;
    const sunAz = sunAzimuth * Math.PI / 180;
    const panelTiltRad = panelTilt * Math.PI / 180;
    const panelAzRad = panelAzimuth * Math.PI / 180;
    
    // Calculate sun vector (pointing from ground to sun)
    const sunX = Math.cos(sunElev) * Math.sin(sunAz);
    const sunY = Math.cos(sunElev) * Math.cos(sunAz);
    const sunZ = Math.sin(sunElev);
    
    // Calculate panel normal vector (perpendicular to panel surface)
    const panelX = Math.sin(panelTiltRad) * Math.sin(panelAzRad);
    const panelY = Math.sin(panelTiltRad) * Math.cos(panelAzRad);
    const panelZ = Math.cos(panelTiltRad);
    
    // Calculate dot product (cosine of angle between vectors)
    const dotProduct = sunX * panelX + sunY * panelY + sunZ * panelZ;
    
    // Return the cosine factor (0 to 1), representing how directly the sun hits the panel
    return Math.max(0, dotProduct);
  }

  /**
   * Get hourly solar irradiance factor (0-1) based on realistic sun position
   * Accounts for German latitude, seasonal variations, and atmospheric effects
   */
  getHourlyIrradiance(hour, peakSunHours, dayOfYear = 172, latitude = 51.0) {
    // Use realistic solar curve based on sun position and atmospheric conditions
    const realisticCurve = this.generateGermanSolarCurve(dayOfYear, latitude);
    const rawFactor = realisticCurve[hour] || 0;
    
    // Scale the curve to match the actual peak sun hours for the location
    // Peak sun hours represents the equivalent hours of full sun
    const totalRawHours = realisticCurve.reduce((sum, factor) => sum + factor, 0);
    const scalingFactor = totalRawHours > 0 ? peakSunHours / totalRawHours : 0;
    
    const scaledIrradiance = rawFactor * scalingFactor;
    
    return Math.max(0, scaledIrradiance);
  }

  /**
   * Calculate seasonal energy production variations using real Solar API data
   * Shows how solar output changes throughout the year based on actual solar geometry
   */
  calculateSeasonalVariations(dcCapacityW, efficiency, maxInverterOutputW, panelAzimuth, panelTilt, solarData = null) {
    const seasons = [
      { name: 'Winter Solstice', day: 355, month: 'December' },
      { name: 'Spring Equinox', day: 80, month: 'March' },
      { name: 'Summer Solstice', day: 172, month: 'June' },
      { name: 'Fall Equinox', day: 266, month: 'September' }
    ];
    
    // Calculate base annual peak sun hours from Solar API or fallback
    let annualPeakSunHours;
    if (solarData && solarData.solarPotential && solarData.solarPotential.maxSunshineHoursPerYear) {
      annualPeakSunHours = solarData.solarPotential.maxSunshineHoursPerYear / 365;
      console.log('Using real Solar API data for seasonal calculations:', { annualPeakSunHours });
    } else {
      // Fallback to German climate averages
      annualPeakSunHours = 1100 / 365; // ~3.0 hours/day average for Germany
      console.log('Using German climate fallback for seasonal calculations:', { annualPeakSunHours });
    }
    
    const seasonalResults = seasons.map(season => {
      // Calculate realistic seasonal variation based on solar geometry
      const seasonalIrradiance = this.calculateSeasonalSolarIrradiance(season.day, 51.0); // German latitude
      const seasonalPeakSunHours = annualPeakSunHours * seasonalIrradiance;
      
      const dailyProduction = this.calculateDailyEnergyWithClipping(
        dcCapacityW,
        seasonalPeakSunHours,
        efficiency,
        maxInverterOutputW,
        panelAzimuth,
        panelTilt,
        season.day
      );
      
      return {
        season: season.name,
        month: season.month,
        dailyEnergyKwh: dailyProduction.totalEnergy / 1000,
        monthlyEnergyKwh: (dailyProduction.totalEnergy * 30) / 1000,
        clippingLossPercent: dailyProduction.energyLostToClipping > 0 
          ? (dailyProduction.energyLostToClipping / (dailyProduction.totalEnergy + dailyProduction.energyLostToClipping)) * 100 
          : 0,
        peakSunHours: Math.round(seasonalPeakSunHours * 100) / 100,
        hoursClipped: dailyProduction.hoursClippedPerDay,
        seasonalFactor: Math.round(seasonalIrradiance * 100) / 100
      };
    });
    
    return seasonalResults;
  }

  /**
   * Calculate seasonal solar irradiance factor based on solar geometry
   * More accurate than fixed multipliers - uses actual sun position calculations
   */
  calculateSeasonalSolarIrradiance(dayOfYear, latitude = 51.0) {
    // Calculate daily total irradiance based on solar geometry
    let totalDailyIrradiance = 0;
    const hourlyReadings = 24;
    
    for (let hour = 0; hour < hourlyReadings; hour++) {
      const solarPos = this.calculateSolarPosition(hour, dayOfYear, latitude);
      
      if (solarPos.elevation > 0) {
        // Calculate atmospheric attenuation
        const irradiance = this.calculateAtmosphericAttenuation(solarPos.elevation);
        totalDailyIrradiance += irradiance;
      }
    }
    
    // Normalize to summer solstice (day 172) as reference (factor = 1.0)
    const summerSolsticeDayOfYear = 172;
    let summerTotalIrradiance = 0;
    
    for (let hour = 0; hour < hourlyReadings; hour++) {
      const solarPos = this.calculateSolarPosition(hour, summerSolsticeDayOfYear, latitude);
      
      if (solarPos.elevation > 0) {
        const irradiance = this.calculateAtmosphericAttenuation(solarPos.elevation);
        summerTotalIrradiance += irradiance;
      }
    }
    
    // Apply German weather factors (cloud cover, atmospheric conditions)
    const weatherFactor = this.getGermanWeatherFactor(dayOfYear);
    const geometricFactor = totalDailyIrradiance / Math.max(summerTotalIrradiance, 0.1);
    
    return Math.max(0.1, Math.min(1.5, geometricFactor * weatherFactor));
  }

  /**
   * Get German-specific weather factors throughout the year
   * Accounts for cloud cover, precipitation, and atmospheric clarity
   */
  getGermanWeatherFactor(dayOfYear) {
    // German weather patterns: cloudy winters, clearer summers
    // Data based on German meteorological service (DWD) climate data
    
    // Winter (Dec-Feb): High cloud cover, low sun angle
    // Spring (Mar-May): Variable weather, increasing clarity
    // Summer (Jun-Aug): Best conditions, least cloud cover
    // Fall (Sep-Nov): Increasing clouds, variable weather
    
    const monthApprox = Math.floor((dayOfYear - 1) / 30.4) + 1; // Approximate month
    
    let weatherFactor;
    if (monthApprox <= 2 || monthApprox === 12) {
      // Winter: 40-50% clear sky probability
      weatherFactor = 0.45;
    } else if (monthApprox >= 3 && monthApprox <= 5) {
      // Spring: 55-65% clear sky probability
      weatherFactor = 0.60;
    } else if (monthApprox >= 6 && monthApprox <= 8) {
      // Summer: 65-75% clear sky probability  
      weatherFactor = 0.70;
    } else {
      // Fall: 50-60% clear sky probability
      weatherFactor = 0.55;
    }
    
    return weatherFactor;
  }

  /**
   * Enhanced panel efficiency calculation with seasonal considerations
   */
  calculateDetailedPanelEfficiency(panelAzimuth, panelTilt, dayOfYear = 172) {
    const baseEfficiency = this.calculatePanelEfficiency(panelAzimuth, panelTilt);
    
    // Add seasonal efficiency variations (snow, temperature effects, etc.)
    const seasonalIrradiance = this.calculateSeasonalSolarIrradiance(dayOfYear);
    const temperatureEfficiency = this.getTemperatureEfficiency(dayOfYear);
    
    const totalEfficiency = baseEfficiency * seasonalIrradiance * temperatureEfficiency;
    
    console.log('Detailed panel efficiency:', {
      baseEfficiency: Math.round(baseEfficiency * 100),
      seasonalFactor: Math.round(seasonalIrradiance * 100),
      temperatureFactor: Math.round(temperatureEfficiency * 100),
      totalEfficiency: Math.round(totalEfficiency * 100)
    });
    
    return totalEfficiency;
  }

  /**
   * Calculate temperature efficiency factor
   * Solar panels lose efficiency at high temperatures
   */
  getTemperatureEfficiency(dayOfYear) {
    // Simplified temperature model for Germany
    // Peak temperature around summer solstice reduces efficiency
    const summerDay = 172;
    const dayOffset = Math.abs(dayOfYear - summerDay);
    const temperatureCycle = Math.cos((dayOffset / 182.5) * Math.PI);
    
    // Temperature coefficient: -0.4%/°C above 25°C
    // Summer: ~25-30°C = 98-100% efficiency
    // Winter: ~0-10°C = 100-102% efficiency  
    const tempEfficiency = 1.0 - (temperatureCycle * 0.05); // Max 5% loss in summer
    
    return Math.max(0.95, Math.min(1.02, tempEfficiency));
  }
}
