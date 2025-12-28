export interface PokemonGame {
  id: string
  name: string
  generation: number
  year: number
  platform: string
}

export const MAIN_SERIES_GAMES: PokemonGame[] = [
  // Generation 1
  { id: 'red', name: 'Pokemon Red', generation: 1, year: 1996, platform: 'Game Boy' },
  { id: 'blue', name: 'Pokemon Blue', generation: 1, year: 1996, platform: 'Game Boy' },
  { id: 'green', name: 'Pokemon Green', generation: 1, year: 1996, platform: 'Game Boy' },
  { id: 'yellow', name: 'Pokemon Yellow', generation: 1, year: 1998, platform: 'Game Boy' },
  
  // Generation 2
  { id: 'gold', name: 'Pokemon Gold', generation: 2, year: 1999, platform: 'Game Boy Color' },
  { id: 'silver', name: 'Pokemon Silver', generation: 2, year: 1999, platform: 'Game Boy Color' },
  { id: 'crystal', name: 'Pokemon Crystal', generation: 2, year: 2000, platform: 'Game Boy Color' },
  
  // Generation 3
  { id: 'ruby', name: 'Pokemon Ruby', generation: 3, year: 2002, platform: 'Game Boy Advance' },
  { id: 'sapphire', name: 'Pokemon Sapphire', generation: 3, year: 2002, platform: 'Game Boy Advance' },
  { id: 'emerald', name: 'Pokemon Emerald', generation: 3, year: 2004, platform: 'Game Boy Advance' },
  { id: 'firered', name: 'Pokemon FireRed', generation: 3, year: 2004, platform: 'Game Boy Advance' },
  { id: 'leafgreen', name: 'Pokemon LeafGreen', generation: 3, year: 2004, platform: 'Game Boy Advance' },
  
  // Generation 4
  { id: 'diamond', name: 'Pokemon Diamond', generation: 4, year: 2006, platform: 'Nintendo DS' },
  { id: 'pearl', name: 'Pokemon Pearl', generation: 4, year: 2006, platform: 'Nintendo DS' },
  { id: 'platinum', name: 'Pokemon Platinum', generation: 4, year: 2008, platform: 'Nintendo DS' },
  { id: 'heartgold', name: 'Pokemon HeartGold', generation: 4, year: 2009, platform: 'Nintendo DS' },
  { id: 'soulsilver', name: 'Pokemon SoulSilver', generation: 4, year: 2009, platform: 'Nintendo DS' },
  
  // Generation 5
  { id: 'black', name: 'Pokemon Black', generation: 5, year: 2010, platform: 'Nintendo DS' },
  { id: 'white', name: 'Pokemon White', generation: 5, year: 2010, platform: 'Nintendo DS' },
  { id: 'black2', name: 'Pokemon Black 2', generation: 5, year: 2012, platform: 'Nintendo DS' },
  { id: 'white2', name: 'Pokemon White 2', generation: 5, year: 2012, platform: 'Nintendo DS' },
  
  // Generation 6
  { id: 'x', name: 'Pokemon X', generation: 6, year: 2013, platform: 'Nintendo 3DS' },
  { id: 'y', name: 'Pokemon Y', generation: 6, year: 2013, platform: 'Nintendo 3DS' },
  { id: 'omegaruby', name: 'Pokemon Omega Ruby', generation: 6, year: 2014, platform: 'Nintendo 3DS' },
  { id: 'alphasapphire', name: 'Pokemon Alpha Sapphire', generation: 6, year: 2014, platform: 'Nintendo 3DS' },
  
  // Generation 7
  { id: 'sun', name: 'Pokemon Sun', generation: 7, year: 2016, platform: 'Nintendo 3DS' },
  { id: 'moon', name: 'Pokemon Moon', generation: 7, year: 2016, platform: 'Nintendo 3DS' },
  { id: 'ultrasun', name: 'Pokemon Ultra Sun', generation: 7, year: 2017, platform: 'Nintendo 3DS' },
  { id: 'ultramoon', name: 'Pokemon Ultra Moon', generation: 7, year: 2017, platform: 'Nintendo 3DS' },
  { id: 'letsgopikachu', name: "Pokemon: Let's Go, Pikachu!", generation: 7, year: 2018, platform: 'Nintendo Switch' },
  { id: 'letsgoeevee', name: "Pokemon: Let's Go, Eevee!", generation: 7, year: 2018, platform: 'Nintendo Switch' },
  
  // Generation 8
  { id: 'sword', name: 'Pokemon Sword', generation: 8, year: 2019, platform: 'Nintendo Switch' },
  { id: 'shield', name: 'Pokemon Shield', generation: 8, year: 2019, platform: 'Nintendo Switch' },
  { id: 'brilliantdiamond', name: 'Pokemon Brilliant Diamond', generation: 8, year: 2021, platform: 'Nintendo Switch' },
  { id: 'shiningpearl', name: 'Pokemon Shining Pearl', generation: 8, year: 2021, platform: 'Nintendo Switch' },
  { id: 'legendsarceus', name: 'Pokemon Legends: Arceus', generation: 8, year: 2022, platform: 'Nintendo Switch' },
  
  // Generation 9
  { id: 'scarlet', name: 'Pokemon Scarlet', generation: 9, year: 2022, platform: 'Nintendo Switch' },
  { id: 'violet', name: 'Pokemon Violet', generation: 9, year: 2022, platform: 'Nintendo Switch' },
]

