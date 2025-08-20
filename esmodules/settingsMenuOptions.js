Hooks.once("init", () => {
	// Add Pokémon Region Languages
	game.settings.register("pokemon5e", "addPokemonLanguages", {
		name: "Add Pokémon Region Languages",
		hint: "This will add the pokémon region languages to the languages list.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: true,
		// onChange: value => { console.log(`"Add Pokémon Region Languages" has been set to <${value}>.`) },
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
		// onChange: value => { console.log(`"Remove DnD Languages" has been set to <${value}>.`) },
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
		// onChange: value => { console.log(`"${value}" currency name has been set.`) },
		requiresReload: true
	});

	// Currency Icon
	game.settings.register("pokemon5e", "currencyIcon", {
		name: "Currency Icon",
		hint: "This will be the icon of the pokémon setting currency.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.StringField({
			required: true,
			nullable: false,
			choices: {
				"gold": "Gold Icon",
				"silver": "Silver Icon"
			},
		}),
		default: "gold",
		// onChange: value => { console.log(`"${value}" currency icon has been set.`) },
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
		// onChange: value => { console.log(`"Replace DnD Currencies" has been set to <${value}>.`) },
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
		// onChange: value => { console.log(`"Remove DnD Damage Types" has been set to <${value}>.`) },
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
		// onChange: value => { console.log(`"Remove Type word from Pokémon Types" has been set to <${value}>.`) },
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
		// onChange: value => { console.log(`"Remove DnD Similar Conditions (Poisoned and Paralyzed)" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Hide "Update Moves" Button Info Messages
	game.settings.register("pokemon5e", "hideUpdateMovesButtonMessages", {
		name: "Hide messages from the \"Update Moves\" button",
		hint: "When the button is pressed, the update will simply be applied without any messages indicating the changes. Error messages, however, will still be shown if any occur.",
		scope: "user",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		// onChange: value => { console.log(`"Remove DnD Similar Conditions (Poisoned and Paralyzed)" has been set to <${value}>.`) },
		requiresReload: false
	});
});