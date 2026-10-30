// Registers hooks that run while Foundry VTT initializes the module.
// This module currently has no init-only registrations.

/**
 * Registers hooks that run while Foundry VTT initializes the module.
 *
 * @returns {void}
 */
function registerInitHooks() {
	console.log(`pokemon5e | hooks/init.js (Registering init hooks)`);

	Hooks.once('init', () => {
		// Register init-only module systems here.
	});
}

export { registerInitHooks };
