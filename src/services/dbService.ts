// Database service for browser environment using IndexedDB
import { Pokemon, Region, PokemonRegion, UserPokemon } from "../db/schema";
import { UN_REGIONS } from "../db/regions";

const DB_NAME = "PokeRealMapDB";
const DB_VERSION = 10; // Increased to add games field to user_pokemon

let db: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

export async function initDB(): Promise<IDBDatabase> {
  // If initialization is already in progress, return the existing promise
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let needsSeeding = false;

    request.onerror = () => {
      initPromise = null;
      reject(request.error || new Error("Request failed with unknown error"));
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      needsSeeding = true;

      // Always recreate Pokemon store on upgrade to fetch fresh data from API
      if (database.objectStoreNames.contains("pokemon")) {
        database.deleteObjectStore("pokemon");
      }
      const pokemonStore = database.createObjectStore("pokemon", {
        keyPath: "id",
        autoIncrement: true,
      });
      pokemonStore.createIndex("number", "number", { unique: true });
      pokemonStore.createIndex("name", "name", { unique: false });
      pokemonStore.createIndex("generation", "generation", { unique: false });

      // Always recreate regions store on upgrade to get latest boundaries
      if (database.objectStoreNames.contains("regions")) {
        database.deleteObjectStore("regions");
      }
      const regionsStore = database.createObjectStore("regions", {
        keyPath: "id",
        autoIncrement: true,
      });
      regionsStore.createIndex("code", "code", { unique: true });

      if (!database.objectStoreNames.contains("pokemon_regions")) {
        const prStore = database.createObjectStore("pokemon_regions", {
          keyPath: ["pokemon_id", "region_id"],
        });
        prStore.createIndex("pokemon_id", "pokemon_id", { unique: false });
        prStore.createIndex("region_id", "region_id", { unique: false });
      }

      if (!database.objectStoreNames.contains("user_pokemon")) {
        database.createObjectStore("user_pokemon", { keyPath: "pokemon_id" });
      }
    };

    request.onsuccess = async () => {
      db = request.result;
      if (needsSeeding && !seedingInProgress) {
        seedingInProgress = true;
        try {
          await seedInitialData(db);
          // Pokemon will be seeded by seedInitialData since store was cleared in onupgradeneeded
        } catch (error) {
          console.error("Error seeding in initDB:", error);
          // Create a meaningful error message if error is null
          const errorMessage =
            error instanceof Error
              ? error.message
              : String(error) || "Unknown database error";
          seedingInProgress = false;
          initPromise = null;
          reject(new Error(`Failed to seed initial data: ${errorMessage}`));
          return;
        }
        seedingInProgress = false;
      }
      initPromise = null;
      resolve(db);
    };
  });

  return initPromise;
}

let seedingInProgress = false;

// Progress callback for API fetching
type ProgressCallback = (
  current: number,
  total: number,
  message?: string
) => void;
let progressCallback: ProgressCallback | null = null;

export function setProgressCallback(callback: ProgressCallback | null) {
  progressCallback = callback;
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

    // Extract base stats
    const stats: { [key: string]: number } = {};
    data.stats.forEach((stat: any) => {
      const statName = stat.stat.name;
      if (statName === "hp") stats.hp = stat.base_stat;
      else if (statName === "attack") stats.attack = stat.base_stat;
      else if (statName === "defense") stats.defense = stat.base_stat;
      else if (statName === "special-attack")
        stats.special_attack = stat.base_stat;
      else if (statName === "special-defense")
        stats.special_defense = stat.base_stat;
      else if (statName === "speed") stats.speed = stat.base_stat;
    });

    // Fetch species data for description, generation, and habitat
    let description = null;
    let generation = null;
    let habitat = null;
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
        // Get generation
        if (speciesData.generation?.url) {
          const genMatch = speciesData.generation.url.match(
            /\/generation\/(\d+)\//
          );
          if (genMatch) {
            generation = parseInt(genMatch[1]);
          }
        }
        // Get habitat
        if (speciesData.habitat?.name) {
          habitat = capitalizeFirst(
            speciesData.habitat.name.replace(/-/g, " ")
          );
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
      generation,
      habitat,
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      special_attack: stats.special_attack,
      special_defense: stats.special_defense,
      speed: stats.speed,
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
      generation: null,
      habitat: null,
      hp: null,
      attack: null,
      defense: null,
      special_attack: null,
      special_defense: null,
      speed: null,
    };
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function seedPokemonFromAPI(
  database: IDBDatabase,
  forceRefresh: boolean = false
) {
  console.log("Fetching all 1025 Pokemon from PokeAPI...");

  // Check if Pokemon already exist
  const pokemonCount = await new Promise<number>((resolve) => {
    const tx = database.transaction("pokemon", "readonly");
    const store = tx.objectStore("pokemon");
    const countRequest = store.count();
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => resolve(0);
  });

  // Seed if no Pokemon exist or if force refresh is requested
  if (pokemonCount === 0 || forceRefresh) {
    // Clear existing Pokemon if force refresh
    if (forceRefresh && pokemonCount > 0) {
      const clearTx = database.transaction("pokemon", "readwrite");
      const clearStore = clearTx.objectStore("pokemon");
      clearStore.clear();
      await new Promise((resolve) => {
        clearTx.oncomplete = () => resolve(undefined);
        clearTx.onerror = () => resolve(undefined);
      });
    }

    // Fetch all 1025 Pokemon (all 9 generations)
    const pokemonPromises = [];
    for (let i = 1; i <= 1025; i++) {
      pokemonPromises.push(fetchPokemonFromAPI(i));
    }

    try {
      // Notify progress start
      if (progressCallback) {
        progressCallback(
          0,
          pokemonPromises.length,
          "Starting to fetch Pokemon data from API..."
        );
      }

      // Process in batches to avoid overwhelming the API
      const batchSize = 50;
      const pokemonList: any[] = [];

      for (let i = 0; i < pokemonPromises.length; i += batchSize) {
        const batch = pokemonPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        pokemonList.push(...batchResults);

        const current = Math.min(i + batchSize, pokemonPromises.length);
        const message = `Fetching Pokemon data: ${current}/${pokemonPromises.length}`;

        // Update progress
        if (progressCallback) {
          progressCallback(current, pokemonPromises.length, message);
        }

        console.log(`Fetched ${current}/${pokemonPromises.length} Pokemon...`);
      }

      // Notify saving to database
      if (progressCallback) {
        progressCallback(
          pokemonPromises.length,
          pokemonPromises.length,
          "Saving data to database..."
        );
      }

      // Create transaction and wait for it to complete
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction("pokemon", "readwrite");
        const pokemonStore = tx.objectStore("pokemon");

        tx.onerror = () =>
          reject(
            tx.error || new Error("Transaction failed with unknown error")
          );
        tx.oncomplete = () => resolve();

        // Add all Pokemon to the store
        pokemonList.forEach((p, index) => {
          try {
            pokemonStore.add({
              id: index + 1,
              number: p.number,
              name: p.name,
              type1: p.type1,
              type2: p.type2 || undefined,
              image_url: p.image_url || undefined,
              description: p.description || undefined,
              generation: p.generation || undefined,
              habitat: p.habitat || undefined,
              hp: p.hp || undefined,
              attack: p.attack || undefined,
              defense: p.defense || undefined,
              special_attack: p.special_attack || undefined,
              special_defense: p.special_defense || undefined,
              speed: p.speed || undefined,
            });
          } catch (error) {
            console.error(`Error adding Pokemon ${p.number}:`, error);
            // Continue with other Pokemon even if one fails
          }
        });
      });

      console.log(`Successfully seeded ${pokemonList.length} Pokemon`);

      // Notify completion
      if (progressCallback) {
        progressCallback(pokemonList.length, pokemonList.length, "Done!");
      }
    } catch (error) {
      console.error("Error seeding Pokemon:", error);
      // Notify error
      if (progressCallback) {
        progressCallback(
          0,
          pokemonPromises.length,
          "Error occurred while fetching data"
        );
      }
      throw error; // Re-throw to propagate error
    }
  }
}

async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    db = await initDB();
    // Seeding is handled in initDB's onsuccess handler, but check if we need to seed
    // in case database existed but was empty (no upgrade happened)
    if (!seedingInProgress && db) {
      // Check if regions exist to determine if seeding is needed
      const regionCount = await new Promise<number>((resolve) => {
        const tx = db!.transaction("regions", "readonly");
        const store = tx.objectStore("regions");
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      });

      if (regionCount === 0) {
        seedingInProgress = true;
        try {
          await seedInitialData(db);
        } catch (error) {
          console.error("Error seeding initial data in getDB:", error);
          seedingInProgress = false;
          // Create a meaningful error message if error is null
          const errorMessage =
            error instanceof Error
              ? error.message
              : String(error) || "Unknown database error";
          throw new Error(`Failed to seed initial data: ${errorMessage}`);
        }
        seedingInProgress = false;
      }
    }
  }
  return db;
}

async function seedInitialData(database: IDBDatabase) {
  // Check if regions already exist
  const regionCount = await new Promise<number>((resolve) => {
    const tx = database.transaction("regions", "readonly");
    const store = tx.objectStore("regions");
    const countRequest = store.count();
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => resolve(0);
  });

  // Check if Pokemon exist
  const pokemonCount = await new Promise<number>((resolve) => {
    const tx = database.transaction("pokemon", "readonly");
    const store = tx.objectStore("pokemon");
    const countRequest = store.count();
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => resolve(0);
  });

  if (regionCount === 0) {
    // Seed regions
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("regions", "readwrite");
      const store = tx.objectStore("regions");

      tx.onerror = () =>
        reject(tx.error || new Error("Transaction failed with unknown error"));
      tx.oncomplete = () => resolve();

      UN_REGIONS.forEach((region, index) => {
        try {
          store.add({
            id: index + 1,
            name: region.name,
            code: region.code,
            boundary: JSON.stringify(region.boundary),
            color: region.color,
          });
        } catch (error) {
          console.error(`Error adding region ${region.name}:`, error);
        }
      });
    });
  } else if (regionCount !== UN_REGIONS.length) {
    // Update regions if count doesn't match (e.g., after adding new regions)
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("regions", "readwrite");
      const store = tx.objectStore("regions");

      tx.onerror = () =>
        reject(tx.error || new Error("Transaction failed with unknown error"));
      tx.oncomplete = () => resolve();

      // Clear and re-add all regions
      store.clear();
      UN_REGIONS.forEach((region, index) => {
        try {
          store.add({
            id: index + 1,
            name: region.name,
            code: region.code,
            boundary: JSON.stringify(region.boundary),
            color: region.color,
          });
        } catch (error) {
          console.error(`Error adding region ${region.name}:`, error);
        }
      });
    });
  }

  // Always seed Pokemon if store is empty (e.g., after upgrade)
  if (pokemonCount === 0) {
    try {
      await seedPokemonFromAPI(database);
    } catch (error) {
      console.error("Error seeding Pokemon in seedInitialData:", error);
      throw error; // Propagate error so caller can handle it
    }
  }
}

// Pokemon operations
export async function getAllPokemon(): Promise<Pokemon[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pokemon", "readonly");
    const store = tx.objectStore("pokemon");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function getPokemonById(id: number): Promise<Pokemon | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pokemon", "readonly");
    const store = tx.objectStore("pokemon");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function getPokemonByNumber(
  number: number
): Promise<Pokemon | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pokemon", "readonly");
    const store = tx.objectStore("pokemon");
    const index = store.index("number");
    const request = index.get(number);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function createPokemon(
  pokemon: Omit<Pokemon, "id">
): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pokemon", "readwrite");
    const store = tx.objectStore("pokemon");
    const request = store.add(pokemon);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

// Region operations
export async function getAllRegions(): Promise<Region[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("regions", "readonly");
    const store = tx.objectStore("regions");
    const request = store.getAll();

    request.onsuccess = () => {
      const regions = request.result.map((r: any) => ({
        ...r,
        boundary:
          typeof r.boundary === "string" ? JSON.parse(r.boundary) : r.boundary,
      }));
      resolve(regions);
    };
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function getRegionById(id: number): Promise<Region | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("regions", "readonly");
    const store = tx.objectStore("regions");
    const request = store.get(id);

    request.onsuccess = () => {
      const region = request.result;
      if (region) {
        region.boundary =
          typeof region.boundary === "string"
            ? JSON.parse(region.boundary)
            : region.boundary;
      }
      resolve(region || null);
    };
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

// Pokemon-Region operations
export async function getPokemonRegions(pokemonId: number): Promise<number[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pokemon_regions", "readonly");
    const store = tx.objectStore("pokemon_regions");
    const index = store.index("pokemon_id");
    const request = index.getAll(pokemonId);

    request.onsuccess = () => {
      const regionIds = request.result.map((pr: PokemonRegion) => pr.region_id);
      resolve(regionIds);
    };
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function setPokemonRegions(
  pokemonId: number,
  regionIds: number[]
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pokemon_regions", "readwrite");
    const store = tx.objectStore("pokemon_regions");

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    // Remove existing regions
    const index = store.index("pokemon_id");
    const getAllRequest = index.getAll(pokemonId);

    getAllRequest.onsuccess = () => {
      // Delete all existing regions for this pokemon
      getAllRequest.result.forEach((pr: PokemonRegion) => {
        store.delete([pr.pokemon_id, pr.region_id]);
      });

      // Add new regions
      regionIds.forEach((regionId) => {
        try {
          store.add({ pokemon_id: pokemonId, region_id: regionId });
        } catch (error) {
          // If add fails (e.g., duplicate), try put instead
          store.put({ pokemon_id: pokemonId, region_id: regionId });
        }
      });
    };

    getAllRequest.onerror = () =>
      reject(
        getAllRequest.error || new Error("Request failed with unknown error")
      );
  });
}

// User Pokemon operations
export async function getUserPokemon(
  pokemonId: number
): Promise<UserPokemon | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("user_pokemon", "readonly");
    const store = tx.objectStore("user_pokemon");
    const request = store.get(pokemonId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function setUserPokemonCaught(
  pokemonId: number,
  caught: boolean
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("user_pokemon", "readwrite");
    const store = tx.objectStore("user_pokemon");

    const getUserRequest = store.get(pokemonId);

    getUserRequest.onsuccess = () => {
      const existing = getUserRequest.result;
      const data: UserPokemon = {
        pokemon_id: pokemonId,
        caught,
        caught_date: caught ? new Date().toISOString() : undefined,
        notes: existing?.notes,
        games: caught ? existing?.games || [] : undefined,
      };

      store.put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("Transaction failed with unknown error"));
    };

    getUserRequest.onerror = () => reject(getUserRequest.error);
  });
}

export async function getAllUserPokemon(): Promise<UserPokemon[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("user_pokemon", "readonly");
    const store = tx.objectStore("user_pokemon");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Request failed with unknown error"));
  });
}

export async function setUserPokemonGames(
  pokemonId: number,
  games: string[]
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("user_pokemon", "readwrite");
    const store = tx.objectStore("user_pokemon");

    const getUserRequest = store.get(pokemonId);

    getUserRequest.onsuccess = () => {
      const existing = getUserRequest.result;
      if (!existing) {
        reject(new Error("Pokemon not found in user collection"));
        return;
      }

      const data: UserPokemon = {
        ...existing,
        games: games.length > 0 ? games : undefined,
      };

      store.put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("Transaction failed with unknown error"));
    };

    getUserRequest.onerror = () => reject(getUserRequest.error);
  });
}

// Export database data (user_pokemon and pokemon_regions)
export interface ExportData {
  user_pokemon: UserPokemon[];
  pokemon_regions: PokemonRegion[];
  export_date: string;
  version: string;
}

export async function exportDatabase(): Promise<ExportData> {
  const db = await getDB();

  // Get all user pokemon
  const userPokemon = await getAllUserPokemon();

  // Get all pokemon regions
  const pokemonRegions = await new Promise<PokemonRegion[]>(
    (resolve, reject) => {
      const tx = db.transaction("pokemon_regions", "readonly");
      const store = tx.objectStore("pokemon_regions");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("Request failed with unknown error"));
    }
  );

  return {
    user_pokemon: userPokemon,
    pokemon_regions: pokemonRegions,
    export_date: new Date().toISOString(),
    version: "1.0",
  };
}

// Import database data
export async function importDatabase(data: ExportData): Promise<void> {
  const db = await getDB();

  // Validate data structure
  if (!data.user_pokemon || !data.pokemon_regions) {
    throw new Error("Invalid export data format");
  }

  // Import user pokemon
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("user_pokemon", "readwrite");
    const store = tx.objectStore("user_pokemon");

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    // Clear existing data
    store.clear();

    // Import new data
    data.user_pokemon.forEach((userPokemon) => {
      store.put(userPokemon);
    });
  });

  // Import pokemon regions
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("pokemon_regions", "readwrite");
    const store = tx.objectStore("pokemon_regions");

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    // Clear existing data
    store.clear();

    // Import new data
    data.pokemon_regions.forEach((pokemonRegion) => {
      store.put(pokemonRegion);
    });
  });
}
