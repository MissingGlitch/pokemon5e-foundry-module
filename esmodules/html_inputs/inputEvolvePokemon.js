import { pokemonModuleLog } from "../utils/logs.js";
const rickrollLink = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

//* HTML RickRoll Button Creation
const evolutionButton = document.createElement("button");
evolutionButton.type = "button";
const evolutionButtonName = "Evolve Pokémon";
evolutionButton.setAttribute("aria-label", evolutionButtonName);
evolutionButton.setAttribute("data-tooltip", evolutionButtonName);
const evolutionButtonIcon = document.createElement("i");
evolutionButtonIcon.classList.add("fas", "fa-dna");
evolutionButton.appendChild(evolutionButtonIcon);

// Cositas para el Rickroll
evolutionButton.setAttribute("data-tooltip", "NOT IMPLEMENTED YET (DONT PRESS!)");
const link = document.createElement("a")
link.setAttribute("href", rickrollLink);
link.setAttribute("target", "_blank");
link.appendChild(evolutionButton);
// const container = document.createElement("p");
// container.appendChild(link);

//* Input Data to Export
export const evolvePokemon = {
	name: "Evolve Pokémon:\nNOT IMPLEMENTED YET (DONT PRESS!)",
	description: "Evolve the Pokémon to its next stage if the minimum requirements are met.",
	htmlElement: link,
	formFieldsStyles: "max-width:fit-content"
};