const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { TextEditor, DragDrop } = foundry.applications.ux;
import { pk5eLog } from "../../../../utils/logs.js";

export class NpcHpFixer extends HandlebarsApplicationMixin (ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: "pk5e-npc-hp-fixer",
		window: {
			title: "NPC HP Fixer",
			icon: "fa-solid fa-heart-circle-exclamation",
			contentTag: "form"
		},
		position: {
			width: 900,
			height: 550,
			top: 100
		},
		form: {
			handler: NpcHpFixer.#handleSubmit, // Esto es lo que va a manejar el envío del formulario
			closeOnSubmit: false // No se cerrará porque luego de enviar se mostrará un dialog de confirmación
		},
		actions: {
			cancel: NpcHpFixer.#onCancel, // Cerrar
			selectTab: NpcHpFixer.#selectTab, // Seleccionar alguna de las 3 pestañas: Drop, Actors o Compendiums
			moveToIntroView: NpcHpFixer.#moveToIntroView, // Volver a la vista inicial de intro
			moveToActorsSelectionView: NpcHpFixer.#moveToActorsSelectionView // Ir a la vista de selección de actores (con drop, actors y compendiums)
		}
	};

	static PARTS = {
		// Header con las pestañas
		header: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.header.hbs" },
		// Content con la información y opciones para cada pestaña
		content: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.content.hbs" },
		// Footer con el botón de submit y el resumen expandible
		footer: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.footer.hbs" }
	};

	// De momento solo hay 2 vistas, pero seguramente pasen a 3 o 4 al final.
	// Intro: Vista inicial con explicación y botón para ir a la selección de actores
	// Actors Selection: Vista con las opciones para seleccionar los actores a corregir (drop, actors o compendiums)
	// Cargando: Vista con un spinner mientras se aplican los cambios
	// Resultados: Vista final con el resultado de la corrección (éxito o error)
	#VIEWS = {
		INTRO: Symbol("NPC HP Fixer View ID"),
		ACTORS_SELECTION: Symbol("NPC HP Fixer View ID")
	};

	// Las tabs son las opciones dentro de la vista de selección de actores,
	// para elegir la fuente desde donde seleccionar los actores a corregir: drop, actors o compendiums
	#TABS = {
		DROP: "drop",
		ACTORS: "actors",
		COMPENDIUMS: "compendiums"
	}

	#currentTab = this.#TABS.DROP;

	#currentView = this.#VIEWS.INTRO;

	// Propiedad donde se guardarán todos los actores elegidos.
	#selectedActors = [];

	#isLoading = false;

	/**
	 * Prepares the context for the Handlebars, providing variables that can be used inside the templates.
	 * @returns {Promise<Object>} The context object for the template.
	 */
	async _prepareContext() {
		return {
			views: {
				intro: { active: this.#currentView === this.#VIEWS.INTRO },
				actorsSelection: { active: this.#currentView === this.#VIEWS.ACTORS_SELECTION }
			},
			tabs: {
				drop: { active: this.#currentTab === this.#TABS.DROP },
				actors: { active: this.#currentTab === this.#TABS.ACTORS },
				compendiums: { active: this.#currentTab === this.#TABS.COMPENDIUMS }
			},
			selectedActors: this.#selectedActors,
			isLoading: this.#isLoading
		};
	}

	static async #moveToIntroView (event, target) {
		this.#currentView = this.#VIEWS.INTRO;
		this.render();
	}

	static async #moveToActorsSelectionView (event, target) {
		this.#currentView = this.#VIEWS.ACTORS_SELECTION;
		this.render();
	}

	static async #selectTab (event, target) {
		const selectedTab = target.dataset.tab;
		if ( !selectedTab ) return;
		this.#currentTab = selectedTab;
		this.render();
	}

	/**
	 * Toggles the loading state of the app, blocking or unblocking interaction and re-rendering to show or hide the spinner.
	 * @param {boolean} isLoading - True to show the spinner and block interaction, false to hide it and unblock.
	 */
	async #toggleLoading (isLoading) {
		pk5eLog(`pk5e (npc hp fixer): loading state <${isLoading}>`);
		this.#isLoading = isLoading;
		this.element.inert = isLoading;
		await this.render();
	}

	/**
	 * Animates the counter to indicate that new actors have been added.
	 * Uses double requestAnimationFrame to ensure the browser has fully processed
	 * the inert=false state change before starting the animation.
	 */
	#animateCounter() {
		// It has a double requestAnimationFrame to ensure that the animation runs after the DOM has been updated and the
		// inert state has been removed, which can interfere with animations if not handled properly.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const counterNumber = this.element.querySelector(".current-counter-container .number");
				counterNumber?.animate(
					[
						{ backgroundColor: "#333", transform: "scale(1)", boxShadow: "0 0 0px rgba(255, 255, 255, 0)" },
						{ backgroundColor: "#c9593f", transform: "scale(1.3)", boxShadow: "0 0 15px #c9593f", filter: "brightness(1.5)", offset: 0.5 },
						{ backgroundColor: "#333", transform: "scale(1)", boxShadow: "0 0 0px rgba(255, 255, 255, 0)" }
					],
					{ duration: 800, easing: "ease-out" }
				);
			});
		});
	}

	// ! Handle Submit
	// Esto todavía no lo hemos hecho, está pendiente
	static async #handleSubmit (event, form, formData) {
		// Lo que está acá dentro es código genérico de prueba para mostrar cómo se puede manejar el submit del formulario,
		// recolectar los datos y mostrar un resumen antes de ejecutar la lógica real de corrección de HP.

		// // Primero debemos recolectar toda la info de las opciones seleccionadas, y mostrar un resumen al usuario con un
		// // dialog de confirmación. En caso de que confirme, mostrar un spiner de carga, y cuando todo termine, mostrar un ¡éxito!

		// // formData.object contiene los valores del formulario
		// console.log("Datos del fixer:", formData.object);
		// // lógica de arreglo de HP aquí

		// const data = formData.object;

		// // Construye el HTML del resumen
		// const summaryHtml = `
		// 	<h4>¿Confirmas que quieres aplicar los siguientes cambios?</h4>
		// 	<p>Esto es solo de ejemplo</p>
		// `;

		// // Muestra el diálogo de confirmación
		// const confirmed = await foundry.applications.api.DialogV2.confirm({
		// 	window: { title: "Confirmar cambios" },
		// 	content: summaryHtml,
		// 	rejectClose: false // si el usuario cierra sin confirmar, retorna false en vez de lanzar error
		// });

		// if (!confirmed) return; // el usuario canceló, NpcHpFixer sigue abierto

		// // El usuario confirmó → ejecuta la lógica real
		// console.log("Aplicando cambios:", data);
		// // ... tu lógica aquí ...

		// // Cierra el NpcHpFixer manualmente
		// // await this.close();
	}

	static async #onCancel (event, target) {
		this.close();
	}

	/**
	 * Indicates if debug logs can be shown based on the module settings.
	 * @returns {boolean} True if debug logs can be shown, false otherwise.
	 */
	#canDebugLogsBeShown () {
		const canDebugLogsBeShown = game.settings.get("pokemon5e", "enableDebugLogs");
		return canDebugLogsBeShown;
	}

	/**
	 * Indicates if the app is in the view and tab where elements can be dropped.
	 * @returns {boolean} True if the app is in the correct view and tab, false otherwise.
	 */
	_canBeDroppedHere () {
		return (this.#currentView === this.#VIEWS.ACTORS_SELECTION) && (this.#currentTab === this.#TABS.DROP);
	}

	/**
	 * Returns the "readable name" of the source of a compendium (world, system, or module).
	 * @param {Pack} compendium - The compendium from which to obtain the source name.
	 * @returns {string} The readable name of the source.
	 */
	#getSourceName (compendium) {
		const { packageType, packageName } = compendium.metadata;
		if (packageType === "world") return "World" // game.world.title;
		if (packageType === "system") return "D&D5e" // game.system.title;
		if (packageType === "module") return game.modules.get(packageName)?.title ?? packageName;
	}

	/**
	 * Builds the root path for a compendium with its source: "Compendiums Tab / [Source] Label".
	 * @param {Pack} compendium - The compendium for which to build the root path.
	 * @returns {string} The root path of the compendium.
	 */
	#buildCompendiumRootPath (compendium) {
		return `Compendiums Tab / [${this.#getSourceName(compendium)}] ${compendium.metadata.label}`;
	}

	/**
	 * Recursively builds the full path of a folder, including its parent folders (and compendium if applicable).
	 * The path is built in the format "Compendiums (or Actors) Tab / [Source] Compendium Label (if applicable) / Parent Folder / Subfolder".
	 * @param {Folder} folder - The folder for which to build the path.
	 * @returns {string} The full path of the folder.
	 */
	#buildFolderPath (folder) {
		// Recursion:
		// if the folder has a parent folder, build the path of the parent first, then add the current folder name at the end.
		if (folder.folder) {
			const parentPath = this.#buildFolderPath(folder.folder);
			return `${parentPath} / ${folder.name}`;
		}

		// Recursion End 1:
		// if the folder doesn't have a parent, check if it's in a compendium (has pack property).
		// If it's in a compendium, the root of the path is the compendium name.
		if (folder.pack) {
			const compendium = game.packs.get(folder.pack);
			return `${this.#buildCompendiumRootPath(compendium)} / ${folder.name}`;
		}

		// Recursion End 2:
		// if the folder doesn't have a parent and is not in a compendium,
		// it's a folder in the Actors tab, so the root of the path is "Actors Tab".
		else {
			return `Actors Tab / ${folder.name}`;
		}
	}

	/**
	 * Recursively collects all documents in a folder and its subfolders, building their container paths.
	 * The folder can be from the sidebar or from a compendium. But it cannot be a folder that contains compendiums, that is handled with another method: #collectFolderWithCompendiumsEntries.
	 * @param {Folder} currentFolder - The folder for which to collect entries.
	 * @param {Array} entries - The array to which to add the collected entries.
	 * @param {Array|null} allCompendiumDocs - Pre-loaded documents from the compendium.
	 * @param {Array|null} allCompendiumFolders - Pre-loaded folders from the compendium.
	 */
	#collectFolderEntries (currentFolder, entries, allCompendiumDocs = null, allCompendiumFolders = null) {
		const folderPath = this.#buildFolderPath(currentFolder);
		const isFromCompendium = Boolean(currentFolder.pack);

		if (isFromCompendium) {
			// Documents in this compendium folder (not in subfolders)
			const folderDocs = allCompendiumDocs.filter(doc => doc.folder?.id === currentFolder.id);
			entries.push(...folderDocs.map(item => ({
				name: item.name,
				uuid: item.uuid,
				containerPath: folderPath,
				doc: item
			})));

			// Subfolders under this folder in the compendium (Recursive call for each subfolder)
			const subfolders = allCompendiumFolders.filter(f => f.folder?.id === currentFolder.id);
			for (const subfolder of subfolders) this.#collectFolderEntries(subfolder, entries, allCompendiumDocs, allCompendiumFolders);

		} else {
			// Documents in the sidebar folder (not in subfolders)
			entries.push(...currentFolder.contents.map(item => ({
				name: item.name,
				uuid: item.uuid,
				containerPath: folderPath,
				data: item
			})));

			// Subfolders under this folder in the sidebar (Recursive call for each subfolder)
			for (const child of currentFolder.children) this.#collectFolderEntries(child.folder, entries);
		}
	}

	/**
	 * Collects all documents from a compendium, including those in folders and subfolders, building their container paths.
	 * @param {Pack} compendium - The compendium from which to collect entries.
	 * @param {Array} entries - The array to which to add the collected entries.
	 */
	async #collectCompendiumEntries (compendium, entries) {
		const allCompendiumFolders = compendium.folders;
		const allCompendiumDocs = await compendium.getDocuments();
		const compendiumRootPath = this.#buildCompendiumRootPath(compendium);

		// Documents directly under the compendium, not in any folder
		const rootDocs = allCompendiumDocs.filter(doc => doc.folder === null);
		entries.push(...rootDocs.map(item => ({
			name: item.name,
			uuid: item.uuid,
			containerPath: compendiumRootPath,
			data: item
		})));

		// Root folders in the compendium (those that don't have a parent folder) and recursive collection of their entries
		const rootFolders = allCompendiumFolders.filter(f => f.folder === null);
		for (const folder of rootFolders) this.#collectFolderEntries(folder, entries, allCompendiumDocs, allCompendiumFolders);
	}

	/**
	 * Recursively collects all entries from a folder with compendiums.
	 * @param {*} folder - The folder with compendiums from which to collect entries.
	 * @param {*} entries - The array to which to add the collected entries.
	 */
	async #collectFolderWithCompendiumsEntries (folder, entries) {
		// Compendiums directly under this folder
		const compendiumsInFolder = game.packs.filter(p => p.folder?.id === folder.id);
		for (const compendium of compendiumsInFolder) await this.#collectCompendiumEntries(compendium, entries);

		// Subfolders under this folder (Recursive call for each subfolder)
		for (const child of folder.children) await this.#collectFolderWithCompendiumsEntries(child.folder, entries);
	}


	/**
	 * Validates that a document is an Actor of type NPC with at least one class item whose name contains "Level".
	 * @param {foundry.abstract.Document} entryData - The document data to validate.
	 * @returns {boolean} True if the document is a valid NPC Actor, false otherwise.
	 */
	#isValidEntry (entryData) {
		// 1. Must be an Actor document
		if ( !(entryData instanceof Actor) ) return false;

		// 2. Must be of type "npc"
		if (entryData.type !== "npc") return false;

		// 3. Must have at least one class item with "Level" in its name
		if ( !entryData.items.some(item => item.type === "class" && item.name.includes("Level")) ) return false;

		return true;
	}

	/**
	 * Processes the collected entries, separating them into valid entries to add, duplicates, and invalid types, then adds the valid entries to the selected actors and shows notifications for each case.
	 * @param {Array} entries - The array of entries to process.
	 * @returns {number} The number of valid entries that were added.
	 */
	#processAndAddEntries (entries) {
		const duplicates = [];
		const invalidType = [];
		const toAdd = [];

		for (const entry of entries) {
			// Duplicates
			if (this.#selectedActors.some(actor => actor.uuid === entry.uuid)) {
				duplicates.push(entry);
				continue;
			}

			// Invalid Type
			if ( !this.#isValidEntry(entry.data) ) {
				invalidType.push(entry);
				continue;
			}

			// Valid
			toAdd.push(entry);
		}

		this.#selectedActors.push(...toAdd);

		// Notifications
		if (duplicates.length > 0) {
			ui.notifications.warn(`Se han encontrado ${duplicates.length} entradas duplicadas que no han sido agregadas.`);
		}

		if (invalidType.length > 0) {
			ui.notifications.warn(`Se han encontrado ${invalidType.length} entradas que no son Pokémon NPC, así que no han sido agregados.`);
		}

		if (toAdd.length > 0) {
			ui.notifications.info(`Se han agregado ${toAdd.length} entradas nuevas.`);
		}

		return toAdd.length;
	}

	/**
	 * Handles the drop event on the drop zone, processing the dropped data to collect valid Document entries and add them to the selected documents.
	 * Supports dropping Docs, Folders (with or without compendiums), and Compendiums.
	 * @param {DragEvent} event - The drag event triggered on drop.
	 */
	async _handleDrop (event) {
		let entries = [];
		let addedCount = 0;
		const data = TextEditor.implementation.getDragEventData(event);

		// Debug Logs
		if (this.#canDebugLogsBeShown()) {
			pk5eLog("pk5e (npc hp fixer): Dropped Data");
			console.log(data);
		}

		// Loading State ON
		await this.#toggleLoading(true);

		try {
			// * Folder Dropped
			if (data.type === "Folder") {
				const folder = await fromUuid(data.uuid);

				// Case A: A folder that contains compendiums
				if (folder.type === "Compendium") {
					await this.#collectFolderWithCompendiumsEntries(folder, entries);

				// Case B: A folder that contains docs and subfolders, but no compendiums
				// Can be from the sidebar or from a compendium, the method will handle both cases
				} else {
					const isFromCompendium = Boolean(folder.pack);

					// When the folder is from a compendium, we need to pre-load all the documents and folders
					// from that compendium to be able to build the paths of the entries correctly.
					let allCompendiumDocs, allCompendiumFolders;
					if (isFromCompendium) {
						const compendium = game.packs.get(folder.pack);
						allCompendiumFolders = compendium.folders;
						allCompendiumDocs = await compendium.getDocuments();
					}

					// Same function for both cases (sidebar and compendium)
					this.#collectFolderEntries(folder, entries, allCompendiumDocs ?? null, allCompendiumFolders ?? null);
				}
			}

			// * Compendium Dropped
			else if (data.type === "Compendium") {
				const compendium = game.packs.get(data.collection);
				await this.#collectCompendiumEntries(compendium, entries);
			}

			// * Actor Dropped
			else if (data.type === "Actor") {
				let containerPath;
				const actor = await fromUuid(data.uuid);
				const isFromCompendium = Boolean(actor.pack);

				// Case A: Actor from a compendium
				if (isFromCompendium) {
					const compendium = game.packs.get(actor.pack);
					containerPath = actor.folder ? this.#buildFolderPath(actor.folder) : this.#buildCompendiumRootPath(compendium);

				// Case B: Actor from the sidebar
				} else {
					containerPath = actor.folder ? this.#buildFolderPath(actor.folder) : "Actors Tab";
				}

				entries.push({
					name: actor.name,
					uuid: actor.uuid,
					containerPath,
					data: actor
				});
			}

			// * Other Type Dropped
			else {
				ui.notifications.warn(`El tipo de documento "${data.type}" no es válido. Solo se pueden agregar actores o carpetas y compendios que contengan actores.`);
			}

			console.log(entries);
			addedCount = this.#processAndAddEntries(entries);

		} catch (error) {
			ui.notifications.error("Ocurrió un error al procesar el drop. Revisa la consola para más detalles.");
			console.error("Error processing drop:", error);

		} finally {
			// Loading State OFF
			await this.#toggleLoading(false);
			if (addedCount > 0) this.#animateCounter();
		}
	}

	/**
	 * Called when the application is rendered.
	 * Currently used to set up drag and drop event listeners on the drop zone, allowing actors, folders, and compendiums to be dragged and dropped into the app for selection.
	 * @param {Object} context - The rendering context.
	 * @param {Object} options - Additional options for rendering.
	 */
	_onRender(context, options) {
		super._onRender(context, options);

		//* Drag and Drop hightlighting
		const dropZone = this.element.querySelector(".drop-zone");
		if ( !dropZone || !this._canBeDroppedHere() ) return;

			// Drag Over
			dropZone.addEventListener("dragover", (event) => {
				event.preventDefault();
				dropZone.classList.add("highlight");
			});

			// Drag Leave
			dropZone.addEventListener("dragleave", (event) => {
				// Evitar que se quite la clase al pasar sobre un hijo del drop-zone
				if ( dropZone.contains(event.relatedTarget) ) return;
				dropZone.classList.remove("highlight");
			});

			// Drop
			dropZone.addEventListener("drop", (event) => {
				dropZone.classList.remove("highlight");
			});

		//* Set Drag and Drop Handler
		new DragDrop({
			dropSelector: ".drop-zone",
			callbacks: { drop: this._handleDrop.bind(this) }
		}).bind(this.element);
	}
}