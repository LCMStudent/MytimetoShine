# Solar Power Calculation - Complete System Diagram

## Overview
This document provides a comprehensive visual representation of the entire solar power calculation process using one large integrated Mermaid diagram.

## Complete Solar Calculation Flow

```mermaid
flowchart TD
    %% User Input Stage
    Start([🚀 Solar Calculator]) --> UserInputs[👤 User Inputs]
    UserInputs --> Location[📍 Location & Panel Config]
    
    %% Regional Check
    Location --> RegionCheck{🌍 Europe?}
    RegionCheck -->|Yes| EuropeRegs[🇪🇺 2000W DC / 800W AC Limits]
    RegionCheck -->|No| NoLimits[🌐 No Limits]
    
    %% Compliance & Efficiency
    EuropeRegs --> ComplianceCheck{✅ Compliant?}
    NoLimits --> EfficiencyCalc[🔧 Panel Efficiency]
    ComplianceCheck -->|Yes| EfficiencyCalc
    ComplianceCheck -->|No| EfficiencyWarn[⚠️ Warning] --> EfficiencyCalc
    
    %% Solar Data
    Location --> SolarAPI[🌞 Google Solar API]
    SolarAPI --> APIData{Data Available?}
    APIData -->|Yes| RealData[📊 Real Solar Data]
    APIData -->|No| FallbackData[📈 German Averages 1100kWh/m²]
    
    %% 24-Hour Simulation
    EfficiencyCalc --> HourlyLoop([⏰ 24-Hour Loop])
    RealData --> HourlyLoop
    FallbackData --> HourlyLoop
    
    HourlyLoop --> Hour[📅 Hour 0-23]
    Hour --> SolarPos[☀️ Solar Position & Atmosphere]
    SolarPos --> WeatherCorr[🌦️ Weather Corrections]
    WeatherCorr --> InstantPower[⚡ Instantaneous Power]
    
    %% Power Calculation & Clipping
    InstantPower --> ClippingCheck{🔌 > Limit?}
    EuropeRegs --> ClippingCheck
    NoLimits --> ClippingCheck
    
    ClippingCheck -->|Yes| ClipPower[✂️ Clip & Track Loss]
    ClippingCheck -->|No| FullPower[⚡ Full Power]
    
    ClipPower --> HourlyTotal[⏰ Add to Total]
    FullPower --> HourlyTotal
    
    HourlyTotal --> NextHour{🔄 Next Hour?}
    NextHour -->|Yes| Hour
    NextHour -->|No| DailyComplete[📊 Daily Complete]
    
    %% Annual Calculations
    DailyComplete --> SeasonalCalc[📅 Seasonal Analysis]
    SeasonalCalc --> AnnualProjection[📈 Annual × 365]
    AnnualProjection --> EconomicCalc[💰 Economics & CO₂]
    
    %% Results
    EconomicCalc --> StandardView[👤 Standard View]
    EconomicCalc --> NerdsView[🤓 Technical View]
    
    %% Final Compliance
    NerdsView --> FinalCompliance{🏛️ Final Status}
    EuropeRegs --> FinalCompliance
    NoLimits --> FinalCompliance
    
    FinalCompliance -->|Europe OK| CompGood[✅ Compliant]
    FinalCompliance -->|Europe Warning| CompWarn[⚠️ Oversized]
    FinalCompliance -->|Europe Error| CompError[❌ Exceeds Limits]
    FinalCompliance -->|Global| CompInfo[ℹ️ No Limits]
    
    %% Final Output
    StandardView --> DisplayResults[📱 Display Results]
    CompGood --> DisplayResults
    CompWarn --> DisplayResults
    CompError --> DisplayResults
    CompInfo --> DisplayResults
    
    DisplayResults --> End([🎉 Complete])
    
    %% Styling
    classDef inputClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef regulationClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dataClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef resultsClass fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    classDef complianceClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class UserInputs,Location inputClass
    class EfficiencyCalc,HourlyLoop,SolarPos,WeatherCorr processClass
    class EuropeRegs,NoLimits,ComplianceCheck regulationClass
    class SolarAPI,RealData,FallbackData dataClass
    class StandardView,NerdsView,DisplayResults resultsClass
    class FinalCompliance,CompGood,CompWarn,CompError,CompInfo complianceClass
```

## Key Formulas & Summary

### Core Calculations
```
Power = Panel_Watts × Efficiency × Irradiance_Factor
Clipped_Power = min(Power, Inverter_Limit)
Daily_Energy = Σ(Clipped_Power for 24 hours)
Annual_Energy = Daily_Energy × 365
```

### Regional Regulations
- **Europe**: 2000W DC / 800W AC limits with compliance checking
- **Global**: No limits, unrestricted solar sizing

### Key Features
- **🌍 Global Support**: Automatic regional detection
- **☀️ Real Solar Data**: Google Solar API integration  
- **🔧 Advanced Physics**: Solar position & atmospheric modeling
- **⚡ Realistic Clipping**: Inverter limitations with loss tracking
- **📊 Dual Views**: Standard user view + technical details
- **🏛️ Smart Compliance**: Location-aware regulatory checking
