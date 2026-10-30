// Registers hooks that run after Foundry VTT has loaded the module translations.
// The i18n hook registers settings whose values depend on the active language.

import { registerModuleSettings } from '../config/settings.js';

/**
 * Registers hooks that run after Foundry VTT has loaded the module translations.
 *
 * @returns {void}
 */
function registerI18nHooks() {
	console.log(`pokemon5e | hooks/i18n.js (Registering i18n hooks)`);

	Hooks.once('i18nInit', () => {
		registerModuleSettings();
	});
}

export { registerI18nHooks };
