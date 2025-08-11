/**
 * Logs a styled message to the console for the Pokémon module.
 *
 * @param {string} text - The message to display in the console.
 */
export function pokemonModuleLog(text) {
	const pokemonYellowColor = "#ffcc01";
	const fancyStyle = `font-size: 15px; background-color: black; color: ${pokemonYellowColor}`;
	console.log(`%c${text}`, fancyStyle);
}