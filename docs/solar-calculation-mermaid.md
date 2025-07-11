# Solar Power Calculation - Simplified Mermaid Diagram

## Overview
This document provides a simplified visual representation of the solar power calculation process using Mermaid diagrams.

## Main Calculation Flow

```mermaid
flowchart TD
    A[User Inputs] --> B[Location & Panel Config]
    B --> C{German Regulations Check}
    C -->|✓ Compliant| D[Panel Efficiency Calculation]
    C -->|✗ Exceeds Limits| E[Show Warning]
    E --> D
    
    D --> F[24-Hour Solar Simulation]
    F --> G[Daily Energy Calculation]
    G --> H[Annual Projection]
    H --> I[Results Display]
    
    subgraph "User Inputs"
        A1[Panel Azimuth]
        A2[Panel Tilt]
        A3[Location Coordinates]
        A4[Panel Wattage]
    end
    
    subgraph "German Regulations"
        C1[Max 2000W DC Panels]
        C2[Max 800W AC Inverter]
    end
    
    subgraph "Results"
        I1[Standard View]
        I2[Stats for Nerds]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    
    C --> C1
    C --> C2
    
    I --> I1
    I --> I2
```

## Detailed Hourly Calculation Process

```mermaid
flowchart TD
    Start([For Each Hour 0-23]) --> A[Calculate Solar Position]
    A --> B[Sun Elevation & Azimuth]
    B --> C[Atmospheric Attenuation]
    C --> D[German Weather Corrections]
    D --> E[Panel Orientation Factor]
    E --> F[Instantaneous Power]
    F --> G{Power > 800W?}
    G -->|Yes| H[Clip to 800W + Track Loss]
    G -->|No| I[Use Full Power]
    H --> J[Add to Daily Total]
    I --> J
    J --> K{Last Hour?}
    K -->|No| Start
    K -->|Yes| End([Daily Calculation Complete])
    
    subgraph "Solar Position Calculation"
        A1[Solar Hour = hour - 12]
        A2[Declination Angle]
        A3[Hour Angle = 15° × solar_hour]
        A4[Elevation & Azimuth]
    end
    
    subgraph "Atmospheric Effects"
        C1[Air Mass Calculation]
        C2[Direct Normal Irradiance]
        C3[Diffuse Irradiance]
        C4[Total Horizontal Irradiance]
    end
    
    subgraph "German Weather"
        D1[Seasonal Factor: 0.2-1.0]
        D2[Cloud Cover: 0.65]
        D3[Daily Variation Pattern]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    
    D --> D1
    D --> D2
    D --> D3
```

## Panel Efficiency Calculation

```mermaid
flowchart LR
    A[Panel Configuration] --> B[Azimuth Efficiency]
    A --> C[Tilt Efficiency]
    A --> D[Seasonal Factor]
    
    B --> E[Combined Efficiency]
    C --> E
    D --> E
    
    E --> F[Final Panel Efficiency]
    
    subgraph "Azimuth Efficiency"
        B1[South: 100%]
        B2[East/West: ~85%]
        B3[North: 70%]
    end
    
    subgraph "Tilt Efficiency"
        C1[30°: 100% optimal]
        C2[0° flat: 85%]
        C3[90° vertical: 75%]
    end
    
    subgraph "Seasonal Variation"
        D1[Summer: 100%]
        D2[Spring/Fall: 60-80%]
        D3[Winter: 20%]
    end
    
    B --> B1
    B --> B2
    B --> B3
    
    C --> C1
    C --> C2
    C --> C3
    
    D --> D1
    D --> D2
    D --> D3
```

## Power Calculation Chain

```mermaid
flowchart TD
    A[DC Panel Capacity] --> B[× Panel Efficiency]
    B --> C[× Solar Irradiance]
    C --> D[= Instantaneous Power]
    D --> E{> 800W Inverter Limit?}
    E -->|Yes| F[Output: 800W]
    E -->|No| G[Output: Full Power]
    F --> H[Track Clipping Loss]
    G --> I[No Loss]
    H --> J[Sum All 24 Hours]
    I --> J
    J --> K[Daily Energy Total]
    K --> L[× 365 Days]
    L --> M[Annual Energy Production]
    
    subgraph "Key Values"
        A1[Example: 1600W]
        B1[Example: 0.85]
        C1[Example: 0.6]
        D1[Example: 816W]
    end
    
    A --> A1
    B --> B1
    C --> C1
    D --> D1
```

## Results Structure

```mermaid
flowchart TD
    A[Calculation Results] --> B[Standard View]
    A --> C[Stats for Nerds]
    
    subgraph "Standard View"
        B1[Annual Energy kWh]
        B2[Monthly Estimate]
        B3[CO₂ Savings]
        B4[Economic Analysis]
        B5[Payback Period]
    end
    
    subgraph "Stats for Nerds"
        C1[Peak Sun Hours]
        C2[Max Instantaneous Power]
        C3[Hours Clipped per Day]
        C4[Clipping Loss %]
        C5[Seasonal Breakdown]
        C6[Panel Efficiency Details]
        C7[Compliance Status]
        C8[Daily Energy Wh]
    end
    
    B --> B1
    B --> B2
    B --> B3
    B --> B4
    B --> B5
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    C --> C5
    C --> C6
    C --> C7
    C --> C8
```

## German Regulations Compliance

```mermaid
flowchart TD
    A[Panel Configuration] --> B{Panel Capacity ≤ 2000W?}
    B -->|Yes| C[✓ Panel Compliant]
    B -->|No| D[⚠️ Exceeds Panel Limit]
    
    C --> E{Inverter Output ≤ 800W?}
    D --> E
    E -->|Always| F[✓ Inverter Compliant]
    
    F --> G[Calculate with Clipping]
    
    subgraph "Regulations"
        R1[Max 2000W DC Panels]
        R2[Max 800W AC to Grid]
        R3[No Registration Required]
    end
    
    B --> R1
    E --> R2
    F --> R3
```

## Key Formulas (Simplified)

### Solar Position
```
Sun Elevation = f(hour, day_of_year, latitude)
Sun Azimuth = f(hour, day_of_year, latitude)
```

### Power Calculation
```
Instantaneous Power = Panel_Watts × Efficiency × Irradiance_Factor
Clipped Power = min(Instantaneous Power, 800W)
Daily Energy = sum(Clipped_Power for 24 hours)
Annual Energy = Daily_Energy × 365
```

### Efficiency Factors
```
Panel Efficiency = Azimuth_Factor × Tilt_Factor × Seasonal_Factor
German Weather Factor = 0.65 (average cloud cover)
Seasonal Range = 0.2 (winter) to 1.0 (summer)
```

## Summary

This simplified diagram shows the core calculation flow:

1. **Input Validation** → German regulations check
2. **Efficiency Calculation** → Panel orientation and seasonal factors
3. **Hourly Simulation** → 24-hour solar position and power calculation
4. **Clipping Application** → 800W inverter limit with loss tracking
5. **Results Generation** → Standard and detailed technical views

The system ensures realistic German balcony solar predictions while maintaining regulatory compliance.
