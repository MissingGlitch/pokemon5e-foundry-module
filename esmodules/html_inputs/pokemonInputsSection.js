import { pokemonModuleLog } from "../utils/logs.js";

//* Inputs Info
import { updateMoves } from "./inputUpdateMoves.js";
import { evolvePokemon } from "./inputEvolvePokemon.js";
import { manageMoves } from "./inputMoveManager.js";
const inputs = [updateMoves, evolvePokemon, manageMoves];

//* HTML Pokémon Section
Hooks.on("renderBaseActorSheet", (app, html, context, options) => {
	pokemonModuleLog("<-- Pokémon 5e Inputs Section Rendered on Actor Sheet -->");

	// Place where everything will be rendered: Special Traits Tab
	const specialTraitsTab = html.querySelector(".dnd5e2 .window-content .tab-body [data-tab=\"specialTraits\"]");

	// Pokémon Section Creation
	const pokemonSection = document.createElement("fieldset");
	pokemonSection.classList.add("card", "pokemon5e");
	const sectionTitle = document.createElement("legend");
	sectionTitle.textContent = "Pokémon";
	pokemonSection.appendChild(sectionTitle);

	// Inputs Creation: Update Moves, Evolve
	inputs.forEach(input => {
		const inputSubsection = document.createElement("div");
		inputSubsection.classList.add("form-group");
		pokemonSection.appendChild(inputSubsection);

		// Title
		const inputTitle = document.createElement("label");
		inputTitle.textContent = input.name;
		inputSubsection.appendChild(inputTitle);

		// The Raw Input Itself
		const rawInputContainer = document.createElement("div");
		rawInputContainer.classList.add("form-fields");
		rawInputContainer.appendChild(input.htmlElement);
		inputSubsection.appendChild(rawInputContainer);
		if (input.formFieldsStyles) rawInputContainer.setAttribute("style", input.formFieldsStyles);

		// Description
		const description = document.createElement("p");
		description.classList.add("hint");
		description.textContent = input.description;
		inputSubsection.appendChild(description);
	});

	// pokemonSection.addEventListener("click", updatePokemonMoves);
	specialTraitsTab?.insertAdjacentElement("afterbegin", pokemonSection);
});