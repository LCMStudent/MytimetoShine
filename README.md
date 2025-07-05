# Solarized - Balcony Solar Analysis Web Application

A modern, responsive web application that integrates Google Maps with solar API data to help users analyze **balcony solar panel** potential for any building location.

## 🌟 Features

- **Interactive Google Maps Integration**: Click anywhere on the map to select a building location
- **Address Autocomplete**: Smart address search with Google Places integration
- **Building Edge Analysis**: Define building outline and select facade edges for balcony solar installation
- **Balcony-Specific Parameters**: Configure balcony dimensions, panel mounting options, and facade orientation
- **Vertical Panel Mounting**: Optimized calculations for balcony railing and facade mounting
- **Edge-Based Selection**: Click on building edges to select potential balcony solar locations
- **Light/Dark Mode Toggle**: Switch between light and dark themes with a single click
- **Uber-Inspired Design**: Modern, clean interface inspired by Uber's design language
- **Detailed Balcony Solar Analysis**: Get comprehensive balcony solar energy analysis including:
  - Annual energy production for balcony panels (kWh/year)
  - Vertical panel recommendations with facade orientation optimization
  - Economic savings potential
  - CO₂ reduction impact
  - Building edge length and orientation analysis
  - Balcony area calculations with customizable dimensions
- **Visual Building Overlays**: See potential balcony locations directly on the map with:
  - Building outline visualization
  - Edge-based selection for facade analysis
  - Facade orientation indicators
  - Interactive building corner markers
- **Responsive Design**: 
  - Desktop: Left side panel widget
  - Mobile: Bottom panel that doesn't obstruct the map
- **Data Export**: Export detailed balcony analysis results as JSON
- **Theme Persistence**: Your theme preference is automatically saved and restored

## 🏠 Balcony Solar Focus

This application is specifically designed for **balcony solar panel analysis**, focusing on:

### 🔧 Key Differences from Roof Solar:
- **Building Facades**: Analysis focuses on building edges and vertical surfaces
- **Balcony Mounting**: Calculations for railing and facade-mounted panels
- **Vertical Orientation**: Optimized for 90° (vertical) panel mounting
- **Edge Selection**: Select specific building edges where balconies are located
- **Facade Orientation**: Consider building orientation for each edge
- **Balcony Dimensions**: Configurable railing height and balcony depth

### 📐 Analysis Parameters:
- **Balcony Railing Height**: 0.5m - 2.0m (affects panel area)
- **Balcony Depth**: 0.8m - 3.0m (affects available space)
- **Panel Tilt**: 0° - 90° (typically 90° for vertical railing mounting)
- **Facade Orientation**: Full 360° analysis for each building edge
- **Edge Length**: Total available space for panel installation

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Google Maps API key
- Google Solar API key (optional, demo data available)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd solarized
```

2. Install dependencies:
```bash
npm install
```

3. Configure API keys in `src/main.js`:
```javascript
const CONFIG = {
  GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key_here',
  SOLAR_API_KEY: 'your_solar_api_key_here',
  // ... other config
};
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## 🔧 API Setup

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API key)
5. Add your domain to the API key restrictions

### Google Solar API
1. In the same Google Cloud project, enable the Solar API
2. Use the same API key or create a separate one
3. The app includes mock data for development if the Solar API is not configured

## 📱 Usage

### Desktop Experience
- The form widget appears as a side panel on the right
- Full map visibility on the left
- Easy navigation between analysis steps

### Mobile Experience  
- The widget automatically repositions to the bottom of the screen
- Map remains fully visible above the widget
- Touch-friendly interface optimized for mobile interaction

### Analysis Workflow
1. **Select Building Location**: Click on the map or use address autocomplete
2. **Define Building Outline**: Click at least 3 corners to outline the building
3. **Select Balcony Edges**: Click on building edges where balconies could be installed
4. **Configure Balcony Parameters**: Set railing height, balcony depth, and panel orientation
5. **View Results**: See comprehensive balcony solar analysis with facade efficiency
6. **Export Data**: Download detailed analysis results

## 🏗️ Project Structure

```
src/
├── main.js          # Main application class and initialization
├── solarAPI.js      # Solar API service for data fetching
├── mapOverlay.js    # Map visualization and overlay service
├── style.css        # Responsive CSS with mobile-first design
└── index.html       # Application HTML structure
```

## 🎨 Design Features

- **Uber-Inspired Design**: Modern, minimalist interface inspired by Uber's design language
- **Light/Dark Mode**: Seamless theme switching with automatic persistence
- **Inter Font**: Clean, professional typography using Google Fonts
- **Enhanced Animations**: Smooth transitions and micro-interactions
- **Responsive Layout**: Mobile-first CSS with smooth transitions
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Visual Feedback**: Loading states, error notifications, and success messages
- **Dynamic Map Styling**: Map automatically adapts to light/dark theme

### Theme Toggle
- **Location**: Theme toggle button located in the top-right map controls
- **Icons**: 🌙 for light mode, ☀️ for dark mode
- **Persistence**: Theme preference is saved in localStorage and restored on app reload
- **Map Integration**: Google Maps styling automatically adapts to selected theme

## 🔌 API Integration

### Mock Data Mode
The application includes realistic mock data for development and demonstration purposes. When API keys are not configured, the app automatically uses mock data with a clear indication to users.

### Real Data Mode
When properly configured with Google Solar API:
- Fetches actual building insights for selected locations
- Provides real solar irradiance data
- Calculates accurate energy production estimates
- Displays actual roof segment information

## 🌍 Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

1. **Map not loading**: Check your Google Maps API key configuration
2. **Address search not working**: Ensure Places API is enabled
3. **Solar data not available**: Verify Solar API is enabled and configured
4. **Mobile layout issues**: Check viewport meta tag and CSS media queries

### Development Tips

- Use browser developer tools to debug API calls
- Check the console for error messages
- Verify API quotas and billing in Google Cloud Console
- Test responsive design using device simulation

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.

---

Built with ❤️ using Vite, vanilla JavaScript, and modern web technologies.

## 🔬 Advanced Technical Features

### Grid-Based Analysis
- **3×3 Meter Grid System**: Precision grid overlay for accurate area selection
- **Point-in-Polygon Algorithm**: Smart grid cell filtering within building boundaries
- **Real-time Selection**: Interactive grid cell selection with visual feedback
- **Area Calculations**: Automatic calculation of selected areas and scaling

### Solar Efficiency Calculations
- **Azimuth Optimization**: Mathematical efficiency curves based on roof orientation
  - Optimal at 180° (South) with gradual efficiency reduction
  - Custom efficiency factors for all 360° orientations
- **Tilt Angle Analysis**: Latitude-optimized tilt efficiency calculations
  - Peak efficiency around 30-35° for Central Europe
  - Efficiency curves for 0-90° tilt range
- **Combined Efficiency**: Real-time calculation of azimuth × tilt efficiency factors

### Advanced API Integration
- **Expanded Radius Search**: Dynamic radius calculation based on building size
- **Parameterized Requests**: Solar data requests with building and configuration context
- **Enhanced Mock Data**: Realistic mock calculations when APIs unavailable
- **Efficiency Scaling**: Data scaling based on selected grid areas and parameters

### Map Overlay System
- **Multi-layer Visualization**: Building outlines, grid overlays, parameter indicators
- **Azimuth Direction Arrows**: Visual orientation indicators with degree labels
- **Efficiency Circles**: Variable radius efficiency indicators
- **Parameterized Heatmaps**: Solar irradiance visualization based on configuration
- **Advanced Info Windows**: Comprehensive metrics display with formatted data

## 🛠️ Technical Implementation

### Core Components
- **SolarMapApp**: Main application class with step management and coordination
- **SolarAPIService**: Enhanced API service with advanced calculation methods
- **MapOverlayService**: Advanced overlay rendering with parameter visualization
- **Grid Generation**: Mathematical grid cell generation and polygon intersection

### Calculation Engine
```javascript
// Azimuth efficiency calculation (0-359°)
calculateAzimuthEfficiency(azimuth) {
  const optimalAzimuth = 180; // South
  const azimuthDiff = Math.abs(azimuth - optimalAzimuth);
  const actualDiff = Math.min(azimuthDiff, 360 - azimuthDiff);
  // Efficiency ranges: 100% (S) → 85% (SE/SW) → 60% (E/W) → 30% (N)
}

// Tilt efficiency calculation (0-90°)
calculateTiltEfficiency(tilt) {
  const optimalTilt = 32; // Optimal for Central Europe
  const tiltDiff = Math.abs(tilt - optimalTilt);
  // Efficiency curve with peak at 32° and gradual reduction
}

// Combined efficiency for solar potential scaling
combinedEfficiency = azimuthEfficiency × tiltEfficiency
```

### Data Flow
1. **Location Selection** → Geocoding & Address Resolution
2. **Building Definition** → Corner Detection & Area Calculation
3. **Grid Generation** → Mathematical grid overlay within polygon
4. **Parameter Configuration** → Real-time efficiency calculations
5. **Advanced Analysis** → Scaled solar potential with efficiency factors
6. **Visualization** → Multi-layer map overlays with parameter indicators
