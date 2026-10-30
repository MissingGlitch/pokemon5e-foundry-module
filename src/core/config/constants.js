// Centralizes identifiers and key names shared across the Pokémon 5e module.

export const MODULE_ID = 'pokemon5e';
export const PACK_ID_PREFIX = MODULE_ID + '.';
export const TRANSLATION_PREFIX = MODULE_ID.toUpperCase() + '.';

/**
 * Keys used to access the module's registered settings.
 *
 * @type {{DEBUG_MODE: string, DATA_LANGUAGE: string, COMPENDIUM_KEYS: string}}
 */
export const SETTINGS = {
	DEBUG_MODE: 'debugMode',
	DATA_LANGUAGE: 'dataLanguage',
	COMPENDIUM_KEYS: 'compendiumKeys'
};

// export const FLAGS = {
// 	TRANSLATION_DATA: 'translationData'
// 	// POKEMON_DATA: 'pokemonData',
// 	// MOVE_DATA: 'moveData'
// };

// export const TEMPLATES = {
// 	FAKEMON_CREATION_FORM:
// 		'modules/pokemon5e/src/features/fakemon-creation/fakemon-creation-form.hbs'
// };
