// Main entry point for the Pokémon 5e Foundry VTT module.
// It initializes the module and registers its Foundry lifecycle hooks and systems.

import { MODULE_ID } from './core/config/constants.js';
import { registerInitHooks } from './core/hooks/init.js';
import { registerI18nHooks } from './core/hooks/i18n.js';
// import { registerReadyHooks } from './core/hooks/ready.js';
// import { registerCoreSettings } from './core/config/settings.js';
// import { registerPokemonManagement } from './features/pokemon-management/index.js';
// import { registerDnd5eIntegration } from './shared/integrations/dnd5e/index.js';

console.log(`${MODULE_ID} | main.js (Initializing module)`);
registerInitHooks();
registerI18nHooks();

// registerCoreSettings();
// registerReadyHooks();

// registerPokemonManagement();
// registerDnd5eIntegration();
