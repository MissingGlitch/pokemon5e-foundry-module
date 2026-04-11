import { pokemonModuleLog } from "../utils/logs.js";

//* Inputs Info
import { updateMoves } from "./inputUpdateMoves.js";
import { evolvePokemon } from "./inputEvolvePokemon.js";
import { manageMoves } from "./inputMoveManager.js";
const inputs = [updateMoves, evolvePokemon, manageMoves];
// Podríamos reescribir esto para que en vez de solo traer los botones, traigamos las funciones que usan y crear los botones aquí.
// De esa forma los demás archivos no tendrían la palabra input y se podría renombrar la carpeta a Automatizaciones, y sacar este archivo fuera que solo contenga los botones (y todo lo relacionado con la renderización de los mismos).

//* HTML Pokémon Section
Hooks.on("renderBaseActorSheet", (app, html, context, options) => {
	pokemonModuleLog("pk5e (renders): Inputs Section");

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