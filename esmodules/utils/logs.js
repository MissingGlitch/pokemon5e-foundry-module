/**
 * Logs a styled message to the console for the Pokémon module.
 * If additional data is provided, it is displayed inside a collapsible console group.
 * @param {string}  text    - The message to display in the console.
 * @param {...*}    [data]  - Optional additional values to log inside a collapsible group.
 */
export function pk5eLog(text, ...data) {
    if (!game.settings.get("pokemon5e", "enableDebugLogs")) return;
    const style = `background-color: black; color: #ffcc01`;

    if (data.length === 0) {
        console.log(`%c${text}`, style);
        return;
    }

    console.groupCollapsed(`%c${text}`, style);
    data.forEach(item => console.log(item));
    console.groupEnd();
}