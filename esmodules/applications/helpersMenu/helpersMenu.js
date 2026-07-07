const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { NpcHpFixer } from "./helpers/npcHpFixer/npcHpFixer.js";

export class pk5eHelpersMenu extends HandlebarsApplicationMixin (ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: "pk5e-helpers-menu",
		window: {
			title: "Lista de Helpers de Pokémon 5e",
			icon: "fa-solid fa-screwdriver-wrench"
		},
		position: {
			width: 600,
			height: "auto"
		},
		actions: {
			openNpcHpFixer: pk5eHelpersMenu.#openNpcHpFixer
		}
	};

	static PARTS = {
		content: {
			template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpersMenu.hbs"
		}
	};

	// Aquí se agregan los datos de los helpers para que luego se rendericen automáticamente como botones en el hbs.
	static HELPERS = [
		{
			action: "openPokemonActorsMigrator",
			label: "Migrador de Actores Pokémon",
			icon: "fa-solid fa-user-gear",
			disabled: true
		},
		{
			action: "openMoveItemsMigrator",
			label: "Migrador de Items Movimientos",
			icon: "fa-solid fa-swords",
			disabled: true
		},
		{
			action: "openNpcHpFixer",
			label: "Corrector de Hit Points de NPCs",
			icon: "fa-solid fa-heart-circle-exclamation",
			disabled: false
		}
	];

	async _prepareContext() {
		return {
			helpers: this.constructor.HELPERS
		};
	}

	// Hay que crear un método por cada helper y luego declararlos en actions
	static async #openNpcHpFixer (event, target) {
		new NpcHpFixer().render({ force: true });
		this.close();
	}
}