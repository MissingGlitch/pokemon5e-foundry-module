/**
 * Logs a styled message to the console for the Pokémon module.
 *
 * @param {string} text - The message to display in the console.
 */
export function pk5eLog(text) {
	const enableDebugLogs = game.settings.get("pokemon5e", "enableDebugLogs");
	if (!enableDebugLogs) return;

	const pokemonYellowColor = "#ffcc01";
	const fancyStyle = `background-color: black; color: ${pokemonYellowColor}`;
	console.log(`%c${text}`, fancyStyle);
}