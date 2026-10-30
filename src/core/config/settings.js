// Defines and registers the Pokémon 5e module's configurable settings.
// This function is called after i18nInit so dynamic labels use loaded translations.

import { MODULE_ID, SETTINGS } from './constants.js';

/**
 * Registers the configurable settings for the Pokémon 5e module.
 *
 * @returns {void}
 */
function registerModuleSettings() {
	console.log(`${MODULE_ID} | config/settings.js (Registering settings)`);

	//* Setting Title
	// Setting Description
	// game.settings.register(MODULE_ID, SETTINGS.SPECIFIC_SETTING, {
	// 	name: 'POKEMON5E.Settings.SPECIFIC_SETTING.Name',	//// Localized label shown in the module settings window
	// 	hint: 'POKEMON5E.Settings.SPECIFIC_SETTING.Hint',	//// Localized description displayed under the label
	// 	scope: 'client | world | user',						//// Where it is stored: client = browser, world = whole world (GM only), user = per player
	// 	config: 'boolean',									//// true shows the setting in the settings UI, false makes it accessible by code only
	// 	type: 'BuiltinType | DataField | typeof DataModel',	//// Defines the data type used to store and validate the value
	// 	choices: '{ "value": "Label", ... }',				//// Optional; object of "stored value → display label" pairs that turn the control into a <select> dropdown
	// 	default: 'boolean',									//// Optional; value used when no value has been set yet
	// 	onChange: 'Function',								//// Optional; callback that runs with the new value whenever the setting changes
	// 	requiresReload: 'boolean',							//// Optional; prompts a reload to apply (all clients if scope is world)
	// 	input: 'CustomFormInput'							//// Optional; a custom input widget class that overrides the default input rendered for your DataField type
	// });

	//* Data language
	// Language of the module's content (actors, items, etc)
	game.settings.register(MODULE_ID, SETTINGS.DATA_LANGUAGE, {
		name: 'POKEMON5E.Settings.DataLanguage.Name',
		hint: 'POKEMON5E.Settings.DataLanguage.Hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'foundry',
		choices: {
			foundry: `${game.i18n.localize('POKEMON5E.Settings.DataLanguage.SameAsFoundry')} (${CONFIG.supportedLanguages[game.i18n.lang] ?? game.i18n.lang.toUpperCase()})`,
			de: 'POKEMON5E.Settings.DataLanguage.German',
			en: 'POKEMON5E.Settings.DataLanguage.English',
			es: 'POKEMON5E.Settings.DataLanguage.Spanish',
			fr: 'POKEMON5E.Settings.DataLanguage.French',
			it: 'POKEMON5E.Settings.DataLanguage.Italian',
			'pt-BR': 'POKEMON5E.Settings.DataLanguage.PortugueseBR',
			ru: 'POKEMON5E.Settings.DataLanguage.Russian'
		},
		requiresReload: true
	});

	//* Show compendium keys
	// Disable the data language and reveal the translation keys for the module's compendiums
	game.settings.register(MODULE_ID, SETTINGS.COMPENDIUM_KEYS, {
		name: 'POKEMON5E.Settings.CompendiumKeys.Name',
		hint: 'POKEMON5E.Settings.CompendiumKeys.Hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	});

	//* Enable debug logs
	// Displays the module's debug logs in the console
	game.settings.register(MODULE_ID, SETTINGS.DEBUG_MODE, {
		name: 'POKEMON5E.Settings.DebugMode.Name',
		hint: 'POKEMON5E.Settings.DebugMode.Hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false,
		onChange: (value) => {
			console.log(
				`pk5e (settings): "Enable Debug Logs" has been set to <${value}>.`
			);
		}
	});
}

export { registerModuleSettings };

// import { pk5eHelpersMenu } from './applications/helpers-menu/helpers-menu.js';
// import { pk5eLog } from './utils/logs.js';

// Hooks.once('init', () => {
// 	// STAB Version
// 	game.settings.register('pokemon5e', 'stabVersion', {
// 		name: 'STAB Version',
// 		hint: 'This is the final modifier applied to moves with STAB (Same Type Attack Bonus).',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.StringField({
// 			required: true,
// 			nullable: false,
// 			choices: {
// 				2018: '2018 (Level-based)',
// 				2024: '2024 (Proficiency Bonus)'
// 			}
// 		}),
// 		default: '2024',
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "STAB Version" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: false
// 	});

// 	// Add Pokémon Region Languages
// 	game.settings.register('pokemon5e', 'addPokemonLanguages', {
// 		name: 'Add Pokémon Region Languages',
// 		hint: 'This will add the pokémon region languages to the languages list.',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: true,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Add Pokémon Region Languages" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: true
// 	});

// 	// Remove DnD Languages
// 	game.settings.register('pokemon5e', 'removeDndLanguagues', {
// 		name: 'Remove DnD Languages',
// 		hint: 'This will remove the dnd languagues from the languages list.',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: false,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Remove DnD Languages" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: true
// 	});

// 	// Currency Name
// 	game.settings.register('pokemon5e', 'currencyName', {
// 		name: 'Currency Name',
// 		hint: 'This will be the name of the pokémon setting currency.',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.StringField({
// 			required: true,
// 			nullable: false,
// 			choices: {
// 				pokeyen: 'Pokéyen',
// 				pokedollars: 'Pokédollars'
// 			}
// 		}),
// 		default: 'pokedollars',
// 		onChange: (value) => {
// 			pk5eLog(`pk5e (settings): "${value}" currency name has been set.`);
// 		},
// 		requiresReload: true
// 	});

// 	// Replace DnD Currencies
// 	game.settings.register('pokemon5e', 'replaceDndCurrencies', {
// 		name: 'Replace DnD Currencies',
// 		hint: 'This will replace the dnd currencies with the pokémon one.',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: true,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Replace DnD Currencies" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: true
// 	});

// 	// Remove "Type" word from Pokémon Types
// 	game.settings.register('pokemon5e', 'removeTypeWord', {
// 		name: 'Remove "Type" word from Pokémon Types',
// 		hint: 'This will remove the "type" word from the Pokémon types, leaving only the name. Example: "Fire Type" will become "Fire".',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: false,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Remove 'Type' word from Pokémon Types" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: true
// 	});

// 	// Remove DnD Damage Types
// 	game.settings.register('pokemon5e', 'removeDndDamageTypes', {
// 		name: 'Remove DnD Damage Types',
// 		hint: 'This will remove the dnd damage types from the damage types list, leaving only the pokémon types.',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: false,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Remove DnD Damage Types" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: true
// 	});

// 	// Remove DnD Poisoned and Paralyzed Conditions
// 	game.settings.register('pokemon5e', 'removeDndSimilarConditions', {
// 		name: 'Remove DnD Similar Conditions (Poisoned and Paralyzed)',
// 		hint: 'This will remove the dnd poisoned and paralyzed conditions from the conditions list, leaving only the poisoned and paralyzed pokémon status conditions equivalent.',
// 		scope: 'world',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: false,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Remove DnD Similar Conditions (Poisoned and Paralyzed)" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: true
// 	});

// 	// Enable Debug Logs
// 	game.settings.register('pokemon5e', 'enableDebugLogs', {
// 		name: 'Enable Debug Logs',
// 		hint: 'This will enable debug logs for the module. Useful for development and troubleshooting.',
// 		scope: 'user',
// 		config: true,
// 		type: new foundry.data.fields.BooleanField(),
// 		default: false,
// 		onChange: (value) => {
// 			pk5eLog(
// 				`pk5e (settings): "Enable Debug Logs" has been set to <${value}>.`
// 			);
// 		},
// 		requiresReload: false
// 	});

// 	// Show all Helpers
// 	game.settings.registerMenu('pokemon5e', 'helpers', {
// 		name: 'Helpers',
// 		label: 'Open the Helpers Menu',
// 		hint: 'Access all the helpers included in the module to resolve incompatibilities and errors.',
// 		icon: 'fa-solid fa-screwdriver-wrench',
// 		type: pk5eHelpersMenu,
// 		restricted: true
// 	});
// });

// // Partials for Apps:
// Hooks.once('init', async () => {
// 	// Load partials for Helpers
// 	await loadTemplates([
// 		'modules/pokemon5e/esmodules/applications/helpers-menu/helpers/npc-hp-fixer/tree-node.hbs',
// 		'modules/pokemon5e/esmodules/applications/helpers-menu/helpers/npc-hp-fixer/file-explorer.hbs'
// 	]);

// 	// Registrar con nombre corto para poder usarlo en los hbs más fácilmente
// 	Handlebars.registerPartial(
// 		'pk5e-tree-node',
// 		Handlebars.partials[
// 			'modules/pokemon5e/esmodules/applications/helpers-menu/helpers/npc-hp-fixer/tree-node.hbs'
// 		]
// 	);
// 	Handlebars.registerPartial(
// 		'pk5e-file-explorer',
// 		Handlebars.partials[
// 			'modules/pokemon5e/esmodules/applications/helpers-menu/helpers/npc-hp-fixer/file-explorer.hbs'
// 		]
// 	);
// });
