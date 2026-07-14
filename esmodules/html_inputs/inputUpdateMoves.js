import { pk5eLog } from "./../utils/logs.js";
import { POKEMON_TYPES } from "./../addPokemonSystemProperties.js";

//* HTML Button Creation
const updateButton = document.createElement("button");
updateButton.setAttribute("type", "button");
const updateButtonName = "Update Pokémon Moves";
updateButton.setAttribute("aria-label", updateButtonName);
updateButton.setAttribute("data-tooltip", updateButtonName);
updateButton.addEventListener("click", updatePokemonMoves);
const updateButtonIcon = document.createElement("i");
updateButtonIcon.classList.add("fa-solid", "fa-arrows-rotate");
updateButton.appendChild(updateButtonIcon);

//* Input Data to Export
export const updateMoves = {
	name: "Update Moves",
	description: "Automatically update the scaling and stab of all pokémon moves on the sheet.",
	htmlElement: updateButton
};

//* Internal IDs (IIDS)
const IIDS = {
	// Global Data Identifiers
	NO_SCALE: "no-scale", 			//// No Scale Identifier. Used to indicate that a pokémon move has no scaling or stab.

	// Roll Formula Attributes (@)
	SCALE_AT: "@scale", 			//// @ Scale Attribute. Used to indicate in which part of the roll formula the scaling should be.
	STAB_AT: "@stab", 				//// @ STAB Attribute. Used to indicate in which part of the roll formula the STAB should be.

	// Weapon Types Identifiers
	DMG_ATK: "damage-from-attack", 	////
	DMG_SAVE: "damage-from-save", 	////
	DMG_AUTO: "damage-auto",		////
	HEALING: "healing", 			//// Healing Identifier. Used to indicate that a pokémon move heals.
	SIMPLE_DICE: "simple-dice", 	////
	AC: "ac" 						////
}

//* Paths for the different types of weapons (attacks, saves, healings, etc.)
const ALL_SCALING_PATHS = {};
	ALL_SCALING_PATHS[IIDS.DMG_ATK] = "damage.parts";
	ALL_SCALING_PATHS[IIDS.DMG_SAVE] = "damage.parts";
	ALL_SCALING_PATHS[IIDS.DMG_AUTO] = "damage.parts";
	ALL_SCALING_PATHS[IIDS.HEALING] = "healing.custom.formula";
	ALL_SCALING_PATHS[IIDS.SIMPLE_DICE] = "roll.formula";
	ALL_SCALING_PATHS[IIDS.AC] = "";

//* Activities Used for the differtent types of weapons.
const ACTIVITIES = {};
	ACTIVITIES[IIDS.HEALING] = "heal";
	ACTIVITIES[IIDS.DMG_SAVE] = "save";
	ACTIVITIES[IIDS.DMG_ATK] = "attack";
	ACTIVITIES[IIDS.DMG_AUTO] = "damage";
	ACTIVITIES[IIDS.SIMPLE_DICE] = "utility";

//* Update Moves Functionality
function updatePokemonMoves(manualUpdateByClickEvent, sheetForAutoUpdate, ownerIdForAutoUpdate) {
	if (!manualUpdateByClickEvent && !sheetForAutoUpdate) return;
	const isAutoUpdate = !manualUpdateByClickEvent;

	const currentUserId = game.user.id; // ID of the current user. Note: This may differ from the Actor's actual Owner ID (the one who triggered the autoUpdate).
	let sheet = isAutoUpdate ? sheetForAutoUpdate : null;
	const ownerId = isAutoUpdate ? ownerIdForAutoUpdate : currentUserId;

	if (!sheetForAutoUpdate) {
		// Get sheet from HTML Form ID (Manual Update by Click)
		const rawUUID = manualUpdateByClickEvent.target.form.id; // HTML Form Element ID
		pk5eLog(`pk5e (update moves): Sheet UUID from HTML: ${rawUUID}`);
		const idsIdentificator = /(-Scene-[^-]+)?(-Token-[^-]+)?(-Actor-[^-]+)/;
		const parsedUUID = rawUUID.match(idsIdentificator)?.[0]?.replaceAll("-", ".")?.slice(1);
		sheet = fromUuidSync(parsedUUID);
	}

	if (!sheet) {
		ui.notifications.error("No valid sheet found.", { console: true });
		return;
	}

	// If current user is not the owner of the sheet, do not proceed
	if (currentUserId !== ownerId) return;

	// Get all Pokémon Moves
	const allPokemonMoves = sheet.items
		.filter(item => item.type === "weapon")
		.filter(weapon => weapon.system.type.value === "pokemon");

	pk5eLog(`pk5e (update moves): Found ${allPokemonMoves.length} pokémon move(s) on sheet`);

	const sheetLevel = Number(sheet.system.details.level) || 1;
	allPokemonMoves.forEach(pokemonMove => {
		pk5eLog(`pk5e (update moves): Trying to update "${pokemonMove.name}"`);

		const unidentifiedDescription = pokemonMove.system.unidentified.description;
		const scaleHtmlData = getScaleDataFromText(unidentifiedDescription);
		pk5eLog(`pk5e (update moves): "${pokemonMove.name}" unidentified description`, unidentifiedDescription);

		// Validation: Scaling Data
		if (!scaleHtmlData) {
			ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid scaling data.`, { console: true });
			return;
		}

		// No Scaling, No STAB
		if (scaleHtmlData === IIDS.NO_SCALE) {
			pk5eLog(`pk5e (update moves): ✅ "${pokemonMove.name}" does not scale or use stab`);
			return;
		}

		const { rawScale, weaponType, rollFormula } = scaleHtmlData;

		// Weapon Type Validation
		let castDefinedAbilityScore;
		const scalingPath = ALL_SCALING_PATHS[weaponType];
		if (!scalingPath) {
			ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid weapon type.`, { console: true });
			return;
		}

		// Auto Choose Best Ability
		autoChooseBestAbility(pokemonMove, weaponType);

		// Weapon Type (Without Ability Definition) Validation
		if ( rollFormula.includes("@mod") && ( !(weaponType === IIDS.DMG_ATK) && !(weaponType === IIDS.DMG_SAVE) ) ) {
			const pokemonMoveAbility = pokemonMove.system.activities.find(a => a.type === "cast")?.spell?.ability;

			if (!pokemonMoveAbility) {
				ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid cast activity.`, { console: true });
				pk5eLog(`pk5e (update moves): "${pokemonMove.name}" all activities`, pokemonMove.system.activities);
				return;
			}

			const pokemonMoveAbilityScore = pokemonMove.parent.system.abilities[pokemonMoveAbility]?.value;

			if (!pokemonMoveAbilityScore) {
				ui.notifications.warn(`❌ The "${weaponType}" pokémon move "${pokemonMove.name}" does not have a valid ability defined in the cast activity.`, { console: true });
				pk5eLog(`pk5e (update moves): "${pokemonMove.name}" ability to cast defined: ${pokemonMoveAbility}`);
				return;
			}

			castDefinedAbilityScore = pokemonMoveAbilityScore;
		}

		// Roll Formula @SCALE Validation
		if (!rollFormula.includes(IIDS.SCALE_AT)) {
			ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid roll formula.`, { console: true });
			return;
		}

		// Roll Formula @STAB Validation
		let stabType = null;
		if (rollFormula.includes(IIDS.STAB_AT)) {
			POKEMON_TYPES.forEach(type => { if (rollFormula.includes(`${IIDS.STAB_AT}.${type}`)) stabType = type });
			if (!stabType || stabType === "typeless") {
				ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid @stab attribute.`, { console: true });
				return;
			}
		}

		// Raw Scale Validation
		if (rawScale.length === 0 || !rawScale[0]) {
			ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid @scale attribute.`, { console: true });
			return;
		}

		//* Updating Comparing Process (current data vs corresponding data)
		const targetActivity = pokemonMove.system.activities.find(a => a.type === ACTIVITIES[weaponType]);
		const currentValue = getCurrentValue(weaponType, pokemonMove, targetActivity);
		const moveScaling = { lv1: rawScale[0], lv5: rawScale[1], lv10: rawScale[2], lv17: rawScale[3] };
		const correspondingLevel = (sheetLevel >= 17) ? "lv17" : (sheetLevel >= 10) ? "lv10" : (sheetLevel >= 5) ? "lv5" : "lv1";
		const correspondingScaling = getCorrespondingScaling(moveScaling, correspondingLevel);
		const correspondingStab = getCorrespondingStab(pokemonMove, sheetLevel, stabType);

		let correspondingFinalValue = rollFormula.replace(IIDS.SCALE_AT, correspondingScaling).replace(`${IIDS.STAB_AT}.${stabType}`, correspondingStab);
		if (castDefinedAbilityScore) correspondingFinalValue = correspondingFinalValue.replace("@mod", calculateModifier(castDefinedAbilityScore));

		pk5eLog(
			`pk5e (update moves): "${pokemonMove.name}" scaling found`,
			moveScaling,
			`Level: ${sheetLevel} → ${correspondingLevel} | Current: "${currentValue}" → New: "${correspondingFinalValue}" | Cast ability score: "${castDefinedAbilityScore}"`
		);

		if (correspondingFinalValue === currentValue) {
			pk5eLog(`pk5e (update moves): ✅ "${pokemonMove.name}" updated: "${currentValue}" ——→ "${correspondingFinalValue}" (STAB: +${correspondingStab})`);
		} else {
			//* TRUE UPDATE
			let valueToUpdate;

			// All others that are not damage
			if (!(weaponType.includes("damage"))) {
				valueToUpdate = correspondingFinalValue;
			}

			// DMG_ATK, DMG_SAVE, DMG_AUTO
			else {
				valueToUpdate = targetActivity.toObject().damage.parts.map( (dmg, index) => {
					if (index === 0) return { ...dmg, custom: { ...dmg.custom, formula: correspondingFinalValue } };
					else return dmg;
				});
			}

			const itemUpdate = {};
			itemUpdate[`system.activities.${targetActivity.id}.${scalingPath}`] = valueToUpdate;
			pokemonMove.update(itemUpdate, { isFromPk5e: true, pk5e: { isFromUpdateMoves: true } });

			pk5eLog(`pk5e (update moves): ✅ "${pokemonMove.name}" updated: "${currentValue}" ——→ "${correspondingFinalValue}" (STAB: +${correspondingStab})`);
		}
	});
}

//* Helper Functions
function getCorrespondingScaling(moveScaling, level) {
	if (level === "lv17") return moveScaling.lv17 || moveScaling.lv10 || moveScaling.lv5 || moveScaling.lv1;
	if (level === "lv10") return moveScaling.lv10 || moveScaling.lv5 || moveScaling.lv1;
	if (level === "lv5") return moveScaling.lv5 || moveScaling.lv1;
	if (level === "lv1") return moveScaling.lv1;
}

/**
 * Parses scale data from a given HTML string, supporting both v13 and v14 formats.
 *
 * @param {string} text - The raw HTML text containing scale metadata.
 * @returns {string|Object|null} Returns `IIDS.NO_SCALE` if there is no scaling,
 * an object with parsed data `{ rawScale, weaponType, rollFormula }` if successful,
 * or `null` if the data is invalid or incomplete.
 */
function getScaleDataFromText(text) {
	/* ORIGINAL DATA on v13:
	<div class="pokemon5e no-scale">
		<p id="scale">XdX, XdX, XdX, XdX</p>
		<p id="weapon-type">damage-from-attack</p>
		<p id="roll-formula">@scale + @mod + @stab.type</p>
	</div>
	*/

	/* RE-FORMATTED DATA by v14:
	<p id="scale"> <span style="color: transparent" class="pokemon5e"> XdX, XdX, XdX, XdX </span> </p>
	<p id="weapon-type"> <span style="color: transparent" class="pokemon5e"> damage-from-attack </span> </p>
	<p id="roll-formula"> <span style="color: transparent" class="pokemon5e"> @scale + @mod + @stab.type </span> </p>
	*/

	const dataContainer = document.createElement("div");
	dataContainer.innerHTML = text;

	// NO SCALE
	const emptyTextFormV14 = text;
	const uniqueDivForV13 = dataContainer.firstElementChild;
	if (uniqueDivForV13?.classList.contains(IIDS.NO_SCALE))		return IIDS.NO_SCALE;	//? In v13, if the div has the "no-scale" class, it means it does not scale
	if (emptyTextFormV14.trim().length === 0)					return IIDS.NO_SCALE;	//? In v14 due to reformatting, moves with no scale come with their unidentified description empty (the reformatting made them lose the wrapper div)

	// Data retrieval
	// The selector 'p#id span, p#id' will try to find the span first (v14) and if it does not exist, it will use the p (v13)
	const getRawTextData = (id) => dataContainer.querySelector(`p#${id} span.pokemon5e, p#${id}`)?.textContent?.trim();

	const rawScaleText = getRawTextData('scale');
	const weaponType = getRawTextData('weapon-type');
	const rollFormula = getRawTextData('roll-formula');

	// Processing the scaling dice
	const rawScale = rawScaleText ? rawScaleText.split(",").map(x => x.trim()) : null;

	pk5eLog(`pk5e (update moves): Scale data parsed`,
		`rawScale: ${rawScale}`,
		`weaponType: ${weaponType}`,
		`rollFormula: ${rollFormula}`
	);

	if (rawScale && weaponType && rollFormula) {
		return { rawScale, weaponType, rollFormula };
	}

	return null;
}

function getCurrentValue(weaponType, pokemonMove, targetActivity) {
	if (weaponType === IIDS.HEALING) return targetActivity.healing.custom.formula;
	if (weaponType === IIDS.DMG_ATK) return targetActivity.damage.parts[0].custom.formula;
	if (weaponType === IIDS.DMG_AUTO) return targetActivity.damage.parts[0].custom.formula;
	if (weaponType === IIDS.DMG_SAVE) return targetActivity.damage.parts[0].custom.formula;
	if (weaponType === IIDS.SIMPLE_DICE) return targetActivity.roll.formula;
}

/**
 * Calculates the STAB (Same Type Attack Bonus) value for a given Pokémon move.
 *
 * In version "2018", the bonus is a level-based numeric value (0–5).
 * In version "2024", the bonus is the roll formula attribute `"@prof"` (proficiency bonus).
 * Returns `0` if the move's type does not match any of the actor's Pokémon type features,
 * or if the actor has no Pokémon type features at all.
 *
 * @param {Item} pokemonMove - The Pokémon move item whose STAB bonus is being calculated.
 * @param {number} currentLevel - The current level of the actor owning the move.
 * @param {string|null} stabType - The Pokémon type of the move (e.g., `"fire"`, `"water"`), or `null` if the move has no STAB.
 * @returns {number|string} The STAB bonus as a numeric value (2018 version) or as the roll formula string `"@prof"` (2024 version), or `0` if STAB does not apply.
 */
function getCorrespondingStab(pokemonMove, currentLevel, stabType) {
	if (!stabType) return 0;
	const stabVersion = game.settings.get("pokemon5e", "stabVersion");
	const correspondingBonus = (stabVersion === "2024")
		? "@prof"
		: (currentLevel >= 19) ? 5 : (currentLevel >= 15) ? 4 : (currentLevel >= 11) ? 3 : (currentLevel >= 7) ? 2 : (currentLevel >= 3) ? 1 : 0;
	const pokemonTypes = pokemonMove.parent.items
		.filter(i => i.type === "feat") 				// Feature Item
		.filter(i => i.system.type.value === "pokemon") // Pokémon Feature
		.filter(i => i.system.type.subtype === "type"); // Pokémon Type Feature

	if (pokemonTypes.length < 1) return 0;
	const hasTheSameType = pokemonTypes.some(pokemonType => pokemonType.system.identifier === `${stabType}-type`);

	if (hasTheSameType) return correspondingBonus;
	else return 0;
}

function calculateModifier(score) { return Math.floor((score - 10) / 2) };

// Hooks for Auto Updating:
Hooks.on("updateActor", (actor, changes, options, userId) => {
	if (options.isFromPk5e) return;
	updatePokemonMoves(null, actor, userId);
});

Hooks.on("updateItem", (item, changes, options, userId) => {
	if (options.isFromPk5e) return;
	updatePokemonMoves(null, item.parent, userId);
});

Hooks.on("createItem", (item, options, userId) => {
	if (options.isFromPk5e) return;
	updatePokemonMoves(null, item.parent, userId);
});

Hooks.on("deleteItem", (item, options, userId) => {
	if (options.isFromPk5e) return;
	updatePokemonMoves(null, item.parent, userId);
});

//* Paths for the different types of weapons (attacks, saves, healings, etc.) to define/get the ability to use
const ALL_ABILITIES_PATHS = {};
	ALL_ABILITIES_PATHS[IIDS.DMG_ATK] = "attack.ability";
	ALL_ABILITIES_PATHS[IIDS.DMG_SAVE] = "save.dc.calculation";
	ALL_ABILITIES_PATHS[IIDS.DMG_AUTO] = "spell.ability";
	ALL_ABILITIES_PATHS[IIDS.HEALING] = "spell.ability";
	ALL_ABILITIES_PATHS[IIDS.SIMPLE_DICE] = "spell.ability";

const GET_CURRENT_ABILITY = {};
	GET_CURRENT_ABILITY[IIDS.DMG_ATK] = (activity) => activity.toObject().attack.ability;
	GET_CURRENT_ABILITY[IIDS.DMG_SAVE] = (activity) => activity.toObject().save.dc.calculation;
	GET_CURRENT_ABILITY[IIDS.DMG_AUTO] = (activity) => activity.toObject().spell.ability;
	GET_CURRENT_ABILITY[IIDS.HEALING] = (activity) => activity.toObject().spell.ability;
	GET_CURRENT_ABILITY[IIDS.SIMPLE_DICE] = (activity) => activity.toObject().spell.ability;

function autoChooseBestAbility(pokemonMove, weaponType) {
	// Get the abilities the move can use
	const moveDescription = document.createElement("div");
	moveDescription.innerHTML = pokemonMove.toObject().system.description.value;
	const movePower = moveDescription.querySelector("ul li p");
	const movePowerTitle = movePower.querySelector("span");
	movePowerTitle.remove();
	let moveAbilities = movePower.textContent.replace(".", "").split(",").map(s => s.trim());

	// Only 1 ability
	if (moveAbilities.length === 1 && moveAbilities[0] !== "any") return;
	if (moveAbilities[0] === "any") moveAbilities = ["str", "dex", "con", "int", "wis", "cha"];

	// Spanish Patch + Lower Case
	formatSpanishAbilities(moveAbilities);

	// Get highest ability
	const highestAbilityScore = { name: "", value: 0 };
	const sheet = pokemonMove.parent;
	moveAbilities.forEach(ability => {
		const abilityScore = sheet.system.abilities[ability].value;
		if (abilityScore > highestAbilityScore.value) {
			highestAbilityScore.name = ability;
			highestAbilityScore.value = abilityScore;
		}
	});

	const activityType = ACTIVITIES[weaponType].replace("heal", "cast").replace("damage", "cast"); // Healing and AutoDMG use Cast to define the ability to use.
	const targetActivity = pokemonMove.system.activities.find(a => a.type === activityType);
	const currentUsedAbility = GET_CURRENT_ABILITY[weaponType](targetActivity);

	// It already has the best ability
	if (currentUsedAbility === highestAbilityScore.name) return;

	else {
		const abilityUpdate = {};
		const updatePath = ALL_ABILITIES_PATHS[weaponType];
		const updateValue = highestAbilityScore.name;
		abilityUpdate[updatePath] = updateValue;

		const itemUpdate = {};
		itemUpdate[`system.activities.${targetActivity.id}.${updatePath}`] = updateValue;
		pokemonMove.update(itemUpdate, { isFromPk5e: true, pk5e: { isFromUpdateMoves: true } });
	}
}

function formatSpanishAbilities(abilities) {
	abilities.forEach((ab, index) => {
		abilities[index] = ab.replace("FUE", "STR").replace("DES", "DEX").replace("SAB", "WIS").replace("CAR", "CHA").toLocaleLowerCase();
	});
}