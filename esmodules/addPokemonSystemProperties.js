//* Definitions and Variables
import { pokemonModuleLog } from "./utils/logs.js";
const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const formatPropertyName = (string) => string.split("_").reduce((acc, word) => `${acc} ${capitalize(word)}`, "").trim();
export const POKEMON_TYPES = ["typeless", "steel", "water", "bug", "dragon", "electric", "ghost", "fire", "fairy", "ice", "fighting",	"normal", "grass", "psychic", "rock", "dark", "ground", "poison", "flying"];
const POKEMON_STANDARD_LANGUAGUES = ["kantoan", "jhotoan", "hoennese", "sinnohan", "unovan", "kalosian", "alolan", "galarian", "paldean"];
const POKEMON_EXOTIC_LANGUAGUES = ["unown", "pokemon"];
const POKEMON_CONDITIONS = ["asleep", "burned", "frozen", "paralyzed", "poisoned", "confused", "flinched"]; // No están: ["poisoned_badly", "fainted"]
const POKEMON_CONDITIONS_REFERENCES = {
	asleep: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.dbEFGKXeoIM9V9WZ",
	burned: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.s9ZnlAxt05BvQi3y",
	frozen: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.IB2TcccVMplAoHgr",
	paralyzed: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.znhZDTB3NO7hgyHq",
	poisoned: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.mGwSRQnixsPaH84o",
	confused: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.uAmocf1N2gcBf24K",
	flinched: "Compendium.pokemon5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.SbZkNPk5D8VpsYJq"
}
const currenciesNamesFormatted = {
	pokeyen: "Pokéyen",
	pokedollars: "Pokédollars"
}
const pokemonPrefix = "(Pokémon) ";

//* Initializations and Loaded Settings (Init Hook)
Hooks.once("init", () => {
	pokemonModuleLog("<-- Init Hook: Pokémon 5e Settings Loaded -->");

	// Pokemon Types
	const theDndDamageTypesWillBeRemoved = game.settings.get("pokemon5e", "removeDndDamageTypes");
	let typeDiscriminatorPrefix = pokemonPrefix;
	if (theDndDamageTypesWillBeRemoved) {
		typeDiscriminatorPrefix = "";
		for (const damageType in CONFIG.DND5E.damageTypes) {
			if (!damageType.startsWith("pokemon_")) delete CONFIG.DND5E.damageTypes[damageType];
		}
	}
	const theTypeWordWillBeRemoved = game.settings.get("pokemon5e", "removeTypeWord");
	const typeWord = theTypeWordWillBeRemoved ? "" : " Type";
	POKEMON_TYPES.forEach(type => {
		CONFIG.DND5E.damageTypes[`pokemon_${type}`] = {
			label: (type === "typeless") ? "Typeless" : `${typeDiscriminatorPrefix}${type.capitalize()}${typeWord}`, // Ej.: "(Pokémon) Fire Type" o "Fire Type" o "Fire"
			isPhysical: false,
			icon: `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/types/${type}.svg`,
			reference: ""
		};
	});

	// Languages
	const theDndLanguagesWillBeRemoved = game.settings.get("pokemon5e", "removeDndLanguagues");
	if (theDndLanguagesWillBeRemoved) {
		delete CONFIG.DND5E.languages.exotic;
		delete CONFIG.DND5E.languages.standard;
	}
	const thePokemonLanguaguesWillBeAdded = game.settings.get("pokemon5e", "addPokemonLanguages");
	if (thePokemonLanguaguesWillBeAdded) {
		CONFIG.DND5E.languages.pokemon_setting_common = {
			label: "Pokémon Setting (Common)",
			selectable: false,
			children: POKEMON_STANDARD_LANGUAGUES.reduce( (obj, lang) => {
				obj[lang] = capitalize(lang);
				return obj;
			}, {} )
		}
		CONFIG.DND5E.languages.pokemon_setting_rare = {
			label: "Pokémon Setting (Rare)",
			selectable: false,
			children: POKEMON_EXOTIC_LANGUAGUES.reduce( (obj, lang) => {
				obj[lang] = capitalize(lang).replace("Pokemon", "Pokémon");
				return obj;
			}, {} )
		}
	}

	// Pokémon Status Conditions
	const theDndSimilarConditionsWillBeRemoved = game.settings.get("pokemon5e", "removeDndSimilarConditions");
	let conditionDiscriminatorPrefix = pokemonPrefix;
	if (theDndSimilarConditionsWillBeRemoved) {
		conditionDiscriminatorPrefix = "";
		delete CONFIG.DND5E.conditionTypes.poisoned;
		delete CONFIG.DND5E.conditionTypes.paralyzed;
	}
	POKEMON_CONDITIONS.forEach(condition => {
		CONFIG.DND5E.conditionTypes[`PKMN${condition}`.replace("poisoned_badly", "badpoisoned")] = {
			name: `${conditionDiscriminatorPrefix}${formatPropertyName(condition)}`, // Ej.: "(Pokémon) Poisoned" o "Poisoned"
			img: `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/conditions/${condition}.png`,
			reference: POKEMON_CONDITIONS_REFERENCES[condition] || "",
		};
	});

	// Currencies
	const theDndCurrenciesWillBeReplaced = game.settings.get("pokemon5e", "replaceDndCurrencies");
	if (theDndCurrenciesWillBeReplaced) {
		const currencyToChange = "gp"; // pp, gp, ep, sp, cp
		const iconType = game.settings.get("pokemon5e", "currencyIcon");
		const currencyName = currenciesNamesFormatted[game.settings.get("pokemon5e", "currencyName")];
		for (const currency in CONFIG.DND5E.currencies) {
			if (currency === currencyToChange) {
				CONFIG.DND5E.currencies[currency].abbreviation = "₽";
				CONFIG.DND5E.currencies[currency].label = currencyName;
				CONFIG.DND5E.currencies[currency].icon = `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/others/pokedollar-${iconType}.png`;

			} else {
				delete CONFIG.DND5E.currencies[currency];
			}
		}
	}

	// Pokemon Move Weapon Type
	CONFIG.DND5E.weaponTypes["pokemon"] = "Pokémon Move";

	// Pokémon Feature Type
	CONFIG.DND5E.featureTypes.pokemon = {
		label: "Pokémon Feature",
		subtypes: {
			type: "Pokémon Type",
			nature: "Pokémon Nature",
			ability: "Pokémon Ability",
			species: "Species Trait"
		}
	}
});