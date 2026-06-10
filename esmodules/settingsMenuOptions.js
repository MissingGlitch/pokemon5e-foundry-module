import { pk5eHelpersMenu } from "./applications/helpersMenu/helpersMenu.js";
import { pk5eLog } from "./utils/logs.js";

Hooks.once("init", () => {
	// Add Pokémon Region Languages
	game.settings.register("pokemon5e", "addPokemonLanguages", {
		name: "Add Pokémon Region Languages",
		hint: "This will add the pokémon region languages to the languages list.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: true,
		onChange: value => { pk5eLog(`pk5e (settings): "Add Pokémon Region Languages" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove DnD Languages
	game.settings.register("pokemon5e", "removeDndLanguagues", {
		name: "Remove DnD Languages",
		hint: "This will remove the dnd languagues from the languages list.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove DnD Languages" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Currency Name
	game.settings.register("pokemon5e", "currencyName", {
		name: "Currency Name",
		hint: "This will be the name of the pokémon setting currency.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.StringField({
			required: true,
			nullable: false,
			choices: {
				"pokeyen": "Pokéyen",
				"pokedollars": "Pokédollars"
			}
		}),
		default: "pokedollars",
		onChange: value => { pk5eLog(`pk5e (settings): "${value}" currency name has been set.`) },
		requiresReload: true
	});

	// Replace DnD Currencies
	game.settings.register("pokemon5e", "replaceDndCurrencies", {
		name: "Replace DnD Currencies",
		hint: "This will replace the dnd currencies with the pokémon one.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: true,
		onChange: value => { pk5eLog(`pk5e (settings): "Replace DnD Currencies" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove "Type" word from Pokémon Types
	game.settings.register("pokemon5e", "removeTypeWord", {
		name: "Remove \"Type\" word from Pokémon Types",
		hint: "This will remove the \"type\" word from the Pokémon types, leaving only the name. Example: \"Fire Type\" will become \"Fire\".",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove 'Type' word from Pokémon Types" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove DnD Damage Types
	game.settings.register("pokemon5e", "removeDndDamageTypes", {
		name: "Remove DnD Damage Types",
		hint: "This will remove the dnd damage types from the damage types list, leaving only the pokémon types.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove DnD Damage Types" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove DnD Poisoned and Paralyzed Conditions
	game.settings.register("pokemon5e", "removeDndSimilarConditions", {
		name: "Remove DnD Similar Conditions (Poisoned and Paralyzed)",
		hint: "This will remove the dnd poisoned and paralyzed conditions from the conditions list, leaving only the poisoned and paralyzed pokémon status conditions equivalent.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove DnD Similar Conditions (Poisoned and Paralyzed)" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Enable Debug Logs
	game.settings.register("pokemon5e", "enableDebugLogs", {
		name: "Enable Debug Logs",
		hint: "This will enable debug logs for the module. Useful for development and troubleshooting.",
		scope: "user",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Enable Debug Logs" has been set to <${value}>.`) },
		requiresReload: false
	});

	// Show all Helpers
	game.settings.registerMenu("pokemon5e", "helpers", {
		name: "Helpers",
		label: "Abrir el Menú de Helpers",
		hint: "Accede a todos los helpers que incluye el módulo para resolver incompatibilidades y errores.",
		icon: "fa-solid fa-screwdriver-wrench",
		type: pk5eHelpersMenu,
		restricted: true
	});
});

// Partials for Apps:
Hooks.once("init", async () => {
	// Load partials for Helpers
    await loadTemplates([
        "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/tree-node.hbs"
    ]);

    // Registrar con nombre corto para poder usarlo en los hbs más fácilmente
    Handlebars.registerPartial(
        "pk5e-tree-node",
        Handlebars.partials["modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/tree-node.hbs"]  
    );
});