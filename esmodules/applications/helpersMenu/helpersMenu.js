const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { NpcHpFixer } from "./helpers/npcHpFixer/npcHpFixer.js";

export class pk5eHelpersMenu extends HandlebarsApplicationMixin(ApplicationV2) {
	/**
	 * Default configuration options for the application.
	 * Defines the application's unique ID, window appearance, initial position,
	 * and the set of available actions.
	 * @type {ApplicationConfiguration}
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		id: "pk5e-helpers-menu",

		/**
		 * Configures the application window rendered by ApplicationV2.
		 */
		window: {
			title: "Pokémon 5e Helpers List",
			icon: "fa-solid fa-screwdriver-wrench"
		},

		/**
		 * Sets the initial size and position of the application window in pixels.
		 */
		position: {
			width: 600,
			height: "auto"
		},

		/**
		 * Maps data-action attribute values to their handler functions.
		 * ApplicationV2 automatically listens for clicks on any element with data-action="key"
		 * inside the app and calls the corresponding handler. No manual addEventListener needed.
		 */
		actions: {
			openNpcHpFixer: pk5eHelpersMenu.#openNpcHpFixer		// Open the NPC HP Fixer helper application
		}
	};

	/**
	 * Template parts that compose the application's rendered HTML.
	 * Each part maps to a Handlebars template file rendered independently,
	 * allowing selective re-rendering of specific sections without rebuilding the entire application.
	 * @type {Record<string, HandlebarsTemplatePart>}
	 * @override
	 */
	static PARTS = {
		// Main content with the list of available helper buttons
		content: {
			template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpersMenu.hbs"
		}
	};

	/**
	 * Static list of helper tool definitions rendered as buttons in the application template.
	 * Each entry describes a helper's action identifier, display label, icon, and enabled state.
	 * New helpers should be added here to be automatically rendered in the UI.
	 * @type {Array<{action: string, label: string, icon: string, disabled: boolean}>}
	 */
	static HELPERS = [
		{
			action: "openPokemonActorsMigrator",
			label: "Pokémon Actors Migrator",
			icon: "fa-solid fa-user-gear",
			disabled: true
		},
		{
			action: "openMoveItemsMigrator",
			label: "Move Items Migrator",
			icon: "fa-solid fa-swords",
			disabled: true
		},
		{
			action: "openNpcHpFixer",
			label: "NPC Hit Points Fixer",
			icon: "fa-solid fa-heart-circle-exclamation",
			disabled: false
		}
	];

	/**
	 * Prepares the data context passed to the Handlebars templates during rendering.
	 * Exposes the static HELPERS list so the template can iterate over it and render each helper as a button.
	 * @returns {Promise<object>} The context object containing the helpers array.
	 * @override
	 */
	async _prepareContext() {
		return {
			helpers: this.constructor.HELPERS
		};
	}

	//* DEFAULT_OPTIONS Handlers
	/**
	 * Action handler that opens the NPC HP Fixer helper application and closes this menu.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action attribute.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #openNpcHpFixer(event, target) {
		new NpcHpFixer().render({ force: true });
		this.close();
	}
}