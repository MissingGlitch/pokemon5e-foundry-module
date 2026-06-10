// todo: pasar con la tab de compendios.
// Tras la tab de compendios, faltaría implementar que al tú soltar pokémon en la tab de soltar, automáticamente identifique qué actores son y se marquen en sus respectivas casillas de las tabs de actors y compendios.
// Luego también implementar el footer, y luego el botón de submit, por supuesto.

// ? para cuando se saque la update, también se hizo una pequeña corrección en el autoUpdateMoves y en el kriketot (no sé si se escribe así).
// todo: Cuando se marca la casilla de una carpeta, a diferencia de cuando se marca la casilla de un actor, si se tenían desplegados los actores inválidos, éstos se vuelven a ocultar porque se renderiza toda la app desde el principio (quizás haya que guardar un estado para el desplegado de esa zona o quizás intentar hacer que al marcar la casilla de las carpetas funcione como la de los actores)
// todo: No se puede abrir el move manager desde una ficha del compendio (lo cual tiene sentido). Hay que hacer una alerta que indique que la razón es esa: Que no se puede abrir el move manager desde una ficha de compendio, tiene que ser una ficha de un actor del mundo, no del compendio.
// TODO: Lista de mejoras para la Tab de Actors (Explorador de Archivos):
// 1. Agregar una ventanita hover (no un tooltip) a las carpetas que indiquen cuántos elementos tiene dentro: Cuántos son carpetas, cuántos son actores válidos y cuántos son actores inválidos
// TODO: La checkbox de los actores, al marcarla, no está centrada como la de las carpetas.
// Quizás en chrome difiera, pero ahora mismo en firefox es cierto que no se ven del todo centradas, lo mismo con los candados de los actores no válidos. Están ligeramente más hacia abajo. Y la de los actores ligeramente más hacia arriba en vez de centradas.
// no no, por lo visto es que solo sucede con aquellos items de la segunda fila en adelante, si una carpeta está en la segunda fila, su checkbox marcada también está ligeramente descentrada como la de los actores.
// Esto es algo bastante menor así que lo dejaré para otro momento, no lo voy a corregir ahora mismo.

// todo: Documentar lo que falta y luego traducir todo a inglés antes de subirlo
// todo: Ver si podemos hacer JSDocs para las propiedades privadas de la clase para saber qué son con solo pasar el mouse por encima como con las funciones

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { TextEditor, DragDrop } = foundry.applications.ux;
import { pk5eLog } from "../../../../utils/logs.js";

export class NpcHpFixer extends HandlebarsApplicationMixin (ApplicationV2) {
	constructor (options = {}) {
		super(options);

		// Registro del Hook que usamos para eliminar el loading spinner de los actor item cuando foundry renderice la ficha
		this.#renderedActorHookIdForRemoveSpinner = Hooks.on("renderBaseActorSheet", (sheet) => {
			const uuid = sheet.actor.uuid;
			if (this.#loadingActorsOnExplorer.has(uuid)) {
				this.#loadingActorsOnExplorer.get(uuid).classList.remove("loading");
				this.#loadingActorsOnExplorer.delete(uuid);
			}
		});

		// ? Info: Cuando se hace clic sobre un actor item en el explorador de archivos de la app, se abre su ficha,
		// ? sin embargo ese proceso puede tardar; no es inmediato, así que mientras la ficha carga, se muestra un spinner 🌀.
		// ? En cuanto foundry termina de cargar la ficha y la renderiza, se debe eliminar ese spinner del explorador: Para eso es la función de arriba.
		// ? Cuando se dispara el hook de que se renderizó una ficha, se verifica si la ficha renderizó foundry es una de las fichas que
		// ? estaban en "espera a ser renderizadas" de nuestro explorador (que guardamos dentro de la variable #loadingActorsOnExplorer).
		// ? En caso de que sí, la ubicamos y eliminamos su spinner ✨. De esta forma al cerrar la ficha en el explorador ya no está el spinner.
	}

	// todo: Explicación de qué son las DEFAULT_OPTIONS
	static DEFAULT_OPTIONS = {
		id: "pk5e-npc-hp-fixer",
		window: {
			title: "NPC HP Fixer",
			icon: "fa-solid fa-heart-circle-exclamation",
			contentTag: "form"
		},
		position: {
			width: 1200,
			height: 600,
			top: 100
		},
		form: {
			handler: NpcHpFixer.#handleSubmit, // todo: Esto es lo que va a manejar el envío del formulario
			closeOnSubmit: false // No se cerrará porque luego de enviar se mostrará un dialog de confirmación
		},
		actions: {
			cancel: NpcHpFixer.#onCancel, 										// Cerrar
			selectTab: NpcHpFixer.#selectTab, 									// Seleccionar alguna de las 3 pestañas: Drop, Actors o Compendiums
			moveToIntroView: NpcHpFixer.#moveToIntroView, 						// Volver a la vista inicial de intro
			moveToActorsSelectionView: NpcHpFixer.#moveToActorsSelectionView 	// Ir a la vista de selección de actores (con drop, actors y compendiums)
		}
	};

	// todo: Explicación de qué son las PARTS
	static PARTS = {
		// Header con las pestañas
		header: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.header.hbs" },

		// Content con la información y opciones para cada pestaña
		content: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.content.hbs" },

		// Footer con el botón de submit y el resumen expandible
		footer: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.footer.hbs" }
	};

	// todo: Explicación de qué son las VIEWS
	#VIEWS = {
		// De momento solo hay 2 vistas, pero seguramente pasen a 3 o 4 al final.
		INTRO: Symbol("NPC HP Fixer View ID"),				// Intro: 				Vista inicial con explicación y botón para ir a la selección de actores
		ACTORS_SELECTION: Symbol("NPC HP Fixer View ID"),	// Actors Selection: 	Vista con las opciones para seleccionar los actores a corregir (drop, actors o compendiums)
		// LOADING: Symbol("NPC HP Fixer View ID"),			// todo: Loading: 		Vista con un spinner mientras se aplican los cambios
		// RESULTS: Symbol("NPC HP Fixer View ID")			// todo: Results: 		Vista final con el resultado de la corrección (éxito o error)
	};

	// Las tabs son las opciones dentro de la vista de selección de actores,
	// para elegir la fuente desde donde seleccionar los actores a corregir: drop, actors o compendiums
	#TABS = {
		DROP: "drop",				// Drop:		// todo: Explicación de la tab
		ACTORS: "actors",			// Actors:		// todo: Explicación de la tab
		COMPENDIUMS: "compendiums" 	// Compendiums:	// todo: Explicación de la tab
	}

	// todo: Explicación de la propiedad
	#selectedActors = [];

	// La View y La Tab que se están mostrando ahora mismo.
	// La inicialización definida son las que se mostrarán al inicio.
	// ? En este caso para hacer las pruebas se muestra de una vez la View de Actors Selection y la Tab en la que estamos trabajando
	#currentTab = this.#TABS.ACTORS;
	#currentView = this.#VIEWS.ACTORS_SELECTION;

	// todo: Explicación de las propiedades
	#currentLocationOnActorsTab = [];
	#currentLocationOnCompendiumsTab = [];
	// ¿Cómo se guardan las rutas? Se guarda directamente el Objeto Folder de foundry, no un nombre sino el mismo objeto.
		// [] = root,
		// [folderA] = root → folderA,
		// [folderA, folderB] = root → folderA → folderB

	// * Loading States and Values
	#isAppLoading = false; 							// Full App Loading
	#renderedActorHookIdForRemoveSpinner = null; 	// Guarda el id del hook que usamos para remover el spinner de los actores en el explordor de archivos
	#loadingActorsOnExplorer = new Map(); 			// Map que guarda los actores del explorador de archivos (uuid → elemento DOM del actor-item) que están esperando por foundry para que su ficha se renderice

	#searchQuery = ""; // término de búsqueda de la barra para filtrar items del explorador de archivos

	/**
	 * Prepares the context for the Handlebars, providing variables that can be used inside the templates.
	 * @returns {Promise<Object>} The context object for the template.
	 */
	async _prepareContext() {
		return {
			selectedActors: this.#selectedActors,
			views: {
				intro: { active: this.#currentView === this.#VIEWS.INTRO },
				actorsSelection: { active: this.#currentView === this.#VIEWS.ACTORS_SELECTION }
			},
			tabs: {
				drop: { active: this.#currentTab === this.#TABS.DROP },
				actors: { active: this.#currentTab === this.#TABS.ACTORS },
				compendiums: { active: this.#currentTab === this.#TABS.COMPENDIUMS }
			},
			actorsTab: (this.#currentTab === this.#TABS.ACTORS)
				? this.#prepareActorsTabContext()
				: null,
			compendiumsTab: (this.#currentTab === this.#TABS.COMPENDIUMS)
				? this.#prepareCompendiumsTabContext()
				: null
		};
	}

	/**
	 * Prepares the context for the Actors tab, building the list of folders and actors
	 * at the current location. Only called when the Actors tab is active.
	 * @returns {Object} The context object for the Actors tab.
	 */
	#prepareActorsTabContext() {
		// Ubicación actual
		const location = this.#currentLocationOnActorsTab.at(-1) ?? null;

		// Carpetas de la ubicación actual
		const folders = game.folders
			.filter(folder => folder.type === "Actor" && folder.folder?.id === location?.id)
			.map(folder => {
				const { isSelected, validCount } = this.#getFolderSummaryData(folder);
				return {
					id: folder.id,
					name: folder.name,
					color: folder.color,
					isFolder: true,
					isSelected,
					validCount // La cantidad de "items válidos" que contiene la carpeta
				};
			});

		// Actores de la ubicación actual (no los que están dentro de las carpetas de la ubicación actual, solo los "sueltos")
		const actorsRaw = game.actors.filter(actor => actor.folder?.id === location?.id);

		// Filtrado de los actores para dejar solo los válidos
		const validActors = actorsRaw
			.filter(actor => this.#isValidEntry(actor))
			.map(actor => ({
				uuid: actor.uuid,
				name: actor.name,
				img: actor.img,
				isFolder: false,
				isSelected: this.#selectedActors.some(selectedActor => selectedActor.uuid === actor.uuid)
			}));

		// Filtrado de los actores para dejar solo los inválidos
		const invalidActors = actorsRaw
			.filter(actor => !this.#isValidEntry(actor))
			.map(actor => ({
				uuid: actor.uuid,
				name: actor.name,
				img: actor.img,
				isFolder: false
			}));

		// Término escrito en la barra de búsqueda
		const query = this.#searchQuery.toLowerCase().trim();

		return {
			breadcrumb: this.#currentLocationOnActorsTab.map((folder, index) => ({
				name: folder.name,
				index
			})),
			items: [...folders, ...validActors].filter(item => !query || item.name.toLowerCase().includes(query)),
			invalidItems: invalidActors,
			treeFolders: this.#buildNestedTree(),
    		currentFolderId: this.#currentLocationOnActorsTab.at(-1)?.id ?? null
		};
	}

	/**
	 * Prepares the context for the Compendiums tab.
	 * Only called when the Compendiums tab is active.
	 * @returns {Object} The context object for the Compendiums tab.
	 */
	#prepareCompendiumsTabContext() {
		// TODO: implementar cuando se desarrolle la tab de compendios
		return {
			currentLocation: this.#currentLocationOnCompendiumsTab,
			items: []
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
	#toggleLoading (isLoading) {
		pk5eLog(`pk5e (npc hp fixer): loading state <${isLoading}>`);
		this.#isAppLoading = isLoading;
		this.element.inert = isLoading;
		this.element.classList.toggle("is-loading", isLoading);
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

	// todo: Handle Submit
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
	 * Indicates if the app is in the specified tab.
	 * @returns {boolean} True if the app is in the correct view and tab, false otherwise.
	 */
	isTheActiveTab(tab) {
		return (this.#currentView === this.#VIEWS.ACTORS_SELECTION) && (this.#currentTab === tab);
	}

	/**
	 * Builds a nested tree of Actor folders for the tree nav sidebar.  
	 * @returns {Array} Array of root "folder nodes", each with { id, name, color, isCurrent, children }.  
	 */  
	#buildNestedTree() {  
		const currentFolderId = this.#currentLocationOnActorsTab.at(-1)?.id ?? null;  
	
		const buildNode = (folder) => ({  
			id: folder.id,  
			name: folder.name,  
			color: folder.color ?? null,  
			isCurrent: folder.id === currentFolderId,  
			children: folder.children.map(child => buildNode(child.folder))  
		});  
	
		return game.folders  
			.filter(f => f.type === "Actor" && !f.folder)  
			.map(buildNode);  
	}

	/**  
	 * Builds the full breadcrumb path (array of folders from root to the given folder).  
	 * @param {Folder} folder - The target folder.  
	 * @returns {Folder[]} Array of folders from root to the target.  
	 */  
	#buildBreadcrumbPath(folder) {
		const path = [];  
		let current = folder;  
		while (current) {  
			path.unshift(current); 		// ? Info: Usa .unshift porque llena el array desde el último elemento hasta el primero: Desde la carpeta pasada como argumento hasta la raíz
			current = current.folder;	// ? .folder es la carpeta padre. Si no tiene carpeta padre es porque es una carpeta que ya está en la raíz (no está contenida en ninguna otra carpeta).
		}  
		return path;

		// Ejemplo: Si doy como input la carpeta que se encuentra en "/ Hoenn / Fuego / Bebés" (la carpeta Bebés)
		// El array se va llenando así: [Bebés] → [Fuego, Bebés] → [Hoenn, Fuego, Bebés]
		// Se llena desde la carpeta dada hasta la raíz agregando a sus carpetas padres una a una al inicio del array
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

	// ? Tal vez esto ya no se use. Hay que revisar. Ahora mismo las rutas para el breadcrumb las manejamos dentro de
	// ? un array donde cada folder es un elemento, no como un único string, así que quizás a futuro toque adaptar esto
	// ? o construir una función que pueda transformar el string a el array.
	/**
	 * Builds the root path for a compendium with its source: "Compendiums Tab / [Source] Label".
	 * @param {Pack} compendium - The compendium for which to build the root path.
	 * @returns {string} The root path of the compendium.
	 */
	#buildCompendiumRootPath (compendium) {
		return `Compendiums Tab / [${this.#getSourceName(compendium)}] ${compendium.metadata.label}`;
	}

	// ? Tal vez esto ya no se use. Hay que revisar. Ahora mismo las rutas para el breadcrumb las manejamos dentro de
	// ? un array donde cada folder es un elemento, no como un único string, así que quizás a futuro toque adaptar esto
	// ? o construir una función que pueda transformar el string a el array.
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
	 * Recursively collects all documents in a folder and its subfolders, then returns
	 * summary data about them: Whether all valid actors are selected, and the total count of valid actors.
	 * @param {Folder} folder - The folder to analyze.
	 * @returns {{ isSelected: boolean, validCount: number }} Returns { isSelected: false, validCount: 0 } if the folder has no valid actors.
	 */
	#getFolderSummaryData(folder) {
		const entries = [];
		this.#collectFolderEntries(folder, entries);
		const validEntries = entries.filter(entry => this.#isValidEntry(entry.data));
		const validCount = validEntries.length;
		if (validCount === 0) return { isSelected: false, validCount: 0 };
		const isSelected = validEntries.every(entry => this.#selectedActors.some(a => a.uuid === entry.uuid));
		return { isSelected, validCount };
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
		this.#toggleLoading(true);
		await new Promise(resolve => setTimeout(resolve, 0)); // Para dar tiempo a renderizar el spinner en los casos síncronos

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
			this.#toggleLoading(false);
			await this.render({ parts: ["footer"] });
			if (addedCount > 0) this.#animateCounter();
		}
	}

	async _onClose(options) {
		await super._onClose(options);
		Hooks.off("renderBaseActorSheet", this.#renderedActorHookIdForRemoveSpinner); // En cuanto se cierra la app hay que borrar el hook porque si no se sigue ejecutando incluso aunque la app esté cerrada. Y se pueden acumular porque se crea uno nuevo cada vez que se abre una nueva app. Esto es para evitar memory leaks.
		this.#renderedActorHookIdForRemoveSpinner = null;
	}

	/**
	 * Called when the application is rendered.
	 * Currently used to set up drag and drop event listeners on the drop zone, allowing actors, folders, and compendiums to be dragged and dropped into the app for selection.
	 * @param {Object} context - The rendering context.
	 * @param {Object} options - Additional options for rendering.
	 */
	_onRender(context, options) {
		super._onRender(context, options);
		const contentWasRerendered = !options.parts || options.parts.includes("content");

		//* Restaurar valor de la search bar (la searchQuery) tras re-renders del content
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {  
			const searchBar = this.element.querySelector(".search-bar");  
			if (searchBar) searchBar.value = this.#searchQuery;  
		}

		//* Search bar filtering
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {  
			const searchBar = this.element.querySelector(".search-bar");  
			searchBar?.addEventListener("input", (event) => {  
				this.#searchQuery = event.target.value;  
				const query = this.#searchQuery.toLowerCase().trim();  
		
				// El filtrado simplemente se encarga de ocultar (con css display none) aquellos
				// elementos cuyos nombres no coincidan con la searchQuery
				const content = this.element.querySelector(".selection-pane .content");  
				content?.querySelectorAll(".item-container").forEach(itemContainer => {  
					const nameHtmlElement = itemContainer.querySelector(".item .name span");  
					const itemName = nameHtmlElement?.textContent?.toLowerCase() ?? "";  
					itemContainer.style.display = (!query || itemName.includes(query)) ? "" : "none";  
				});  
			});  
		}

		//* Drag and Drop hightlighting
		const dropZone = this.element.querySelector(".drop-zone"); // todo: Para mantener la misma estructura, en vez de tener la dropzone aquí quizás deberíamos hacer como los demás ifs que obtienen sus "content" dentro usando el querySelector dentro
		if ( dropZone && this.isTheActiveTab(this.#TABS.DROP) ) {
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

		//* Folder navigation (enter folder on click)
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("click", (event) => {
				// Ignore clicks on the checkbox
				if (event.target.classList.contains("check-button")) return;

				const folderItem = event.target.closest(".folder-item");
				if (!folderItem) return;

				const folder = game.folders.get(folderItem.dataset.folderId);
				if (!folder) return;

				this.#currentLocationOnActorsTab.push(folder);
				this.#searchQuery = "";
				this.render({ parts: ["content"] });
			});
		}

		//* Breadcrumb navigation
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const currentRoute = this.element.querySelector(".selection-pane .current-route");
			currentRoute?.addEventListener("click", (event) => {
				const segment = event.target.closest(".breadcrumb-segment[data-breadcrumb-index]");
				if (!segment) return;

				const index = parseInt(segment.dataset.breadcrumbIndex);

				if (index === -1) {
					// Navigate to root (ignore if already there)
					if (this.#currentLocationOnActorsTab.length === 0) return;
					this.#currentLocationOnActorsTab = [];
				} else {
					// Navigate to a specific point in the breadcrumb (slice up to and including that index)
					this.#currentLocationOnActorsTab = this.#currentLocationOnActorsTab.slice(0, index + 1);
				}

				this.#searchQuery = "";
				this.render({ parts: ["content"] });
			});
		}

		//* Actor sheet open (click on actor) for Actors Tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const content = this.element.querySelector(".selection-pane");
			content?.addEventListener("click", (event) => {
				// Ignore clicks on the checkbox
				if (event.target.classList.contains("check-button")) return;
				if (event.target.classList.contains("lock-icon")) return;

				const actorItem = event.target.closest(".actor-item");
				if (!actorItem) return;

				// Ignore if already loading
				if (actorItem.classList.contains("loading")) return;

				const uuid = actorItem.dataset.uuid;
				actorItem.classList.add("loading");
				this.#loadingActorsOnExplorer.set(uuid, actorItem); // Guarda el actor item en el map de actor items que están en espera por que sus fichas se rendericen (y que tienen el spinner loading activo)

				fromUuidSync(uuid)?.sheet.render(true);
			});
		}

		//* Invalid section toggle
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const invalidHeader = this.element.querySelector(".selection-pane .invalid-section-header");
			invalidHeader?.addEventListener("click", () => {
				invalidHeader.closest(".invalid-section").classList.toggle("expanded");
			});
		}

		//* Actor checkbox toggle (for Actors tab)
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("change", (event) => {
				if (!event.target.classList.contains("check-button")) return;
				const actorItem = event.target.closest(".actor-item");
				if (!actorItem) return;

				const uuid = actorItem.dataset.uuid;
				if (event.target.checked) {
					if (this.#selectedActors.some(a => a.uuid === uuid)) return;
					const actor = fromUuidSync(uuid);
					const containerPath = actor.folder ? this.#buildFolderPath(actor.folder) : "Actors Tab";
					this.#selectedActors.push({ name: actor.name, uuid, containerPath, data: actor });
				} else {
					this.#selectedActors = this.#selectedActors.filter(a => a.uuid !== uuid);
				}

				this.render({ parts: ["footer"] });
				this.#animateCounter();
			});
		}

		//* Folder checkbox toggle (for Actors tab)
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("change", async (event) => {
				if (!event.target.classList.contains("check-button")) return;
				const folderItem = event.target.closest(".folder-item");
				if (!folderItem) return;

				const folder = game.folders.get(folderItem.dataset.folderId);
				if (!folder) return;

				const isChecked = event.target.checked;
				const validActorCount = parseInt(folderItem.dataset.validActorCount) || 0;

				// Loading Spinner for 100 actors or more
				if (validActorCount >= 100) {
					this.#toggleLoading(true);
					await new Promise(resolve => setTimeout(resolve, 0)); // Para dar tiempo a renderizar el spinner en los casos síncronos
				}

				const entries = [];
				this.#collectFolderEntries(folder, entries);

				// Empty folder: do nothing. The checkbox stays as-is until the next re-render (ex: by navigation).
				const hasValidEntries = entries.some(e => this.#isValidEntry(e.data));
				if (!hasValidEntries) {
					this.#toggleLoading(false);
					return;
				}

				let shouldAnimateFooterCounter = false;

				try {
					if (isChecked) {
						// Add all valid actors from the folder
						const addedCount = this.#processAndAddEntries(entries);
						if (addedCount > 0) shouldAnimateFooterCounter = true;
					} else {
						// Remove all actors from the folder (and subfolders)
						const uuidsToRemove = new Set(entries.map(e => e.uuid));
						const previousCount = this.#selectedActors.length;
						this.#selectedActors = this.#selectedActors.filter(a => !uuidsToRemove.has(a.uuid));
						const removedCount = previousCount - this.#selectedActors.length;
						if (removedCount > 0) {
							ui.notifications.info(`Se han eliminado ${removedCount} entradas.`);
							shouldAnimateFooterCounter = true;
						}
					}
				} catch (error) {
					ui.notifications.error("Ocurrió un error al procesar la carpeta. Revisa la consola para más detalles."); // todo: Reescribir ese mensaje de error
					console.error("Error processing folder checkbox:", error);
				} finally {
					this.#toggleLoading(false);
					this.render({ parts: ["footer"] }); // contador del footer
					if (shouldAnimateFooterCounter) this.#animateCounter();
				}
			});
		}

		//* Select All button
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const selectAllBtn = this.element.querySelector(".select-all-button");
			selectAllBtn?.addEventListener("click", async () => {
				// Spinner siempre, sin excepción
				this.#toggleLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0)); // Para dar tiempo a renderizar el spinner en los casos síncronos

				const location = this.#currentLocationOnActorsTab.at(-1) ?? null;
				const entries = [];
				let shouldAnimateFooterCounter = false;

				try {
					// Dentro de una folder
					if (location) {
						this.#collectFolderEntries(location, entries);

					// En la raíz de la tab
					} else {
						const rootFolders = game.folders.filter(f => f.type === "Actor" && !f.folder);
						for (const folder of rootFolders) this.#collectFolderEntries(folder, entries);
						const rootActors = game.actors.filter(a => !a.folder);
						entries.push(...rootActors.map(a => ({
							name: a.name,
							uuid: a.uuid,
							containerPath: "Actors Tab",
							data: a
						})));
					}

					const validEntries = entries.filter(e => this.#isValidEntry(e.data));
					const areAllEntriesAlreadySelected = (validEntries.length > 0)
						&& validEntries.every(e => this.#selectedActors.some(a => a.uuid === e.uuid));

					const content = this.element.querySelector(".selection-pane .content");

					if (areAllEntriesAlreadySelected) {
						// Deseleccionar todas
						const previousCount = this.#selectedActors.length;
						const uuidsToRemove = new Set(validEntries.map(e => e.uuid)); 							// ? Info: Hacemos un set para poder hacer uso del método .has que es mucho más eficiente para verificar existencia que buscar dentro de un array con .some
						this.#selectedActors = this.#selectedActors.filter(a => !uuidsToRemove.has(a.uuid)); 	// ? Este filtrado es mucho más rápido que trabajar con el array original de validEntries, y como seguramente esta app trabaje con una enorme cantidad de elementos, la eficiencia es crucial.
						const removedCount = previousCount - this.#selectedActors.length;
						if (removedCount > 0) {
							ui.notifications.info(`Se han eliminado ${removedCount} entradas.`);
							shouldAnimateFooterCounter = true;
						}
						content?.querySelectorAll(".check-button:not(:disabled)").forEach(cb => cb.checked = false);
					} else {
						// Seleccionar las que falten
						const addedCount = this.#processAndAddEntries(entries);
						content?.querySelectorAll(".check-button:not(:disabled)").forEach(cb => cb.checked = true);
						if (addedCount > 0) shouldAnimateFooterCounter = true;
					}

				} catch (error) {
					ui.notifications.error("Ocurrió un error al seleccionar todos. Revisa la consola para más detalles."); // todo: mejorar este log
					console.error("Error selecting all:", error);
				} finally {
					this.#toggleLoading(false);
					this.render({ parts: ["footer"] });  
					if (shouldAnimateFooterCounter) this.#animateCounter();
				}
			});
		}

		//* Tree nav navigation  
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {  
			const treeNav = this.element.querySelector(".tree-nav");  
			treeNav?.addEventListener("click", (event) => {  
				const treeNode = event.target.closest(".tree-node");  
				if (!treeNode) return;  
		
				const folderId = treeNode.dataset.folderId;  
		
				if (!folderId) {  
					// Clic en el nodo raíz  
					if (this.#currentLocationOnActorsTab.length === 0) return;  
					this.#currentLocationOnActorsTab = [];  
				} else {  
					// Clic en un nodo carpeta  
					if (this.#currentLocationOnActorsTab.at(-1)?.id === folderId) return; // Ya estamos allí: Se hizo clic en la carpeta actual en la que nos encontramos
					const folder = game.folders.get(folderId);  
					if (!folder) return;  
					this.#currentLocationOnActorsTab = this.#buildBreadcrumbPath(folder);  
				}  
		
				this.#searchQuery = "";
				this.render({ parts: ["content"] });  
			});  
		}

	}

}