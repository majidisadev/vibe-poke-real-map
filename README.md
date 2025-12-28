# Poke Real Map

A locally-installed web application Pokedex with real-world location mapping based on UN Geoscheme regions.

## Features

- 🗺️ **Interactive World Map**: View 22 UN Geoscheme regions with boundary polygons
- 🎯 **Pokemon-Region Assignment**: Assign Pokemon to 0, 1, or multiple regions
- 📍 **Real-life Atlas**: Visual representation of Pokemon locations on a world map
- ✅ **Personal Collection**: Track caught/uncaught status for each Pokemon
- 📱 **Detail Pages**: Comprehensive Pokemon information with region assignments and stat charts
- 💾 **Local Database**: All data stored locally using IndexedDB (browser) or SQLite (Node.js)
- 📤 **Export/Import**: Export your collection data to JSON and import it on other devices

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts
- **Database**: IndexedDB (browser) / SQLite (Node.js)
- **Routing**: React Router
- **State Management**: Zustand + React Context API

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd poke-real-map
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
poke-real-map/
├── src/
│   ├── pages/          # Main page components
│   │   ├── MapView.tsx      # World map with regions
│   │   ├── PokemonList.tsx  # Pokemon list with filters
│   │   ├── PokemonDetail.tsx # Pokemon detail page
│   │   └── RegionManager.tsx # Region assignment manager
│   ├── components/     # Reusable UI components
│   │   ├── ProgressDialog.tsx # Progress dialog component
│   │   └── ui/         # UI component library (buttons, cards, etc.)
│   ├── contexts/       # React context providers
│   │   ├── ToastContext.tsx  # Toast notification context
│   │   └── ProgressContext.tsx # Progress tracking context
│   ├── db/             # Database schemas and data
│   │   ├── schema.ts        # TypeScript interfaces
│   │   ├── regions.ts       # UN Geoscheme 22 regions
│   │   ├── pokemonGames.ts  # Pokemon game data
│   │   └── database.ts      # Database initialization
│   ├── services/       # Business logic
│   │   └── dbService.ts     # Database operations
│   ├── lib/            # Library utilities
│   │   └── utils.ts         # Utility functions
│   └── utils/          # Utility functions
│       └── leafletFix.ts    # Leaflet icon fix
├── public/             # Static assets
└── package.json
```

## UN Geoscheme Regions

The application includes all 22 UN Geoscheme regions:

1. Northern America
2. Central America
3. Caribbean
4. South America
5. Northern Europe
6. Western Europe
7. Eastern Europe
8. Southern Europe
9. Western Asia
10. Central Asia
11. Eastern Asia
12. Southern Asia
13. Southeast Asia
14. Western Africa
15. Central Africa
16. Eastern Africa
17. Southern Africa
18. Northern Africa
19. Australia and New Zealand
20. Melanesia
21. Micronesia
22. Polynesia

## Usage

### Viewing the Map

- Navigate to the home page to see the interactive world map
- Click on any region to see Pokemon assigned to that region
- Regions are color-coded for easy identification

### Managing Pokemon

- Go to "Pokemon" page to see all Pokemon
- Click on any Pokemon to view details
- Toggle caught/uncaught status by clicking the button
- Filter by caught/uncaught status or search by name/number

### Assigning Regions

- Go to "Regions" page
- Select a Pokemon from the list
- Click on region cards to assign/unassign regions
- Pokemon can have 0, 1, or multiple regions

### Exporting and Importing Data

- Click the "Export" button in the navigation bar to download your collection data as a JSON file
- Click the "Import" button to upload a previously exported JSON file
- This allows you to backup your data or transfer it between devices
- The export includes your caught/uncaught status and region assignments

## Database

The application uses IndexedDB for browser storage, which means:

- All data is stored locally in your browser
- No server or internet connection required after initial load
- Data persists across browser sessions
- Each browser profile has its own database

## Development

### Build for Production

```bash
npm run build
```

This will create a `dist/` folder containing the optimized production build.

### Preview Production Build

To test the production build locally, use:

```bash
npm run preview
```

This will start a local server (usually at `http://localhost:4173`) to preview the production build.

### Serving Production Build

After building, the `dist/` folder contains all the static files needed to serve the application. You can use any static file server:

**Using serve (recommended for quick testing):**
```bash
npx serve dist
```

**Using http-server:**
```bash
npx http-server dist
```

**Using Python:**
```bash
python -m http.server -d dist
```

**Deployment Options:**
- **Vercel**: Connect your repository or deploy the `dist/` folder
- **Netlify**: Drag and drop the `dist/` folder or connect your repository
- **GitHub Pages**: Deploy the `dist/` folder using GitHub Actions
- **Any web server**: Upload the contents of `dist/` to your web server's public directory

## License

MIT

## Credits

- Pokemon data and sprites: [PokeAPI](https://pokeapi.co/)
- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/)
- UN Geoscheme regions based on United Nations Statistics Division
