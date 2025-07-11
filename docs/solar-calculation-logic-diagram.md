# Solar Power Output Calculation Logic Diagram

## Overview
This document provides a comprehensive flow diagram of how the solar power output is calculated in the Solarized application, following German balcony solar regulations and realistic solar physics.

## Main Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SOLAR POWER CALCULATION PIPELINE                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   USER INPUTS   │    │   LOCATION      │    │   PANEL CONFIG  │
│                 │    │                 │    │                 │
│ • Panel Azimuth │    │ • Latitude      │    │ • Total Wattage │
│ • Panel Tilt    │    │ • Longitude     │    │ • Panel Area    │
│ • Location      │    │ • Solar API     │    │ • Efficiency    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         GERMAN REGULATIONS CHECK                               │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Max Panel Cap.  │    │ Max Inverter    │    │ Compliance      │             │
│  │ 2000W DC        │    │ 800W AC Output  │    │ Check           │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PANEL EFFICIENCY CALCULATION                            │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Azimuth Eff.    │    │ Tilt Efficiency │    │ Combined Eff.   │             │
│  │ South=100%      │    │ 30°=100%        │    │ Az × Tilt       │             │
│  │ North=70%       │    │ 0°=85%, 90°=75% │    │ × Seasonal      │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         HOURLY SOLAR CALCULATION                               │
│                      (24 hours × seasonal variations)                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
```

## Detailed Hourly Calculation Process

```
FOR EACH HOUR (0-23):
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SOLAR POSITION CALCULATION                           │
│                                                                                 │
│  Input: Hour, Day of Year (172=Summer Solstice), Latitude (51°N for Germany)   │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Solar Hour      │    │ Declination     │    │ Hour Angle      │             │
│  │ hour - 12       │    │ 23.45° × sin()  │    │ 15° × solar_hr  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                 │                                               │
│                                 ▼                                               │
│  ┌─────────────────┐    ┌─────────────────┐                                    │
│  │ Sun Elevation   │    │ Sun Azimuth     │                                    │
│  │ arcsin(...)     │    │ arccos(...)     │                                    │
│  └─────────────────┘    └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       ATMOSPHERIC ATTENUATION                                  │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Air Mass        │    │ Direct Normal   │    │ Diffuse         │             │
│  │ Kasten-Young    │    │ Irradiance      │    │ Irradiance      │             │
│  │ Formula         │    │ 900×exp(...)    │    │ 100×sin(elev)   │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                 │                                               │
│                                 ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Total Horizontal Irradiance = DNI × sin(elevation) + Diffuse           │   │
│  │ Normalized to 0-1 scale (1000 W/m² = peak)                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      GERMAN WEATHER CORRECTIONS                                │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Seasonal Factor │    │ Weather Factor  │    │ Variation       │             │
│  │ 0.2 (winter) to │    │ 0.65 (German    │    │ Sine wave       │             │
│  │ 1.0 (summer)    │    │ cloud cover)    │    │ pattern         │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PANEL ORIENTATION FACTOR                                  │
│                                                                                 │
│  Calculate how well panel is oriented relative to sun position:                │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Sun Vector      │    │ Panel Normal    │    │ Dot Product     │             │
│  │ (from ground    │    │ Vector (perp.   │    │ = cos(angle)    │             │
│  │ to sun)         │    │ to panel)       │    │ 0 to 1 factor   │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       INSTANTANEOUS POWER CALCULATION                          │
│                                                                                 │
│  Power = DC_Capacity × Panel_Efficiency × Effective_Irradiance                 │
│                                                                                 │
│  Where Effective_Irradiance = Base_Irradiance × Orientation_Factor             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          INVERTER CLIPPING                                     │
│                                                                                 │
│  IF instantaneous_power > 800W:                                                │
│    ┌─────────────────┐    ┌─────────────────┐                                  │
│    │ Actual Output   │    │ Energy Lost     │                                  │
│    │ = 800W          │    │ = excess power  │                                  │
│    └─────────────────┘    └─────────────────┘                                  │
│  ELSE:                                                                          │
│    ┌─────────────────────────────────────────┐                                  │
│    │ Actual Output = instantaneous_power     │                                  │
│    └─────────────────────────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Final Aggregation and Results

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DAILY AGGREGATION                                   │
│                                                                                 │
│  Sum all 24 hourly values:                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ Total Energy    │    │ Energy Lost to  │    │ Max Instant.    │             │
│  │ (Wh/day)        │    │ Clipping (Wh)   │    │ Power (W)       │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                                    │
│  │ Hours Clipped   │    │ Clipping Loss   │                                    │
│  │ (fractional)    │    │ Percentage      │                                    │
│  └─────────────────┘    └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ANNUAL CALCULATION                                   │
│                                                                                 │
│  Daily Energy × 365 = Annual Energy Production (kWh/year)                      │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Additional Seasonal Analysis:                                           │   │
│  │ • Winter Solstice (Day 355): ~1.0 peak sun hours                       │   │
│  │ • Spring Equinox (Day 80): ~2.5 peak sun hours                         │   │
│  │ • Summer Solstice (Day 172): ~4.5 peak sun hours                       │   │
│  │ • Fall Equinox (Day 266): ~2.8 peak sun hours                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FINAL RESULTS                                     │
│                                                                                 │
│  Standard View:                          Stats for Nerds:                      │
│  ├─ Annual Energy (kWh)                  ├─ Peak Sun Hours                     │
│  ├─ Monthly Estimate                     ├─ Max Instantaneous Power            │
│  ├─ CO₂ Savings                          ├─ Hours Clipped per Day              │
│  └─ Economics (savings, payback)         ├─ Clipping Loss Percentage           │
│                                          ├─ Seasonal Breakdown                 │
│                                          ├─ Panel Efficiency Details           │
│                                          └─ Compliance Status                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Formulas and Constants

### German Regulations
- **Max Panel Capacity**: 2000W DC
- **Max Inverter Output**: 800W AC
- **Compliance Check**: Panel capacity ≤ 2000W

### Solar Position Formulas
```
Declination = 23.45° × sin(360° × (284 + day_of_year) / 365)
Hour Angle = 15° × (hour - 12)
Solar Elevation = arcsin(sin(lat) × sin(decl) + cos(lat) × cos(decl) × cos(hour_angle))
Solar Azimuth = arccos((sin(decl) × cos(lat) - cos(decl) × sin(lat) × cos(hour_angle)) / cos(elevation))
```

### Atmospheric Attenuation
```
Air Mass = 1 / (sin(elevation) + 0.50572 × (elevation + 6.07995)^(-1.6364))
Direct Normal Irradiance = 900 × exp(-0.357 × air_mass^0.678)
Diffuse Irradiance = 100 × sin(elevation)
Total Irradiance = DNI × sin(elevation) + Diffuse
```

### Panel Orientation Factor
```
Sun Vector = [cos(elev) × sin(az), cos(elev) × cos(az), sin(elev)]
Panel Normal = [sin(tilt) × sin(panel_az), sin(tilt) × cos(panel_az), cos(tilt)]
Orientation Factor = max(0, dot_product(sun_vector, panel_normal))
```

### Efficiency Calculations
```
Azimuth Efficiency = 0.7 + 0.3 × cos(|panel_azimuth - 180°|)
Tilt Efficiency = varies from 0.75 to 1.0 based on tilt angle (optimal at 30°)
Seasonal Factor = 0.2 + 0.8 × max(0, cos(2π × days_from_winter_solstice / 365))
Weather Factor = 0.65 (German average cloud cover)
```

### Final Power Calculation
```
Instantaneous Power = DC_Capacity × Panel_Efficiency × Effective_Irradiance
Clipped Power = min(Instantaneous_Power, 800W)
Daily Energy = sum(Clipped_Power for each hour)
Annual Energy = Daily_Energy × 365
```

## Data Flow Summary

1. **Input Processing**: User inputs (location, panel config) → API data retrieval
2. **Regulation Check**: German compliance validation (2000W DC, 800W AC limits)
3. **Efficiency Calculation**: Panel orientation efficiency based on azimuth/tilt
4. **Hourly Simulation**: 24-hour solar position and irradiance calculation
5. **Atmospheric Modeling**: Real-world solar attenuation and weather effects
6. **Panel Orientation**: Sun-to-panel angle calculation for each hour
7. **Power Generation**: Instantaneous power calculation per hour
8. **Inverter Clipping**: 800W limit application with loss tracking
9. **Daily Aggregation**: Sum hourly values to daily totals
10. **Annual Projection**: Scale daily results to annual estimates
11. **Results Display**: Split into Standard View and Stats for Nerds

This comprehensive calculation ensures realistic solar power predictions while adhering to German balcony solar regulations.
