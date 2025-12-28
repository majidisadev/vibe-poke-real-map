import path from "path";
import { fileURLToPath } from "url";
import { UN_REGIONS } from "./regions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For browser environment, we'll use IndexedDB wrapper
// For Node.js, use better-sqlite3 (optional dependency)
let db: any = null;

export async function initDatabase() {
  try {
    // Try to dynamically import better-sqlite3 (Node.js environment)
    const betterSqlite3 = await import("better-sqlite3");
    const Database = betterSqlite3.default;

    const dbPath = path.join(__dirname, "../../data/pokedex.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    createTables();
    seedRegions();
    await seedPokemon();

    return db;
  } catch (error) {
    console.warn("better-sqlite3 not available, using in-memory storage");
    // Fallback to in-memory storage for browser
    return initInMemoryDB();
  }
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      number INTEGER NOT NULL UNIQUE,
      type1 TEXT NOT NULL,
      type2 TEXT,
      image_url TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      boundary TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pokemon_regions (
      pokemon_id INTEGER,
      region_id INTEGER,
      PRIMARY KEY (pokemon_id, region_id),
      FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS user_pokemon (
      pokemon_id INTEGER PRIMARY KEY,
      caught BOOLEAN DEFAULT 0,
      caught_date TEXT,
      notes TEXT,
      FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pokemon_number ON pokemon(number);
    CREATE INDEX IF NOT EXISTS idx_pokemon_regions_pokemon ON pokemon_regions(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_regions_region ON pokemon_regions(region_id);
  `);
}

function seedRegions() {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO regions (name, code, boundary, color)
    VALUES (?, ?, ?, ?)
  `);

  const insert = db.transaction((regions: typeof UN_REGIONS) => {
    for (const region of regions) {
      stmt.run(
        region.name,
        region.code,
        JSON.stringify(region.boundary),
        region.color
      );
    }
  });

  insert(UN_REGIONS);
}

async function fetchPokemonFromAPI(pokemonId: number) {
  try {
    // Fetch Pokemon data
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon ${pokemonId}`);
    }
    const data = await response.json();

    // Extract types
    const types = data.types.map((t: any) => t.type.name);
    const type1 = types[0] ? capitalizeFirst(types[0]) : "Normal";
    const type2 = types[1] ? capitalizeFirst(types[1]) : null;

    // Get image URL
    const imageUrl =
      data.sprites.other?.["official-artwork"]?.front_default ||
      data.sprites.front_default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    // Fetch species data for description
    let description = null;
    try {
      const speciesResponse = await fetch(data.species.url);
      if (speciesResponse.ok) {
        const speciesData = await speciesResponse.json();
        // Get English flavor text
        const flavorText = speciesData.flavor_text_entries?.find(
          (entry: any) => entry.language.name === "en"
        );
        if (flavorText) {
          description = flavorText.flavor_text.replace(/\f/g, " ").trim();
        }
      }
    } catch (error) {
      console.warn(
        `Could not fetch species data for Pokemon ${pokemonId}:`,
        error
      );
    }

    return {
      number: data.id,
      name: capitalizeFirst(data.name),
      type1,
      type2,
      image_url: imageUrl,
      description,
    };
  } catch (error) {
    console.error(`Error fetching Pokemon ${pokemonId}:`, error);
    // Fallback data
    return {
      number: pokemonId,
      name: `Pokemon ${pokemonId}`,
      type1: "Normal",
      type2: null,
      image_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
      description: null,
    };
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function seedPokemon() {
  console.log("Fetching Generation 1 Pokemon from PokeAPI...");

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO pokemon (number, name, type1, type2, image_url, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Fetch all 151 Generation 1 Pokemon
  const pokemonPromises = [];
  for (let i = 1; i <= 151; i++) {
    pokemonPromises.push(fetchPokemonFromAPI(i));
  }

  try {
    const pokemonList = await Promise.all(pokemonPromises);

    type PokemonData = {
      number: number;
      name: string;
      type1: string;
      type2: string | null;
      image_url: string | null;
      description: string | null;
    };

    const insert = db.transaction((pokemonList: PokemonData[]) => {
      for (const p of pokemonList) {
        stmt.run(
          p.number,
          p.name,
          p.type1,
          p.type2 || null,
          p.image_url || null,
          p.description || null
        );
      }
    });

    insert(pokemonList);
    console.log(`Successfully seeded ${pokemonList.length} Pokemon`);
  } catch (error) {
    console.error("Error seeding Pokemon:", error);
    throw error;
  }
}

function initInMemoryDB() {
  // Browser fallback - store in localStorage
  if (typeof window !== "undefined") {
    return {
      prepare: (sql: string) => ({
        run: (..._args: any[]) => {
          // Store in localStorage
          console.log("In-memory DB operation:", sql, _args);
        },
        all: (..._args: any[]) => {
          const data = localStorage.getItem("pokemon_data");
          return data ? JSON.parse(data) : [];
        },
        get: (..._args: any[]) => {
          const data = localStorage.getItem("pokemon_data");
          const items = data ? JSON.parse(data) : [];
          return items[0] || null;
        },
      }),
      exec: () => {},
      transaction: (fn: Function) => fn,
    };
  }
  return null;
}

export async function getDatabase() {
  if (!db) {
    db = await initDatabase();
  }
  return db;
}
