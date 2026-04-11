//* Definitions and Variables
import { pokemonModuleLog } from "./utils/logs.js";
const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const formatPropertyName = (string) => string.split("_").reduce((acc, word) => `${acc} ${capitalize(word)}`, "").trim();
export const POKEMON_TYPES = ["typeless", "steel", "water", "bug", "dragon", "electric", "ghost", "fire", "fairy", "ice", "fighting",	"normal", "grass", "psychic", "rock", "dark", "ground", "poison", "flying"];
const POKEMON_STANDARD_LANGUAGUES = ["kantoan", "johtoan", "hoennese", "sinnohan", "unovan", "kalosian", "alolan", "galarian", "paldean"];
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
const CURRENCY_NAMES_FORMATTED = {
	pokeyen: "Pokéyen",
	pokedollars: "Pokédollars"
}
const PK5E_PREFIX = {
	forLabels: "(pk5e)",
	forProperties: "pokemon"
	// Me di cuenta de esto muy tarde. En vez de usar el prefijo "pokemon" para las propiedades; que ocupa 7 caracteres de longitud, podría haber usado "pk5e" que solo ocupa 4.
	// Esto es importante porque hay algunas propiedades que no pueden tener nombres muy largos, y si el prefijo (que es para diferenciarlo de otras propiedades similares) es largo de por sí, menos caracteres quedarán para el nombre de la propiedad.
	// Sin embargo, como al inicio decidí colocarle pokemon, ahora no se puede cambiar ya que eso haría que todos los pokémon que existen actualmente en los mundos de todos los jugadores dejen de funcionar correctamente.
	// Así que ni modo, nos quedaremos con el prefijo "pokemon" aunque ocupe muchos caracteres. Igualmente no está tan mal. Aunque hubiera sido bonito que fuera solo "pk5e".
};

//* Initializations and Loaded Settings (Init Hook)
Hooks.once("init", () => {
	pokemonModuleLog("pk5e (init): Settings Loaded");

	// Pokemon Types
	const theDndDamageTypesWillBeRemoved = game.settings.get("pokemon5e", "removeDndDamageTypes");
	{
		let labelPrefix = PK5E_PREFIX.forLabels;
		if (theDndDamageTypesWillBeRemoved) {
			labelPrefix = "";
			for (const damageType in CONFIG.DND5E.damageTypes) {
				if (!damageType.startsWith(PK5E_PREFIX.forProperties)) delete CONFIG.DND5E.damageTypes[damageType];
			}
		}
		const theTypeWordWillBeRemoved = game.settings.get("pokemon5e", "removeTypeWord");
		const typeWord = theTypeWordWillBeRemoved ? "" : "Type";
		POKEMON_TYPES.forEach(type => {
			CONFIG.DND5E.damageTypes[`${PK5E_PREFIX.forProperties}_${type}`] = {
				label: (type === "typeless") ? "Typeless" : `${labelPrefix} ${type.capitalize()} ${typeWord}`.trim(), // Ej.: "(pk5e) Fire Type" o "Fire Type" o "Fire"
				isPhysical: false,
				icon: `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/types/${type}.svg`,
				reference: ""
			};
		});
	}

	// Languages
	const theDndLanguagesWillBeRemoved = game.settings.get("pokemon5e", "removeDndLanguagues");
	{
		if (theDndLanguagesWillBeRemoved) {
			delete CONFIG.DND5E.languages.exotic;
			delete CONFIG.DND5E.languages.standard;
		}
		const thePokemonLanguaguesWillBeAdded = game.settings.get("pokemon5e", "addPokemonLanguages");
		if (thePokemonLanguaguesWillBeAdded) {
			const labelPrefix = "Pokémon Setting";
			const propertyPrefix = "pokemon_setting";
			CONFIG.DND5E.languages[`${propertyPrefix}_common`] = {
				label: `${labelPrefix} (Common)`,
				selectable: false,
				children: POKEMON_STANDARD_LANGUAGUES.reduce( (obj, lang) => {
					obj[lang] = capitalize(lang);
					return obj;
				}, {} )
			}
			CONFIG.DND5E.languages[`${propertyPrefix}_rare`] = {
				label: `${labelPrefix} (Rare)`,
				selectable: false,
				children: POKEMON_EXOTIC_LANGUAGUES.reduce( (obj, lang) => {
					obj[lang] = capitalize(lang).replace("Pokemon", "Pokémon");
					return obj;
				}, {} )
			}
		}
	}

	// Pokémon Status Conditions
	const theDndSimilarConditionsWillBeRemoved = game.settings.get("pokemon5e", "removeDndSimilarConditions");
	{
		let labelPrefix = PK5E_PREFIX.forLabels;
		if (theDndSimilarConditionsWillBeRemoved) {
			labelPrefix = "";
			delete CONFIG.DND5E.conditionTypes.poisoned;
			delete CONFIG.DND5E.conditionTypes.paralyzed;
		}
		POKEMON_CONDITIONS.forEach(condition => {
			CONFIG.DND5E.conditionTypes[`${PK5E_PREFIX.forProperties}_${condition}`] = {
				name: `${labelPrefix} ${formatPropertyName(condition)}`.trim(), // Ej.: "(pk5e) Poisoned" o "Poisoned"
				img: `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/conditions/${condition}.svg`,
				reference: POKEMON_CONDITIONS_REFERENCES[condition] || "",
				// Cuando se vaya a implementar el poisoned_badly, seguramente dé error porque tiene un nombre muy largo y se deba acortar a algo como badpoisoned o algo del estilo.
			};
		});
	}

	// Currencies
	const theDndCurrenciesWillBeReplaced = game.settings.get("pokemon5e", "replaceDndCurrencies");
	if (theDndCurrenciesWillBeReplaced) {
		const currencyToChange = "gp"; // pp, gp, ep, sp, cp
		const currencyName = CURRENCY_NAMES_FORMATTED[game.settings.get("pokemon5e", "currencyName")];
		for (const currency in CONFIG.DND5E.currencies) {
			if (currency === currencyToChange) {
				CONFIG.DND5E.currencies[currency].abbreviation = "₽";
				CONFIG.DND5E.currencies[currency].label = currencyName;
				CONFIG.DND5E.currencies[currency].icon = `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/others/currency.png`;

			} else {
				delete CONFIG.DND5E.currencies[currency];
			}
		}
	}

	// Pokemon Move Weapon Type
	CONFIG.DND5E.weaponTypes.pokemon = "Pokémon Move";

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