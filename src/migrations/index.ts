import * as migration_20260301_add_slug_to_regions_countries from './20260301_add_slug_to_regions_countries';

export const migrations = [
  {
    up: migration_20260301_add_slug_to_regions_countries.up,
    down: migration_20260301_add_slug_to_regions_countries.down,
    name: '20260301_add_slug_to_regions_countries'
  },
];
