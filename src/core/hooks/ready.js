// Registers hooks that run once Foundry VTT has finished loading the module.
// Ready hooks are used for setup that depends on the initialized game environment.

import { MODULE_ID } from '../config/constants.js';

/**
 * Registers hooks that run after Foundry VTT has finished initializing the module.
 *
 * @returns {void}
 */
function registerReadyHooks() {
	console.log(`${MODULE_ID} | hooks/ready.js (Registering ready hooks)`);

	Hooks.once('ready', () => {
		// console.log(` | ready`);
	});
}

export { registerReadyHooks };
