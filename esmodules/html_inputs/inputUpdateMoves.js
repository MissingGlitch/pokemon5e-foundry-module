import { pokemonModuleLog } from "./../utils/logs.js";
import { POKEMON_TYPES } from "./../addPokemonSystemProperties.js";

//* HTML Button Creation
const updateButton = document.createElement("button");
updateButton.setAttribute("type", "button");
const updateButtonName = "Update Pokémon Moves";
updateButton.setAttribute("aria-label", updateButtonName);
updateButton.setAttribute("data-tooltip", updateButtonName);
updateButton.addEventListener("click", updatePokemonMoves);
const updateButtonIcon = document.createElement("i");
updateButtonIcon.classList.add("fas", "fa-arrows-rotate");
updateButton.appendChild(updateButtonIcon);

//* Internal IDs (IIDS)
const IIDS = {
	// Global Data Identificators
	NO_SCALE: "no-scale", 			//// No Scale Identifier. Used to indicate that a pokémon move has no scaling nor stab.

	// Roll Formula Attributes (@)
	SCALE_AT: "@scale", 			//// @ Scale Attribute. Used to indicate in which part of the roll formula the scaling should be.
	STAB_AT: "@stab", 				//// @ STAB Attribute. Used to indicate in which part of the roll formula the STAB should be.

	// Weapon Types Identificators
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
function updatePokemonMoves(event) {
	pokemonModuleLog("<-- Pokémon 5e Update Pokémon Moves -->");

	// Identify the type of actor (synthetic or normal)
	const rawUUID = event.target.form.id; // HTML Form Element ID
	console.info(`Sheet UUID from HTML: ${rawUUID}`);
	const idsIdentificator = /(-Scene-[^-]+)?(-Token-[^-]+)?(-Actor-[^-]+)/;
	const paredUUID = rawUUID.match(idsIdentificator)?.[0]?.replaceAll("-", ".")?.slice(1);
	const sheet = fromUuidSync(paredUUID);

	if (!sheet) {
		ui.notifications.error("No valid sheet found.", { console: true });
		return;
	}

	// Get all Pokémon Moves
	const allPokemonMoves = sheet.items
		.filter(item => item.type === "weapon")
		.filter(weapon => weapon.system.type.value === "pokemon");

	if (allPokemonMoves.length === 0) {
		ui.notifications.warn(`No pokémon moves found in this sheet.`, { console: true });
		return;
	}

	const sheetLevel = Number(sheet.system.details.level) || 1;
	allPokemonMoves.forEach(pokemonMove => {
		pokemonModuleLog(`Trying to Update "${pokemonMove.name}"`);

		const unidentifiedDescription = pokemonMove.system.unidentified.description;
		const scaleHtmlData = getScaleDataFromText(unidentifiedDescription);
		logUnidentifiedDescription(pokemonMove.name, unidentifiedDescription);

		// Validation: Scaling Data
		if (!scaleHtmlData) {
			ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid scaling data.`, { console: true });
			return;
		}

		// No Scaling, No STAB
		if (scaleHtmlData === IIDS.NO_SCALE) {
			ui.notifications.info(`✅ The pokémon move "${pokemonMove.name}" does not scale nor use stab.`, { console: true });
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

		// Weapon Type (Without Ability Definition) Validation
		if ( rollFormula.includes("@mod") && ( !(weaponType === IIDS.DMG_ATK) && !(weaponType === IIDS.DMG_SAVE) ) ) {
			const pokemonMoveAbility = pokemonMove.system.activities.find(a => a.type === "cast")?.spell?.ability;

			if (!pokemonMoveAbility) {
				ui.notifications.warn(`❌ The pokémon move "${pokemonMove.name}" does not have a valid cast activity.`, { console: true });
				console.log(`"${pokemonMove.name}" all activities:`);
				console.log(pokemonMove.system.activities);
				return;
			}

			const pokemonMoveAbilityScore = pokemonMove.parent.system.abilities[pokemonMoveAbility]?.value;

			if (!pokemonMoveAbilityScore) {
				ui.notifications.warn(`❌ The "${weaponType}" pokémon move "${pokemonMove.name}" does not have a valid ability defined in the cast activity.`, { console: true });
				console.log(`"${pokemonMove.name}" ability to cast defined: ${pokemonMoveAbility}`);
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
		if (rawScale.length !== 4 || !rawScale[0]) {
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

		console.log(`"${pokemonMove.name}" pokémon move scaling found:`);
		console.log(moveScaling);
		console.log(`Current Level: ${sheetLevel}, Corresponding Move Level: ${correspondingLevel},\nCurrent Value: "${currentValue}", Corresponding Value: "${correspondingFinalValue}"\nCast Ability Score: "${castDefinedAbilityScore}"`);

		if (correspondingFinalValue === currentValue) {
			ui.notifications.info(`✅ The pokémon move "${pokemonMove.name}" already has the correct scaling and stab for its current level.`, { console: true });
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

			const moveUpdate = {};
			moveUpdate[scalingPath] = valueToUpdate;
			targetActivity.update(moveUpdate);

			ui.notifications.info(`✅ The pokémon move "${pokemonMove.name}" has been updated from "${currentValue}" ——→ "${correspondingFinalValue}" (STAB: +${correspondingStab}).`, { console: true });
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

function getScaleDataFromText(text) {
	/* DATA:
	<div class="pokemon5e no-scale">
		<p id="scale">XdX, XdX, XdX, XdX</p>
		<p id="weapon-type">damage-from-attack</p>
		<p id="roll-formula">@scale + @mod + @stab.type</p>
	</div>
	*/
	const container = document.createElement("div");
	container.innerHTML = text;
	const data = container.firstElementChild;

    if (data && data.tagName === "DIV" && data.classList.contains("pokemon5e")) {
		if (data.classList.contains(IIDS.NO_SCALE)) return IIDS.NO_SCALE;

        const rawScale = data.querySelector('p#scale')?.textContent?.split(",")?.map(x => x.trim());
        const weaponType = data.querySelector('p#weapon-type')?.textContent?.trim();
        const rollFormula = data.querySelector('p#roll-formula')?.textContent?.trim();

		console.log(`·) rawScale: ${rawScale}\n·) weaponType: ${weaponType}\n·) rollFormula: ${rollFormula}`);
        if (rawScale && weaponType && rollFormula) {
            return { rawScale, weaponType, rollFormula };
        }
    }

    return null;
}

function logUnidentifiedDescription(name, unidentifiedDescription) {
	console.log(`"${name}" pokémon move unidentified description:\n${unidentifiedDescription}`);
}

function getCurrentValue(weaponType, pokemonMove, targetActivity) {
	if (weaponType === IIDS.HEALING) return targetActivity.healing.custom.formula;
	if (weaponType === IIDS.DMG_ATK) return targetActivity.damage.parts[0].custom.formula;
	if (weaponType === IIDS.DMG_SAVE) return targetActivity.damage.parts[0].custom.formula;
	if (weaponType === IIDS.SIMPLE_DICE) return targetActivity.roll.formula;
}

function getCorrespondingStab(pokemonMove, currentLevel, stabType) {
	if (!stabType) return 0;
	const correspondingBonus = (currentLevel >= 19) ? 5 : (currentLevel >= 15) ? 4 : (currentLevel >= 11) ? 3 : (currentLevel >= 7) ? 2 : (currentLevel >= 3) ? 1 : 0;
	const pokemonTypes = pokemonMove.parent.items
		.filter(i => i.type === "feat") // Feature Item
		.filter(i => i.system.type.value === "pokemon") // Pokémon Feature
		.filter(i => i.system.type.subtype === "type"); // Pokémon Type Feature

	if (pokemonTypes.length < 1) return 0;
	const hasTheSameType = pokemonTypes.some(pokemonType => pokemonType.system.identifier === `${stabType}-type`);

	if (hasTheSameType) return correspondingBonus;
	else return 0;
}

function calculateModifier(score) { return Math.trunc((score - 10) / 2) };

//* Input Data to Export
export const updateMoves = {
	name: "Update Moves",
	description: "Automatically update the scaling and stab of all pokémon moves on the sheet.",
	htmlElement: updateButton
};

//* HTML Button Shorcut
Hooks.on("renderBaseActorSheet", (app, html, context, options) => {
	pokemonModuleLog("<-- Pokémon 5e Update Move Button Shortcut Rendered on Actor Sheet -->");

	// Place where everything will be rendered: Header Buttons (Short/Long Rest Buttons)
	const headerButtons = html.querySelector(".dnd5e2 .window-content .sheet-header-buttons");

	const shortcutButton = updateButton.cloneNode(true);
	shortcutButton.classList.add("gold-button", "pokemon5e");
	shortcutButton.addEventListener("click", updatePokemonMoves);

	const buttonSeparator = document.createElement("button");
	buttonSeparator.type = "button";
	buttonSeparator.classList.add("gold-button", "pokemon5e", "separator");
	buttonSeparator.style.visibility = "hidden";

	headerButtons.style.gap = "3px";
	headerButtons?.insertAdjacentElement("beforeend", buttonSeparator);
	headerButtons?.insertAdjacentElement("beforeend", shortcutButton);
});