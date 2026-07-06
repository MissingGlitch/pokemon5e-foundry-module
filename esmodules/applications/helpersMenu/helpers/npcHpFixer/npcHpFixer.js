const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { TextEditor, DragDrop } = foundry.applications.ux;
import { pk5eLog } from "../../../../utils/logs.js";

export class NpcHpFixer extends HandlebarsApplicationMixin (ApplicationV2) {
	/**
	 * Creates a new NpcHpFixer application instance.
	 * Beyond the standard ApplicationV2 initialization, registers two Foundry hooks responsible for
	 * removing the loading spinner from file explorer items once Foundry finishes rendering them:
	 * one for actor sheets (renderBaseActorSheet) and one for compendium windows (renderCompendium).
	 * Both hook IDs are stored as private fields to allow proper cleanup when the application closes.
	 * @param {ApplicationConfiguration} [options={}] - Application configuration options.
	 * @override
	 */
	constructor (options = {}) {
		super(options);

		// Registration of the Hooks used to remove the loading spinner from file explorer items
		// when Foundry finishes rendering their corresponding window (actor sheet or compendium window)

		// ? Info: When an item is clicked in the file explorer (an actor or a compendium), Foundry opens its corresponding
		// ? window (actor sheet or compendium window). That process is not immediate, so while it loads, a spinner 🌀 is
		// ? shown on the item. Once Foundry finishes rendering the window, the spinner must be removed from the explorer.
		// ? Each hook below listens for its respective render event; when it fires, it checks whether the rendered document
		// ? is one of those waiting in the loading maps (#loadingActorSheetsOnApp / #loadingCompendiumsOnExplorer).
		// ? If so, it locates the item and removes its spinner ✨. This way, after the window opens, the spinner is gone.

		this.#renderedCompendiumHookIdForRemoveSpinner = Hooks.on("renderCompendium", (app) => {
			const collection = app.collection?.collection;
			if (!collection) return;
			if (this.#loadingCompendiumsOnExplorer.has(collection)) {
				this.#loadingCompendiumsOnExplorer.get(collection).classList.remove("loading");
				this.#loadingCompendiumsOnExplorer.delete(collection);
			}
		});

		this.#renderedActorHookIdForRemoveSpinner = Hooks.on("renderBaseActorSheet", (sheet) => {
			const uuid = sheet.actor.uuid;
			if (this.#loadingActorSheetsOnApp.has(uuid)) {
				this.#loadingActorSheetsOnApp.get(uuid).classList.remove("loading");
				this.#loadingActorSheetsOnApp.delete(uuid);
			}
		});
	}

	/**
	 * Template parts that compose the application's rendered HTML.
	 * Each part maps to a Handlebars template file rendered independently,
	 * allowing selective re-rendering of specific sections without rebuilding the entire application.
	 * @type {Record<string, HandlebarsTemplatePart>}
	 * @override
	 */
	static PARTS = {
		// Header with the tab navigation
		header:  { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.header.hbs"  },

		// Content with the information and options for each tab
		content: { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.content.hbs" },

		// Footer with the submit button and the expandable summary
		footer:  { template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.footer.hbs"  }
	};

	/**
	 * Default configuration options for the application.
	 * Defines the application's unique ID, window appearance, initial position, form submission behavior,
	 * and the set of available actions.
	 * @type {ApplicationConfiguration}
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		id: "pk5e-npc-hp-fixer",

		/**
		 * Configures the application window rendered by ApplicationV2.
		 * contentTag defines the root HTML element wrapping the app content;
		 * "form" makes it a proper HTML form so that form submission works natively.
		 */
		window: {
			title: "NPC HP Fixer",
			icon: "fa-solid fa-heart-circle-exclamation",
			contentTag: "form"
		},

		/**
		 * Sets the initial size and position of the application window in pixels.
		 */
		position: {
			width: 1200,
			height: 600,
			top: 100
		},

		/**
		 * Configures how ApplicationV2 handles the HTML form element inside the app.
		 * The handler is invoked on form submission; closeOnSubmit is set to false to prevent
		 * ApplicationV2 from automatically closing the app after submit, so a result dialog
		 * can be displayed instead.
		 */
		form: {
			handler: NpcHpFixer.#handleSubmit,	// Handles form submission
			closeOnSubmit: false				// Kept open after submission to display a confirmation dialog
		},

		/**
		 * Maps data-action attribute values to their handler functions.
		 * ApplicationV2 automatically listens for clicks on any element with data-action="key"
		 * inside the app and calls the corresponding handler. No manual addEventListener needed.
		*/
		actions: {
			cancel:						NpcHpFixer.#onCancel,					// Close the application
			selectTab:					NpcHpFixer.#selectTab,					// Switch between the three tabs: Drop, Actors, or Compendiums
			moveToIntroView:			NpcHpFixer.#moveToIntroView,			// Navigate back to the intro view
			moveToActorsSelectionView:	NpcHpFixer.#moveToActorsSelectionView,	// Navigate to the actor selection view (Drop, Actors, and Compendiums tabs)
			backToSelection:			NpcHpFixer.#backToSelection,			// Navigate back to the actor selection view from the review-and-process view
			startFix:					NpcHpFixer.#startFix					// Start the fix operation, switching the view to the processing state
		}
	};

	//* DEFAULT_OPTIONS Handlers
	/**
	 * Action handler that closes the application.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action attribute.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #onCancel (event, target) {
		this.close();
	}

	/**
	 * Action handler that switches the active tab within the actor selection view.
	 * Reads the target tab identifier from the element's dataset and updates #currentTab,
	 * then triggers a full re-render. Does nothing if no tab identifier is found on the element.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action and data-tab attributes.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #selectTab (event, target) {
		const selectedTab = target.dataset.tab;
		if ( !selectedTab ) return;
		this.#currentTab = selectedTab;
		this.render({ parts: ["header", "content"] });
	}

	/**
	 * Action handler that navigates the application back to the intro view.
	 * Sets the active view to #VIEWS.INTRO and triggers a full re-render.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action attribute.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #moveToIntroView (event, target) {
		this.#currentView = this.#VIEWS.INTRO;
		this.render();
	}

	/**
	 * Action handler that navigates the application to the actor selection view.
	 * Sets the active view to #VIEWS.ACTORS_SELECTION and triggers a full re-render.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action attribute.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #moveToActorsSelectionView (event, target) {
		this.#currentView = this.#VIEWS.ACTORS_SELECTION;
		this.render();
	}

	/**
	 * Action handler that navigates the application back to the actor selection view.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action attribute.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #backToSelection (event, target) {
		this.#currentView = this.#VIEWS.ACTORS_SELECTION;
		this.render();
	}

	/**
	 * Form submission handler that validates the actor selection and navigates to the review-and-process view.
	 * If no actors are selected, shows a warning notification and aborts the navigation.
	 * @param {SubmitEvent} event - The submit event that triggered the handler.
	 * @param {HTMLFormElement} form - The form element that was submitted.
	 * @param {FormDataExtended} formData - The processed form data.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #handleSubmit (event, form, formData) {
		if (this.#selectedActors.length === 0) {
			ui.notifications.warn("No pokémon selected. Please select at least one pokémon before proceeding.");
			return;
		}
		this.#currentView = this.#VIEWS.REVIEW_AND_PROCESS;
		this.render();
	}

	/**
	 * Action handler that starts the fix operation.
	 * Switches the review-and-process view to the processing state and begins applying corrections.
	 * @param {PointerEvent} event - The pointer event that triggered the action.
	 * @param {HTMLElement} target - The element that carries the data-action attribute.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #startFix (event, target) {
		// Switch to the processing state and re-render to show the progress bar
		this.#isProcessing = true;
		await this.render();

		// Wait for the next frame to ensure the DOM is fully painted before starting the loop
		await new Promise(resolve => requestAnimationFrame(resolve));

		// Sequential processing loop: One actor at a time
		const results = { fixed: [], skipped: [], errors: [] };

		for (let i = 0; i < this.#selectedActors.length; i++) {
			const entry  = this.#selectedActors[i];
			const actor  = entry.data;
			const total  = this.#selectedActors.length;

			// Update the progress bar DOM before processing this actor (step 6)
			const progressPercent = Math.round((i / total) * 100);
			this.element.querySelector(".progress-bar-fill").style.width         = `${progressPercent}%`;
			this.element.querySelector(".progress-counter .current").textContent = i;
			this.element.querySelector(".progress-percentage").textContent       = `${progressPercent}%`;
			this.element.querySelector(".current-actor-name").textContent        = entry.name;
			this.element.querySelector(".current-actor-path").textContent 		 = entry.containerPath;

			// Calculate the fix data for this actor
			const fixData = this.#calculateFixData(actor);

			// Silent skip: actor was already fixed
			if (fixData.status === this.#FIX_STATUS.ALREADY_FIXED) {
				results.skipped.push({ name: entry.name, containerPath: entry.containerPath, uuid: entry.uuid, img: actor.img });
				pk5eLog(`pk5e (npc hp fixer): Skipping actor "${entry.name}". Reason: Already fixed.`, { name: entry.name, containerPath: entry.containerPath, uuid: entry.uuid });
				continue;
			}

			// Calculation error: actor cannot be fixed
			if (fixData.status !== this.#FIX_STATUS.OK) {
				const reason = this.#FIX_STATUS_LABELS.get(fixData.status) ?? "Unknown error";
				console.warn(`pk5e (npc hp fixer): Skipping actor "${entry.name}". Reason: ${reason}.`);
				pk5eLog(`pk5e (npc hp fixer): Skipping actor "${entry.name}". Reason: ${reason}.`, { name: entry.name, containerPath: entry.containerPath, uuid: entry.uuid, status: fixData.status });
				results.errors.push({ name: entry.name, reason, containerPath: entry.containerPath, uuid: entry.uuid, img: actor.img });
				continue;
			}

			// Apply the fix
			try {
				const { cls, hpAdv, newValue, newSourceMaxHP, sourceMaxHP } = fixData;

				// 1. Update the advancement value inside the class item
				const advancementCollection = cls.toObject().system.advancement;
				const advIdx = advancementCollection.findIndex(a => a._id === hpAdv.id);
				if (advIdx === -1) throw new Error("Advancement not found in class item");
				advancementCollection[advIdx].value = newValue;
				await cls.update({ "system.advancement": advancementCollection });

				// 2. Update the stored source hp.max and clamp hp.value to the new max
				const currentHP = actor.system.attributes.hp.value;
				await actor.update({
					"system.attributes.hp.max":   newSourceMaxHP,
					"system.attributes.hp.value": Math.min(currentHP, sourceMaxHP)
				});

				results.fixed.push({ name: entry.name, containerPath: entry.containerPath, uuid: entry.uuid, img: actor.img });
				pk5eLog(`pk5e (npc hp fixer): Fixed "${entry.name}"`, { uuid: entry.uuid, newValue, newSourceMaxHP });

			} catch (err) {
				console.error(`pk5e (npc hp fixer): Failed to fix actor "${entry.name}":`, err);
				results.errors.push({ name: entry.name, reason: err.message, containerPath: entry.containerPath, uuid: entry.uuid, img: actor.img });
			}
		}

		// Update the progress bar to 100% after the loop finishes
		this.element.querySelector(".progress-bar-fill").style.width = "100%";
		this.element.querySelector(".progress-counter .current").textContent = this.#selectedActors.length;
		this.element.querySelector(".progress-percentage").textContent = "100%";
		this.element.querySelector(".current-actor-name").textContent = "";
		this.element.querySelector(".current-actor-path").textContent = "";

		// Navigate to the RESULT view with the fix results
		this.#isProcessing = false;
		this.#fixResults   = results;
		this.#currentView  = this.#VIEWS.RESULT;
		this.render();

	}

	/**
	 * Calculates the fix data needed to make an NPC actor's HP update dynamically when its Constitution modifier changes.
	 * Extracts the class item, hit points advancement, and current HP data from the actor,
	 * then computes the corrected advancement value and the new source hp.max (TIHP).
	 * Always returns an object with a status Symbol from #FIX_STATUS.
	 * On success (status === #FIX_STATUS.OK), the object also includes cls, hpAdv, newValue, newSourceMaxHP, and sourceMaxHP.
	 * @param {Actor} actor - The NPC actor to calculate the fix for.
	 * @returns {{ status: symbol, cls?: Item, hpAdv?: object, newValue?: object, newSourceMaxHP?: number, sourceMaxHP?: number }}
	 * @private
	 */
	#calculateFixData(actor) {
		// Validate the actor and return the specific failure status if it does not pass
		const validationStatus = this.#validateActor(actor);
		if (validationStatus !== this.#FIX_STATUS.OK) return { status: validationStatus };

		// If the actor belongs to a locked compendium, it cannot be updated
		if (actor.pack) {
			const pack = game.packs.get(actor.pack);
			if (pack?.locked) return { status: this.#FIX_STATUS.LOCKED_COMPENDIUM };
		}

		// Find the class item
		const cls = actor.items.find(i => i.type === "class");
		if (!cls) return { status: this.#FIX_STATUS.NO_CLASS };

		// Find the HitPoints advancement inside the class
		const hpAdv = cls.advancement.byType.HitPoints?.[0];
		if (!hpAdv) return { status: this.#FIX_STATUS.NO_ADVANCEMENT };

		const classLevel    = cls.system.levels;
		const currentValue  = foundry.utils.deepClone(hpAdv.value);
		const hitDieValue   = hpAdv.hitDieValue;
		const conMod        = actor.system.abilities[CONFIG.DND5E.defaultAbilities.hitPoints ?? "con"]?.mod ?? 0;

		// Build the new advancement value with entries for ALL levels
		const newValue = {};
		let additionalHP = 0;

		for (let level = 1; level <= classLevel; level++) {
			if (currentValue[level] !== undefined && currentValue[level] !== null) {
				// Keep existing entries unchanged
				newValue[level] = currentValue[level];
			} else {
				// Assign the correct value to missing levels
				const assignedValue = (level === 1) ? "max" : "avg";
				newValue[level] = assignedValue;

				// Calculate how much HP this new entry contributes with the current CON mod
				const numericValue = (assignedValue === "max") ? hitDieValue : (hitDieValue / 2) + 1;
				additionalHP += Math.max(numericValue + conMod, 1);
			}
		}

		// If no levels were missing, the actor is already fixed, so skip it
		if (Object.keys(currentValue).length === Object.keys(newValue).length) return { status: this.#FIX_STATUS.ALREADY_FIXED };

		// Get the stored source hp.max (not the derived/computed value)
		const sourceMaxHP = actor.system._source.attributes.hp.max;

		// Excess correction: if the advancement HP exceeds the original bestiario HP,
		// reduce stored values level by level (from highest to lowest) until the total matches exactly.
		// This happens when the CON mod is high enough that the advancement overshoots the statblock HP.
		if (additionalHP > sourceMaxHP) {
			let excess = additionalHP - sourceMaxHP;

			// Collect only the new levels (those without a previous value), from highest to lowest
			const newLevels = [];
			for (let level = classLevel; level >= 1; level--) {
				if (currentValue[level] === undefined || currentValue[level] === null) {
					newLevels.push(level);
				}
			}

			// Iteratively reduce by 1 per level until the excess is resolved
			let progressed = true;
			while (excess > 0 && progressed) {
				progressed = false;
				for (const level of newLevels) {
					if (excess <= 0) break;

					const stored = newValue[level];
					const num = (stored === "max") ? hitDieValue
							: (stored === "avg") ? (hitDieValue / 2) + 1
							: stored;

					if (num > 1) {
						const hpBefore    = Math.max(num + conMod, 1);
						const hpAfter     = Math.max((num - 1) + conMod, 1);
						const reduction   = hpBefore - hpAfter;
						if (reduction > 0) {
							newValue[level] = num - 1;
							additionalHP   -= reduction;
							excess         -= reduction;
							progressed      = true;
						}
					}
				}
			}

			// If the excess persists after exhausting all levels, this actor cannot be fixed
			if (excess > 0) return { status: this.#FIX_STATUS.UNCORRECTABLE };
		}

		return {
			status: this.#FIX_STATUS.OK,
			cls,
			hpAdv,
			newValue,
			newSourceMaxHP: Math.max(sourceMaxHP - additionalHP, 0),
			sourceMaxHP
		};
	}

	//* Fix operation status codes and results
	/**
	 * Unique Symbol-based status codes returned by #calculateFixData to indicate the outcome of the fix calculation for a single actor.
	 * Used in the sequential processing loop to distinguish between successful fixes, silent skips, and reportable errors.
	 * @type {{ OK: symbol, INVALID: symbol, NO_CLASS: symbol, NO_ADVANCEMENT: symbol, ALREADY_FIXED: symbol, UNCORRECTABLE: symbol, LOCKED_COMPENDIUM: symbol }}
	 * @private
	 */
	#FIX_STATUS = {
		OK:					Symbol("NPC HP Fixer Fix Status"),  // OK:             	  Fix data calculated successfully: Ready to be applied
		NOT_AN_ACTOR:		Symbol("NPC HP Fixer Fix Status"),  // Not an Actor:      The document is not an Actor instance
		NOT_AN_NPC:			Symbol("NPC HP Fixer Fix Status"),  // Not an NPC:        The actor is not of type "npc"
		NO_LEVEL_CLASS:		Symbol("NPC HP Fixer Fix Status"),  // No Level Class:    No class item with "Level" in its name found
		NO_CLASS:			Symbol("NPC HP Fixer Fix Status"),  // No Class:       	  Actor has no class item
		NO_ADVANCEMENT:		Symbol("NPC HP Fixer Fix Status"),  // No Advancement: 	  The class item has no HitPoints advancement
		ALREADY_FIXED:		Symbol("NPC HP Fixer Fix Status"),  // Already Fixed:  	  All levels already had values: No changes needed (silent skip)
		UNCORRECTABLE:		Symbol("NPC HP Fixer Fix Status"),  // Uncorrectable:  	  Advancement HP exceeds statblock HP even at minimum values. Cannot be corrected
		LOCKED_COMPENDIUM:	Symbol("NPC HP Fixer Fix Status"),  // Locked Compendium: The actor belongs to a locked compendium and cannot be updated
	};

	/**
	 * Human-readable labels for each #FIX_STATUS code.
	 * Used to display error messages in the RESULT view for status codes that represent a reportable failure.
	 * Only error statuses need an entry; OK and ALREADY_FIXED are handled separately by the processing loop.
	 * @type {Map<symbol, string>}
	 * @private
	 */
	#FIX_STATUS_LABELS = new Map([
		[this.#FIX_STATUS.NOT_AN_ACTOR,      "Not an Actor document"],
		[this.#FIX_STATUS.NOT_AN_NPC,        "Actor is not of type NPC"],
		[this.#FIX_STATUS.NO_LEVEL_CLASS,    "No class item with 'Level' in its name found"],
		[this.#FIX_STATUS.NO_CLASS,       	 "No class item found on this actor"],
		[this.#FIX_STATUS.NO_ADVANCEMENT, 	 "The class item has no Hit Points advancement"],
		[this.#FIX_STATUS.UNCORRECTABLE,  	 "HP cannot be corrected: Advancement exceeds statblock HP even at minimum values"],
		[this.#FIX_STATUS.LOCKED_COMPENDIUM, "Actor belongs to a locked compendium and cannot be updated"]
	]);

	/**
	 * Stores the results of the last fix operation, populated at the end of the processing loop.
	 * Contains three arrays: fixed (successfully corrected actors), skipped (already fixed), and errors (failed actors).
	 * Null until the first fix operation completes.
	 * @type {{ fixed: {name: string}[], skipped: {name: string}[], errors: {name: string, reason: string}[] } | null}
	 * @private
	 */
	#fixResults = null;

	//* Locations within the app
	/**
	 * String identifiers for each tab within the actor selection view.
	 * Used to track the active tab and to match against data attributes in the rendered HTML templates.
	 * @type {{ DROP: string, ACTORS: string, COMPENDIUMS: string }}
	 * @private
	 */
	#TABS = {
		DROP:        "drop",         // Drop:        Tab where actors, folders, and compendiums can be dragged and dropped directly into the app for selection
		ACTORS:      "actors",       // Actors:      Tab with a file explorer for the Foundry actors sidebar, allowing navigation through folders and individual actors
		COMPENDIUMS: "compendiums"   // Compendiums: Tab with a file explorer for the Foundry compendiums sidebar, allowing navigation through sidebar folders, compendiums, and their internal folders and actors

		// ? Note: Unlike #VIEWS, which use Symbols, #TABS use plain strings because their values are used directly in the
		// ? HTML templates as data attribute values (e.g. data-tab="drop"). Symbols cannot be serialized to strings, so
		// ? they cannot be embedded in HTML or compared against values read from the DOM.
		// ? #VIEWS, on the other hand, are purely internal and they never leave the JS layer.
	};

	/**
	 * Unique Symbol-based identifiers for each view of the application.
	 * Currently two views are implemented; two more are planned for future development.
	 * @type {{ INTRO: symbol, ACTORS_SELECTION: symbol }}
	 * @private
	 */
	#VIEWS = {
		INTRO:				Symbol("NPC HP Fixer View ID"),	// Intro:				Initial view with an explanation and a button to navigate to the actor selection view
		ACTORS_SELECTION:	Symbol("NPC HP Fixer View ID"),	// Actors Selection:	View with the options to select the actors to fix (Drop, Actors, or Compendiums tabs)
		REVIEW_AND_PROCESS:	Symbol("NPC HP Fixer View ID"),	// Review and Process:	View showing a summary of selected actors for confirmation, then a progress bar during processing
    	RESULT:				Symbol("NPC HP Fixer View ID")	// Result:				Final view showing the result of the fix operation (success or error)
	};

	/**
	 * Identifier of the tab currently displayed within the actor selection view.
	 * The initial value determines which tab is shown when the view first opens.
	 * @type {string}
	 * @private
	 */
	#currentTab = this.#TABS.DROP;

	/**
	 * Identifier of the view currently displayed in the application.
	 * The initial value determines which view is shown when the application first opens.
	 * @type {symbol}
	 * @private
	 */
	#currentView = this.#VIEWS.INTRO;

	/**
	 * Navigation stack representing the current location within the Actors tab file explorer.
	 * Each entry is a Foundry Folder object from the actors sidebar.
	 * An empty array means the user is at the root; each subsequent entry represents a deeper folder level.
	 * @example
	 * []                    // root
	 * [folderA]             // root → folderA
	 * [folderA, folderB]    // root → folderA → folderB
	 * @type {Folder[]}
	 * @private
	 */
	#currentLocationOnActorsTab = [];

	/**
	 * Navigation stack representing the current location within the Compendiums tab file explorer.
	 * Each entry is either a Foundry Folder object (sidebar folder or compendium-internal folder)
	 * or a CompendiumCollection object (when navigating directly inside a compendium).
	 * An empty array means the user is at the root; each subsequent entry represents a deeper navigation level.
	 * @example
	 * []                          // root (compendiums sidebar)
	 * [sidebarFolder]             // root → sidebar folder
	 * [sidebarFolder, pack]       // root → sidebar folder → compendium
	 * [pack]                      // root → compendium (no parent sidebar folder)
	 * [pack, compendiumFolder]    // root → compendium → internal folder
	 * @type {(Folder|CompendiumCollection)[]}
	 * @private
	 */
	#currentLocationOnCompendiumsTab = [];

	/**
	 * Indicates if the app is in the specified tab.
	 * @returns {boolean} True if the app is in the correct view and tab, false otherwise.
	 * @public
	 */
	isTheActiveTab(tab) {
		return (this.#currentView === this.#VIEWS.ACTORS_SELECTION) && (this.#currentTab === tab);
	}

	//* Loading States and Values
	/**
	 * Whether the application is currently in a full loading state (spinner overlay covering the entire content area).
	 * @type {boolean}
	 * @private
	 */
	#isAppLoading = false;

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
	 * Hook ID returned by Hooks.on for the `renderBaseActorSheet` hook.
	 * Stored to allow the hook to be unregistered when the application closes.
	 * @type {number|null}
	 * @private
	 */
	#renderedActorHookIdForRemoveSpinner = null;

	/**
	 * Hook ID returned by Hooks.on for the `renderCompendium` hook.
	 * Stored to allow the hook to be unregistered when the application closes.
	 * @type {number|null}
	 * @private
	 */
	#renderedCompendiumHookIdForRemoveSpinner = null;

	/**
	 * Tracks actor items in the app that are waiting for their actor sheet to be rendered by Foundry.
	 * Maps each actor's UUID to its corresponding DOM element, so the loading spinner can be removed once the sheet opens.
	 * @type {Map<string, HTMLElement>}
	 * @private
	 */
	#loadingActorSheetsOnApp = new Map();

	/**
	 * Tracks compendium items in the file explorer that are waiting for their compendium window to be rendered by Foundry.
	 * Maps each compendium's collection key to its corresponding DOM element, so the loading spinner can be removed once the window opens.
	 * @type {Map<string, HTMLElement>}
	 * @private
	 */
	#loadingCompendiumsOnExplorer = new Map();

	/**
	 * Cache of documents loaded from compendium packs, used to avoid repeated server requests.
	 * Maps each compendium's collection key to its array of loaded actor documents.
	 * @type {Map<string, Actor[]>}
	 * @private
	 */
	#compendiumDocsCache = new Map();

	/**
	 * Whether the fix operation is currently in progress.
	 * Used to switch the review-and-process view between the confirmation state and the processing state.
	 * @type {boolean}
	 * @private
	 */
	#isProcessing = false;

	//* Miscellaneous States & Utilities
	/**
	 * Stores the current scroll position of the tree navigation panel.
	 * Persisted and restored across re-renders to prevent the tree from jumping back to the top.
	 * @type {number}
	 * @private
	 */
	#treeNavScrollTop = 0;

	/**
	 * The current search query entered in the file explorer search bar.
	 * Used to filter visible items in the selection pane; persisted across re-renders so the input value is not lost.
	 * @type {string}
	 * @private
	 */
	#searchQuery = "";

	/**
	 * List of actors currently selected by the user across all three tabs (Drop, Actors, and Compendiums).
	 * Each entry is an object containing the actor's name, UUID, container path, and the actor document itself.
	 * @type {{ name: string, uuid: string, containerPath: string, data: Actor }[]}
	 * @private
	 */
	#selectedActors = [];

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

	/**
	 * Toggles the visibility state of the footer summary panel.
	 * Adds or removes the "expanded" class from the footer and dynamically updates
	 * the tooltip text of the expand button to reflect the current state.
	 * @private
	 */
	#toggleFooterSummary() {
		const footerPart = this.element.querySelector(".footer-part");
		const expandButton = this.element.querySelector(".expand-summary-button");

		footerPart?.classList.toggle("expanded");
		const isExpanded = footerPart?.classList.contains("expanded") ?? false;
		pk5eLog(`pk5e (npc hp fixer): Summary panel ${isExpanded ? "expanded" : "collapsed"}`);

		if (expandButton) {
			expandButton.dataset.tooltip = isExpanded ? "Hide Summary" : "Show Summary";
		}
	}

	//* Prepare Context for HBS files
	/**
	 * Prepares the context for the Handlebars, providing variables that can be used inside the templates.
	 * @returns {Promise<Object>} The context object for the template.
	 */
	async _prepareContext() {
		return {
			selectedActors: this.#selectedActors.map(entry => {
				return {
					...entry,
					containerPathForLabel: entry.containerPath.replace(/Actors|Compendiums/, "").trim(),
					sourceIconClass: entry.containerPath.startsWith("Compendiums Tab")
						? "fa-solid fa-book-atlas"
						: "fa-solid fa-user"
				}
			}),
			views: {
				intro:				{ active: this.#currentView === this.#VIEWS.INTRO },
				actorsSelection:	{ active: this.#currentView === this.#VIEWS.ACTORS_SELECTION },
				reviewAndProcess:	{ active: this.#currentView === this.#VIEWS.REVIEW_AND_PROCESS },
    			result:				{ active: this.#currentView === this.#VIEWS.RESULT }
			},
			tabs: {
				drop:		 { active: this.#currentTab === this.#TABS.DROP },
				actors:		 { active: this.#currentTab === this.#TABS.ACTORS },
				compendiums: { active: this.#currentTab === this.#TABS.COMPENDIUMS }
			},
			actorsTab: (this.#currentTab === this.#TABS.ACTORS)
				? this.#prepareActorsTabContext()
				: null,
			compendiumsTab: (this.#currentTab === this.#TABS.COMPENDIUMS)
				? await this.#prepareCompendiumsTabContext()
				: null,
			isProcessing: this.#isProcessing,
			fixResults: this.#fixResults,
			resultStatus: this.#fixResults ? {
				isSuccess: this.#fixResults.errors.length === 0,
				isError:   this.#fixResults.fixed.length === 0 && this.#fixResults.skipped.length === 0,
				isPartial: this.#fixResults.errors.length > 0 && (this.#fixResults.fixed.length > 0 || this.#fixResults.skipped.length > 0)
			} : null
		};
	}

	/**
	 * Builds and returns the rendering context for the Actors tab.
	 * Collects the folders and actors at the current navigation location, separates valid from invalid actors,
	 * and applies the active search query to filter the visible items.
	 * Only called when the Actors tab is active.
	 * @returns {ActorTabContext} The rendering context for the Actors tab with breadcrumb, items, invalidItems, treeFolders, currentLocationId, currentLocationIsFolder and currentLocationIsCompendium.
	 */
	#prepareActorsTabContext() {
		// Current location
		const location = this.#currentLocationOnActorsTab.at(-1) ?? null;

		// Folders at the current location
		const folders = game.folders
			.filter(folder => folder.type === "Actor" && folder.folder?.id === location?.id)
			.map(folder => {
				const { isSelected, validCount } = this.#getFolderSummaryData(folder);
				return {
					id: folder.id,
					name: folder.name,
					color: folder.color,
					iconClass: folder.color ? "fa-solid fa-folder" : "fa-light fa-folder",
					isFolder: true,
					isCompendium: false,
					isNavigable: true, // Navigable if it is a compendium or a folder
					nodeType: "folder",
					isSelected,
					validCount // Number of valid items contained in the folder
				};
			});

		// Actors at the current location (not those inside subfolders, only the ones directly at this level)
		const actorsRaw = game.actors.filter(actor => actor.folder?.id === location?.id);

		// Filter actors to keep only the valid ones
		const validActors = actorsRaw
			.filter(actor => this.#isValidEntry(actor))
			.map(actor => ({
				uuid: actor.uuid,
				name: actor.name,
				img: actor.img,
				isFolder: false,
				isCompendium: false,
				isNavigable: false, // navigable if it is a compendium or a folder
				isSelected: this.#selectedActors.some(selectedActor => selectedActor.uuid === actor.uuid)
			}));

		// Filter actors to keep only the invalid ones
		const invalidActors = actorsRaw
			.filter(actor => !this.#isValidEntry(actor))
			.map(actor => ({
				uuid: actor.uuid,
				name: actor.name,
				img: actor.img,
				isFolder: false,
				isCompendium: false,
				isNavigable: false // navigable if it is a compendium or a folder
			}));

		// Search term entered in the search bar
		const query = this.#searchQuery.toLowerCase().trim();

		return {
			breadcrumb: this.#currentLocationOnActorsTab.map((folder, index) => ({
				index,
				name:      folder.name,
				color:     folder.color ?? null,
				iconClass: folder.color ? "fa-solid fa-folder-open" : "fa-light fa-folder-open"
			})),
			items: [...folders, ...validActors].filter(item => !query || item.name.toLowerCase().includes(query)),
			invalidItems: invalidActors,
			treeFolders: this.#buildNestedTreeForActors(),
			currentLocationId: this.#currentLocationOnActorsTab.at(-1)?.id ?? null,
			currentLocationIsFolder: true,
			currentLocationIsCompendium: false
		};
	}

	/**
	 * Builds and returns the rendering context for the Compendiums tab.
	 * Handles four distinct navigation states: Root, sidebar Folder, inside a compendium, and inside a compendium folder.
	 * Load compendium documents asynchronously on first access (subsequent calls use the cache).
	 * Separates valid from invalid entries and applies the active search query to filter the visible items.
	 * Only called when the Compendiums tab is active.
	 * @returns {CompendiumsTabContext} The rendering context for the Compendiums tab with breadcrumb, items, invalidItems, treeFolders, currentLocationId, currentLocationIsFolder and currentLocationIsCompendium.
	 */
	async #prepareCompendiumsTabContext() {
		const location = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;

		const isAtRoot             = location === null;										// ? We are at the root if the navigation stack is empty
		const isAtCompendium       = typeof location?.collection === "string";				// ? Compendiums have .collection as a string (e.g. "pokemon5e.pokedex_bestiary"). Folders also have .collection, but it returns an object, not a string.
		const isAtCompendiumFolder = !isAtCompendium && Boolean(location?.pack);			// ? Folders inside a compendium have the .pack property. Regular sidebar folders do not.
		const isAtSidebarFolder    = !isAtRoot && !isAtCompendium && !isAtCompendiumFolder;	// ? If none of the above, it can only be a sidebar folder

		// Items for the current location
		// (these properties are the only ones that change depending on the location. All other properties are always calculated the same way, regardless of the location)
		let items = [];
		let invalidItems = [];

		//* Location: Root (the Compendiums sidebar)
		if (isAtRoot) {
			// Compendium sidebar folders at the root (no parent folder)
			const rootFolders = game.folders
				.filter(f => f.type === "Compendium" && !f.folder)
				.map(folder => ({
					id: folder.id,
					name: folder.name,
					color: folder.color ?? null,
					iconClass: folder.color ? "fa-solid fa-folder" : "fa-light fa-folder",
					isFolder: true,
					isCompendium: false,
					isNavigable: true,
					nodeType: "folder",
					isSelected: this.#getCompendiumSidebarFolderSummaryData(folder).isSelected 		// Only calculable if all internal compendiums are already cached
				}));

			// Loose compendiums at the root of the compendiums sidebar (no parent sidebar folder)
			const rootPacks = game.packs
				.filter(p => !p.folder && p.documentName === "Actor")
				.map(pack => ({
					id: pack.collection,
					name: pack.metadata.label,
					color: null,
					iconClass: "fa-solid fa-book-atlas",
					isFolder: false,
					isCompendium: true,
					isNavigable: true,
					nodeType: "compendium",
					isSelected: this.#getCompendiumSummaryData(pack).isSelected
				}));

			items = [...rootFolders, ...rootPacks];

			// Invalid loose compendiums at the root (not of type Actor)
			const invalidRootPacks = game.packs
				.filter(p => !p.folder && p.documentName !== "Actor")
				.map(pack => ({
					id: pack.collection,
					name: pack.metadata.label,
					isInvalidCompendium: true
				}));
			invalidItems = invalidRootPacks;
		}

		//* Location: A sidebar folder
		else if (isAtSidebarFolder) {
			// Subfolders inside this sidebar folder
			const subFolders = game.folders
				.filter(f => f.type === "Compendium" && f.folder?.id === location.id)
				.map(folder => ({
					id: folder.id,
					name: folder.name,
					color: folder.color ?? null,
					iconClass: folder.color ? "fa-solid fa-folder" : "fa-light fa-folder",
					isFolder: true,
					isCompendium: false,
					isNavigable: true,
					nodeType: "folder",
					isSelected: this.#getCompendiumSidebarFolderSummaryData(folder).isSelected 		// Only calculable if all internal compendiums are already cached
				}));

			// Compendiums inside this sidebar folder
			const packsInFolder = game.packs
				.filter(p => p.folder?.id === location.id && p.documentName === "Actor")
				.map(pack => ({
					id: pack.collection,
					name: pack.metadata.label,
					color: null,
					iconClass: "fa-solid fa-book-atlas",
					isFolder: false,
					isCompendium: true,
					isNavigable: true,
					nodeType: "compendium",
					isSelected: this.#getCompendiumSummaryData(pack).isSelected
				}));

			items = [...subFolders, ...packsInFolder];

			// Invalid compendiums inside this folder (not of type Actor)
			const invalidPacksInFolder = game.packs
				.filter(p => p.folder?.id === location.id && p.documentName !== "Actor")
				.map(pack => ({
					id: pack.collection,
					name: pack.metadata.label,
					isInvalidCompendium: true
				}));
			invalidItems = invalidPacksInFolder;
		}

		//* Location: Inside a Compendium
		else if (isAtCompendium) {
			// Load all documents from the compendium (async: may take time on first load; subsequent calls use the cache)
			const allDocs = await this.#getCompendiumDocuments(location);

			// Root folders of the compendium (those with no parent folder inside the compendium)
			const rootFolders = location.folders
				.filter(f => f.folder === null)
				.map(folder => ({
					id: folder.id,
					name: folder.name,
					color: folder.color ?? null,
					iconClass: folder.color ? "fa-solid fa-folder" : "fa-light fa-folder",
					isFolder: true,
					isCompendium: false,
					isNavigable: true,
					nodeType: "folder",
					isSelected: this.#getCompendiumFolderSummaryData(folder, allDocs, location.folders).isSelected
				}));

			// Loose documents in the compendium (those not inside any folder)
			const rootDocs = allDocs.filter(doc => doc.folder === null);

			// Documents that are valid actors
			const validActors = rootDocs
				.filter(doc => this.#isValidEntry(doc))
				.map(doc => ({
					uuid: doc.uuid,
					name: doc.name,
					img: doc.img,
					isFolder: false,
					isCompendium: false,
					isNavigable: false,
					isSelected: this.#selectedActors.some(a => a.uuid === doc.uuid)
				}));

			// Invalid documents
			const invalidDocs = rootDocs
				.filter(doc => !this.#isValidEntry(doc))
				.map(doc => ({
					uuid: doc.uuid,
					name: doc.name,
					img: doc.img,
					isFolder: false,
					isCompendium: false,
					isNavigable: false
				}));

			items = [...rootFolders, ...validActors];
			invalidItems = invalidDocs;
		}

		//* Location: Inside a compendium folder
		else {
			// The folder's .pack property holds the collection string of the compendium it belongs to
			const pack = game.packs.get(location.pack);
			const allDocs = await this.#getCompendiumDocuments(pack);

			// Direct subfolders of this compendium folder
			const subFolders = pack.folders
				.filter(f => f.folder?.id === location.id)
				.map(folder => ({
					id: folder.id,
					name: folder.name,
					color: folder.color ?? null,
					iconClass: folder.color ? "fa-solid fa-folder" : "fa-light fa-folder",
					isFolder: true,
					isCompendium: false,
					isNavigable: true,
					nodeType: "folder",
					isSelected: this.#getCompendiumFolderSummaryData(folder, allDocs, pack.folders).isSelected
				}));

			// Documents directly inside this compendium folder (not in subfolders)
			const folderDocs = allDocs.filter(doc => doc.folder?.id === location.id);

			// Documents that are valid actors
			const validActors = folderDocs
				.filter(doc => this.#isValidEntry(doc))
				.map(doc => ({
					uuid: doc.uuid,
					name: doc.name,
					img: doc.img,
					isFolder: false,
					isCompendium: false,
					isNavigable: false,
					isSelected: this.#selectedActors.some(a => a.uuid === doc.uuid)
				}));

			// Invalid documents
			const invalidDocs = folderDocs
				.filter(doc => !this.#isValidEntry(doc))
				.map(doc => ({
					uuid: doc.uuid,
					name: doc.name,
					img: doc.img,
					isFolder: false,
					isCompendium: false,
					isNavigable: false
				}));

			items = [...subFolders, ...validActors];
			invalidItems = invalidDocs;
		}

		// Search filter
		const query = this.#searchQuery.toLowerCase().trim();
		items = items.filter(item => !query || item.name.toLowerCase().includes(query));

		// Breadcrumb
		const breadcrumb = this.#currentLocationOnCompendiumsTab.map((node, index) => ({
			index,

			// (typeof node.collection === "string") means the node is a compendium, not a folder
			name:      (typeof node.collection === "string") ? node.metadata.label : node.name,			// ? Compendiums do not have .name directly; their name is in .metadata.label. Folders do have .name.
			color:     (typeof node.collection === "string") ? null : (node.color ?? null),				// ? Compendiums do not have their own color. Folders can have one, but if not we use null explicitly.
			iconClass: (typeof node.collection === "string")											// ? If the node is a compendium, we use the book icon.
							? "fa-solid fa-book-atlas"													// ? If it is a folder with a custom color, we use the solid version of the folder icon (same as in the Actors tab).
							: ( (node.color) ? "fa-solid fa-folder-open" : "fa-light fa-folder-open" )	// ? If it is a folder without a color, we use the light version.
		}));

		// Current Location Data
		// ? At the root there is no active location, so there is no ID. However, since the current location can be either a compendium or a folder, the identifier differs depending on which it is:
		// ? Compendiums are identified by their .collection (e.g. "world.muchos-pokemon"), not by .id.
		// ? Folders (both sidebar and compendium folders) are identified by their .id.
		const currentLocationId = (isAtRoot) ? null : ( (isAtCompendium) ? location.collection : location.id );
		const currentLocationIsCompendium = isAtCompendium;							// ? True only when navigating directly inside a compendium.
		const currentLocationIsFolder     = isAtSidebarFolder || isAtCompendiumFolder;	// ? True both for sidebar folders and for folders inside a compendium.

		return {
			breadcrumb,
			currentLocationId,
			currentLocationIsCompendium,
			currentLocationIsFolder,
			items,
			invalidItems,
			treeFolders: this.#buildNestedTreeForCompendiums()
		};
	}

	//* Get Entries
	/**
	 * Validates an actor document and returns the corresponding #FIX_STATUS code.
	 * Contains the actual validation logic shared by #isValidEntry (boolean filtering) and #calculateFixData (detailed error reporting).
	 * @param {foundry.abstract.Document} entryData - The document to validate.
	 * @returns {symbol} #FIX_STATUS.OK if the actor is valid, or a specific failure status otherwise.
	 * @private
	 */
	#validateActor(entryData) {
		if ( !(entryData instanceof Actor) )
			return this.#FIX_STATUS.NOT_AN_ACTOR;

		if ( entryData.type !== "npc" )
			return this.#FIX_STATUS.NOT_AN_NPC;

		if ( !entryData.items.some(item => item.type === "class" && item.name.includes("Level")) )
			return this.#FIX_STATUS.NO_LEVEL_CLASS;

		return this.#FIX_STATUS.OK;
	}

	/**
	 * Validates that a document is an Actor of type NPC with at least one class item whose name contains "Level".
	 * Delegates to #validateActor for the actual validation logic.
	 * @param {foundry.abstract.Document} entryData - The document data to validate.
	 * @returns {boolean} True if the document is a valid NPC Actor, false otherwise.
	 * @private
	 */
	#isValidEntry(entryData) {
		return this.#validateActor(entryData) === this.#FIX_STATUS.OK;
	}

	/**
	 * Processes a list of collected entries, classifying each one as a duplicate, an invalid type, or valid.
	 * Valid entries are added to {@link #selectedActors}. A notification is shown for each non-empty category.
	 * @param {Array<{name: string, uuid: string, containerPath: string, data: Actor}>} entries - The entries to process.
	 * @returns {number} The number of valid entries that were added to the selection.
	 * @private
	 */
	#processAndAddEntries(entries) {
		const duplicates = [];
		const invalidType = [];
		const toAdd = [];

		for (const entry of entries) {
			// Duplicate: already present in the selection
			if (this.#selectedActors.some(actor => actor.uuid === entry.uuid)) {
				duplicates.push(entry);
				continue;
			}

			// Invalid type: not a Pokémon NPC
			if (!this.#isValidEntry(entry.data)) {
				invalidType.push(entry);
				continue;
			}

			// Valid: new entry of the correct type
			toAdd.push(entry);
		}

		this.#selectedActors.push(...toAdd);

		// Notifications
		if (duplicates.length > 0) {
			ui.notifications.warn(`${duplicates.length} duplicate ${duplicates.length === 1 ? "entry" : "entries"} skipped (already added).`);
		}

		if (invalidType.length > 0) {
			ui.notifications.warn(`${invalidType.length} ${invalidType.length === 1 ? "entry" : "entries"} skipped (not a Pokémon NPC).`);
		}

		if (toAdd.length > 0) {
			ui.notifications.info(`${toAdd.length} new ${toAdd.length === 1 ? "entry" : "entries"} added.`);
		}

		return toAdd.length;
	}

	/**
	 * Returns the documents of a compendium pack, using a cache to avoid repeated server requests.
	 * The first call fetches from the server and stores the result; subsequent calls return the cached value.
	 * @param {CompendiumCollection} pack - The compendium pack to get documents from.
	 * @returns {Promise<Document[]>} The documents of the pack.
	 */
	async #getCompendiumDocuments(pack) {
		if (this.#compendiumDocsCache.has(pack.collection)) {
			return this.#compendiumDocsCache.get(pack.collection);
		}
		const docs = await pack.getDocuments();
		this.#compendiumDocsCache.set(pack.collection, docs);
		return docs;
	}

	/**
	 * Recursively collects all documents in a folder and its subfolders, building their container paths.
	 * The folder can be from the sidebar or from a compendium. But it cannot be a folder that contains compendiums, that is handled with another method: #collectFolderWithCompendiumsEntries.
	 * @param {Folder} currentFolder - The folder for which to collect entries.
	 * @param {Array} entries - The array to which to add the collected entries.
	 * @param {Array|null} allCompendiumDocs - Pre-loaded documents from the compendium.
	 * @param {Array|null} allCompendiumFolders - Pre-loaded folders from the compendium.
	 * @private
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
				data: item
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
	 * @private
	 */
	async #collectCompendiumEntries (compendium, entries) {
		const allCompendiumFolders = compendium.folders;
		const allCompendiumDocs = await this.#getCompendiumDocuments(compendium);
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
	 * @private
	 */
	async #collectFolderWithCompendiumsEntries (folder, entries) {
		// Compendiums directly under this folder
		const compendiumsInFolder = game.packs.filter(p => p.folder?.id === folder.id);
		for (const compendium of compendiumsInFolder) await this.#collectCompendiumEntries(compendium, entries);

		// Subfolders under this folder (Recursive call for each subfolder)
		for (const child of folder.children) await this.#collectFolderWithCompendiumsEntries(child.folder, entries);
	}

	/**
	 * Recursively collects all Actor compendiums inside a sidebar folder and its subfolders.
	 * Uses an accumulator pattern: results are pushed into the provided {@link packs} array in place.
	 * @param {Folder} folder - The sidebar folder to search in.
	 * @param {CompendiumCollection[]} packs - Accumulator array to which the found compendiums are added.
	 * @private
	 */
	#collectActorPacksInSidebarFolder(folder, packs) {
		// Actor compendiums directly inside this folder
		const packsInFolder = game.packs.filter(p => p.folder?.id === folder.id && p.documentName === "Actor");
		packs.push(...packsInFolder);

		// Recursive call for each subfolder
		for (const child of folder.children) this.#collectActorPacksInSidebarFolder(child.folder, packs);
	}

	//* Get Sumary Data
	/**
	 * Recursively collects all documents in a folder and its subfolders and returns
	 * a summary of their selection state and valid actor count.
	 * Delegates document collection to {@link #collectFolderEntries}.
	 * @param {Folder} folder - The folder to analyze.
	 * @returns {{ isSelected: boolean, validCount: number }} Returns { isSelected: false, validCount: 0 } if the folder has no valid actors.
	 * @private
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
	 * Returns summary data for a compendium pack: whether all its valid actors are selected.
	 * Only works if the compendium is already in cache; returns { isSelected: false } otherwise,
	 * since loading the documents would require an async operation outside this context.
	 * @param {CompendiumCollection} pack - The compendium pack to analyze.
	 * @returns {{ isSelected: boolean }}
	 * @private
	 */
	#getCompendiumSummaryData(pack) {
		if (!this.#compendiumDocsCache.has(pack.collection)) return { isSelected: false };
		const cachedDocs = this.#compendiumDocsCache.get(pack.collection);
		const validDocs = cachedDocs.filter(doc => this.#isValidEntry(doc));
		if (validDocs.length === 0) return { isSelected: false };
		const isSelected = validDocs.every(doc => this.#selectedActors.some(a => a.uuid === doc.uuid));
		return { isSelected };
	}

	/**
	 * Returns summary data for a folder inside a compendium: whether all its valid actors are selected.
	 * Requires the compendium documents and folders to already be loaded (pre-loaded via #getCompendiumDocuments).
	 * @param {Folder} folder - The compendium folder to analyze.
	 * @param {Array} allDocs - All documents from the compendium (pre-loaded).
	 * @param {Collection} allFolders - All folders from the compendium (pre-loaded).
	 * @returns {{ isSelected: boolean }}
	 * @private
	 */
	#getCompendiumFolderSummaryData(folder, allDocs, allFolders) {
		const entries = [];
		this.#collectFolderEntries(folder, entries, allDocs, allFolders);
		const validEntries = entries.filter(entry => this.#isValidEntry(entry.data));
		if (validEntries.length === 0) return { isSelected: false };
		const isSelected = validEntries.every(entry => this.#selectedActors.some(a => a.uuid === entry.uuid));
		return { isSelected };
	}

	/**
	 * Returns summary data for a sidebar folder: whether all its valid actors (across all its Actor compendiums) are selected.
	 * Only works if all Actor compendiums inside the folder are already in the cache.
	 * If any compendium is not cached yet, returns { isSelected: false }.
	 * @param {Folder} folder - The sidebar folder to analyze.
	 * @returns {{ isSelected: boolean }}
	 * @private
	 */
	#getCompendiumSidebarFolderSummaryData(folder) {
		// Collect all Actor compendiums inside the folder (recursively)
		const packs = [];
		this.#collectActorPacksInSidebarFolder(folder, packs);

		// No Actor compendiums found, nothing to select
		if (packs.length === 0) return { isSelected: false };

		// If any compendium is not yet cached, the selection state cannot be determined
		if (packs.some(pack => !this.#compendiumDocsCache.has(pack.collection))) return { isSelected: false };

		// Collect all valid actors from every cached compendium in the folder
		const allValidDocs = packs.flatMap(pack => {
			const cachedDocs = this.#compendiumDocsCache.get(pack.collection);
			return cachedDocs.filter(doc => this.#isValidEntry(doc));
		});

		if (allValidDocs.length === 0) return { isSelected: false };

		const isSelected = allValidDocs.every(doc => this.#selectedActors.some(a => a.uuid === doc.uuid));
		return { isSelected };
	}

	//* Tree Nav & Breadcrumb
	/**
	 * Builds a nested tree of Actor sidebar folders for the tree navigation panel.
	 * Each root folder is mapped to a node object; children are built recursively via the internal {@link buildNode} function.
	 * @returns {{ id: string, name: string|null, color: string|null, nodeType: string, isCurrent: boolean, children: Array }[]} Array of root folder nodes, each potentially containing nested children.
	 * @private
	 */
	#buildNestedTreeForActors() {
		const currentLocationId = this.#currentLocationOnActorsTab.at(-1)?.id ?? null;

		/**
		 * Recursively builds a tree node for the given folder and all of its descendants.
		 * @param {Folder} folder - The Foundry folder to build a node for.
		 * @returns {{ id: string, name: string, color: string|null, nodeType: string, isCurrent: boolean, children: Array }} The folder node with its nested children.
		 */
		const buildNode = (folder) => ({
			id: folder.id,
			name: folder.name,
			color: folder.color ?? null,
			nodeType: "folder",
			isCurrent: folder.id === currentLocationId,
			children: folder.children.map(child => buildNode(child.folder))
		});

		return game.folders
			.filter(f => f.type === "Actor" && !f.folder)
			.map(buildNode);
	}

	/**
	 * Builds a nested tree of sidebar compendium folders, compendium packs, and compendium internal folders
	 * for the tree navigation sidebar in the Compendiums tab.
	 * Uses three mutually recursive inner functions to handle the three distinct node types:
	 * sidebar folders, compendium packs, and compendium internal folders.
	 * @returns {{ id: string, name: string, color: string|null, nodeType: string, isCompendium: boolean, isCurrent: boolean, children: Array }[]} Array of root nodes (sidebar folders without a parent and loose compendiums at the root level).
	 * @private
	 */
	#buildNestedTreeForCompendiums() {
		// Determine the ID of the current location to mark the active node in the tree
		const currentLocationId = (() => {
			const location = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
			if (!location) return null;
			// ? Compendiums are identified by .collection (string), folders by .id
			return (typeof location.collection === "string") ? location.collection : location.id;
		})();

		/**
		 * Builds a tree node for a sidebar compendium folder.
		 * Recursively includes sidebar subfolders and compendium packs nested within it.
		 * @param {Folder} folder - The sidebar folder to build a node for.
		 * @returns {{ id: string, name: string, color: string|null, nodeType: string, isCompendium: boolean, isCurrent: boolean, children: Array }} The folder node with its nested children.
		 */
		const buildSidebarFolderNode = (folder) => ({
			id: folder.id,
			name: folder.name,
			color: folder.color ?? null,
			nodeType: "folder",
			isCompendium: false,
			isCurrent: folder.id === currentLocationId,
			children: [
				// ? Sidebar subfolders first, then compendium packs inside this folder
				...folder.children.map(child => buildSidebarFolderNode(child.folder)), // Recursive call: each child sidebar folder becomes a nested node
				...game.packs
					.filter(p => p.folder?.id === folder.id && p.documentName === "Actor")
					.map(buildPackNode)
			]
		});

		/**
		 * Builds a tree node for a compendium pack.
		 * Its children are the root-level folders inside the compendium (those without a parent folder).
		 * @param {CompendiumCollection} pack - The compendium pack to build a node for.
		 * @returns {{ id: string, name: string, color: null, nodeType: string, isCompendium: boolean, isCurrent: boolean, children: Array }} The compendium node with its nested children.
		 */
		const buildPackNode = (pack) => ({
			id: pack.collection,
			name: pack.metadata.label,
			color: null,
			nodeType: "compendium",
			isCompendium: true,
			isCurrent: pack.collection === currentLocationId,
			children: pack.folders
				.filter(f => f.folder === null)  // ? Only root-level folders of the compendium (those without a parent folder)
				.map(buildCompendiumFolderNode)
		});

		/**
		 * Builds a tree node for a folder inside a compendium.
		 * Recursively includes subfolders nested within it.
		 * @param {Folder} folder - The compendium folder to build a node for.
		 * @returns {{ id: string, name: string, color: string|null, nodeType: string, isCompendium: boolean, isCurrent: boolean, children: Array }} The folder node with its nested children.
		 */
		const buildCompendiumFolderNode = (folder) => ({
			id: folder.id,
			name: folder.name,
			color: folder.color ?? null,
			nodeType: "folder",
			isCompendium: false,
			isCurrent: folder.id === currentLocationId,
			children: folder.children.map(child => buildCompendiumFolderNode(child.folder)) // Recursive call: each child compendium folder becomes a nested node
		});

		// ? Root: sidebar folders without a parent folder + loose compendium packs at the root level
		return [
			...game.folders
				.filter(f => f.type === "Compendium" && !f.folder)
				.map(buildSidebarFolderNode),
			...game.packs
				.filter(p => !p.folder && p.documentName === "Actor")
				.map(buildPackNode)
		];
	}

	/**
	 * Builds the full breadcrumb path for the Actors tab from the root down to the given folder.
	 * Traverses the folder hierarchy upward via the .folder parent reference,
	 * prepending each ancestor to the array so the result is ordered from root to target.
	 * @param {Folder} folder - The target folder to build the path to.
	 * @returns {Folder[]} Array of folders ordered from the root ancestor down to the target folder.
	 * @private
	 */
	#buildActorBreadcrumbPath(folder) {
		const path = [];
		let current = folder;
		while (current) {
			path.unshift(current);		// ? Info: .unshift is used because the array is filled from the last element to the first: from the given folder up to the root
			current = current.folder;	// ? .folder is the parent folder. If null, the folder is already at the root (not contained in any other folder).
		}
		return path;

		// Example: given the folder located at "/ Hoenn / Fire / Babies" (the Babies folder),
		// the array is built as follows: [Babies] → [Fire, Babies] → [Hoenn, Fire, Babies]
		// It fills from the given folder up to the root, prepending each parent folder one by one.
	}

	/**
	 * Builds the full navigation path array for the Compendiums tab given a node ID and type from the tree nav.
	 * Handles three cases: (1) a compendium pack, where the path is simply [pack]; (2) a sidebar folder,
	 * where the path is built by traversing .folder ancestors up to the root; and (3) a compendium folder,
	 * where the path is built the same way but with the parent pack prepended at the start.
	 * @param {string} nodeId   - The node identifier: the collection string for packs, or the folder ID for folders.
	 * @param {string} nodeType - The node type: "compendium" for packs, "folder" for sidebar or compendium folders.
	 * @returns {Array|null} The navigation path array, or null if the node could not be found.
	 * @private
	 */
	#buildCompendiumBreadcrumbPath(nodeId, nodeType) {
		// Case 1: Compendium pack
		// We know it is a pack because nodeType is explicitly "compendium".
		// A pack can be loose at the sidebar root or nested inside sidebar folders.
		// To build the full path, we traverse pack.folder (its sidebar parent folder) upward
		// until we reach the root (folder === null), then append the pack itself at the end.
		if (nodeType === "compendium") {
			const pack = game.packs.get(nodeId);
			if (!pack) return null;

			const path = [];
			let currentFolder = pack.folder ?? null;
			while (currentFolder) {
				path.unshift(currentFolder);
				currentFolder = currentFolder.folder;
			}
			path.push(pack);
			return path;
		}

		// Case 2 or 3: Folder
		// nodeType is "folder", but we do not yet know whether it is a sidebar folder
		// or a folder inside a compendium (both share the same nodeType).
		// We try game.folders first: sidebar folders are registered there; compendium folders are not.
		const sidebarFolder = game.folders.get(nodeId);

		if (sidebarFolder) {
			// Case 2: Sidebar folder
			// Found in game.folders, so it is a sidebar folder.
			// Traverse .folder ancestors upward until the root (folder === null).
			// No pack needs to be prepended because sidebar folders are top-level navigation nodes.
			const path = [];
			let current = sidebarFolder;
			while (current) {
				path.unshift(current);
				current = current.folder;
			}
			return path;
		}

		// Case 3: Compendium folder
		// Not found in game.folders, so by elimination it must be a folder inside a compendium.
		// We search all packs to find which one owns this folder ( pack.folders.get(nodeId) ).
		// Then we traverse .folder ancestors upward until the compendium root (folder === null inside the pack).
		// After that, we prepend the pack itself, and then traverse the pack's sidebar folder ancestors
		// (pack.folder) upward, because the pack itself may be nested inside sidebar folders.
		const pack = game.packs.find(p => p.folders.get(nodeId));
		if (!pack) return null;

		const compendiumFolder = pack.folders.get(nodeId);

		// Traverse compendium folder ancestors up to the compendium root
		const compendiumPath = [];
		let current = compendiumFolder;
		while (current) {
			compendiumPath.unshift(current);
			current = current.folder;
		}

		// Traverse sidebar folder ancestors of the pack (same logic as Case 1)
		const sidebarPath = [];
		let currentFolder = pack.folder ?? null;
		while (currentFolder) {
			sidebarPath.unshift(currentFolder);
			currentFolder = currentFolder.folder;
		}

		return [...sidebarPath, pack, ...compendiumPath];
	}

	/**
	 * Returns the "readable name" of the source of a compendium (world, system, or module).
	 * @param {Pack} compendium - The compendium from which to obtain the source name.
	 * @returns {string} The readable name of the source.
	 * @private
	 */
	#getSourceName (compendium) {
		const { packageType, packageName } = compendium.metadata;
		if (packageType === "world") return "World" 	// game.world.title;
		if (packageType === "system") return "D&D5e" 	// game.system.title;
		if (packageType === "module") return game.modules.get(packageName)?.title ?? packageName;
	}

	/**
	 * Recursively builds the path of a Compendium-type sidebar folder chain.
	 * @param {Folder|null} folder - The sidebar folder, or null if at root.
	 * @returns {string} The path up to and including this folder.
	 * @private
	 */
	#buildSidebarFolderPath (folder) {
		const separator = ">";
		if (!folder) return "Compendiums Tab";
		return `${this.#buildSidebarFolderPath(folder.folder)} ${separator} ${folder.name}`;
	}

	/**
	 * Builds the root path for a compendium with its source: "Compendiums Tab / [Source] Label".
	 * @param {Pack} compendium - The compendium for which to build the root path.
	 * @returns {string} The root path of the compendium.
	 * @private
	 */
	#buildCompendiumRootPath (compendium) {
		const separator = ">";
		const sidebarPath = this.#buildSidebarFolderPath(compendium.folder ?? null);
		return `${sidebarPath} ${separator} [${this.#getSourceName(compendium)}] ${compendium.metadata.label}`;
	}

	/**
	 * Recursively builds the full path of a folder, including its parent folders (and compendium if applicable).
	 * The path is built in the format "Compendiums (or Actors) Tab / [Source] Compendium Label (if applicable) / Parent Folder / Subfolder".
	 * @param {Folder} folder - The folder for which to build the path.
	 * @returns {string} The full path of the folder.
	 * @private
	 */
	#buildFolderPath (folder) {
		const separator = ">";

		// Recursion:
		// if the folder has a parent folder, build the path of the parent first, then add the current folder name at the end.
		if (folder.folder) {
			const parentPath = this.#buildFolderPath(folder.folder);
			return `${parentPath} ${separator} ${folder.name}`;
		}

		// Recursion End 1:
		// if the folder doesn't have a parent, check if it's in a compendium (has pack property).
		// If it's in a compendium, the root of the path is the compendium name.
		if (folder.pack) {
			const compendium = game.packs.get(folder.pack);
			return `${this.#buildCompendiumRootPath(compendium)} ${separator} ${folder.name}`;
		}

		// Recursion End 2:
		// if the folder doesn't have a parent and is not in a compendium,
		// it's a folder in the Actors tab, so the root of the path is "Actors Tab".
		else {
			return `Actors Tab ${separator} ${folder.name}`;
		}
	}

	//* Dialogs
	/** @type {foundry.applications.api.DialogV2|null} Active confirmation or warning dialog, if any. */
	#activeDialog = null;

	/**
	 * Displays a confirmation dialog when the user attempts to select a large number of actors.
	 * Used to warn the user before triggering a potentially slow bulk-selection operation.
	 * If another dialog is already open, it is closed before this one is shown.
	 * @param {string}              label   - Display name of the source (e.g. folder or compendium name).
	 * @param {number}              count   - Number of entries or valid actors to display in the dialog.
	 * @param {"entries"|"valid"}   variant - Dialog variant:
	 *   "entries" → total entry count is known but validity is not (first load warning).
	 *   "valid"   → exact number of valid actors is already known (confirmation warning).
	 * @returns {Promise<boolean>} Resolves to true if the user confirms, false if they cancel or close the dialog.
	 */
	async #showTooManyActorsDialog(label, count, variant) {
		// Close any previously open dialog before showing this one
		if (this.#activeDialog) await this.#activeDialog.close();

		const isFirstLoad = variant === "entries";
		const content = isFirstLoad
			? `
				<p style="margin:0;text-align:center;">
					${label} has <span style="text-decoration:underline;">${count}</span> entries in total.
				</p>
				<p style="margin:0;text-align:center;margin-top:-10px;">
					The first load may take several minutes. Do you want to continue?
				</p>
			`
			: `
				<p style="margin:0;text-align:center;">
					${label} contains <span style="text-decoration:underline;">${count}</span> valid actors.
				</p>
				<p style="margin:0;text-align:center;margin-top:-10px;">
					Adding them may take several minutes. Do you want to continue?
				</p>
			`;

		const { promise, resolve } = Promise.withResolvers();

		const dialog = new foundry.applications.api.DialogV2({
			window: { title: "Too many actors" },
			content,
			buttons: [
				{
					action: "confirm",
					label: isFirstLoad ? "Continue" : "Confirm",
					icon: "fa-solid fa-check",
					default: true,
					callback: () => resolve("confirm")
				},
				{
					action: "cancel",
					label: "Cancel",
					icon: "fa-solid fa-xmark",
					callback: () => resolve("cancel")
				}
			]
		});

		this.#activeDialog = dialog;
		dialog.addEventListener("close", () => resolve(null), { once: true });
		dialog.render({ force: true });

		const result = await promise;
		this.#activeDialog = null;
		return Boolean(result && result !== "cancel");
	}

	/**
	 * Displays a warning dialog when the user attempts to navigate into a large compendium that has not yet been cached.
	 * Offers the option to enter the compendium within the app or open it from the sidebar instead.
	 * If another dialog is already open, it is closed before this one is shown.
	 * @param {CompendiumCollection} pack - The compendium pack to display the warning for.
	 * @returns {Promise<"enter"|"sidebar"|null>} Resolves to "enter" to navigate in, "sidebar" to open from the sidebar,
	 *   or null if the dialog was closed without choosing.
	 */
	async #showLargeCompendiumDialog(pack) {
		// Close any previously open dialog before showing this one
		if (this.#activeDialog) await this.#activeDialog.close();

		const { promise, resolve } = Promise.withResolvers();

		const dialog = new foundry.applications.api.DialogV2({
			window: { title: "Large Compendium" },
			content: `
				<p style="margin:0;text-align:center;">
					The compendium "${pack.metadata.label}" has <span style="text-decoration:underline;">${pack.index.size}</span> entries.
				</p>
				<p style="margin:0;text-align:center;margin-top:-13px;">
					The first load may take several minutes.
				</p>
				<p style="margin:0;text-align:center;margin-top:5px;">
					Do you still want to navigate inside the compendium?
				</p>
			`,
			buttons: [
				{
					action: "enter",
					label: "Enter the compendium",
					icon: "fa-solid fa-door-open",
					default: true,
					callback: () => resolve("enter")
				},
				{
					action: "sidebar",
					label: "Open from the sidebar",
					icon: "fa-solid fa-book-atlas",
					callback: () => resolve("sidebar")
				}
			]
		});

		this.#activeDialog = dialog;
		dialog.addEventListener("close", () => resolve(null), { once: true });
		dialog.render({ force: true });

		const result = await promise;
		this.#activeDialog = null;
		return result;
	}

	//* ApplicationV2 Lifecycle Overrides
	/**
	 * Called when the application is closed.
	 * Deregisters the Foundry hooks registered in the constructor to prevent memory leaks:
	 * hooks persist globally even after the app is closed, and a new one is registered each time
	 * a new instance is opened, so they must be explicitly removed here.
	 * Also clears the compendium documents cache.
	 * @param {Object} options - Additional options for closing.
	 * @returns {Promise<void>}
	 * @override
	 */
	async _onClose(options) {
		await super._onClose(options);
		Hooks.off("renderBaseActorSheet", this.#renderedActorHookIdForRemoveSpinner); // En cuanto se cierra la app hay que borrar el hook porque si no se sigue ejecutando incluso aunque la app esté cerrada. Y se pueden acumular porque se crea uno nuevo cada vez que se abre una nueva app. Esto es para evitar memory leaks.
		Hooks.off("renderCompendium", this.#renderedCompendiumHookIdForRemoveSpinner);
		this.#renderedActorHookIdForRemoveSpinner = null;
		this.#renderedCompendiumHookIdForRemoveSpinner = null;
		this.#compendiumDocsCache.clear();
	}

	/**
	 * Handles the drop event on the drop zone.
	 * Supports dropping individual Actors, Folders (sidebar or compendium, with or without nested compendiums),
	 * and Compendium packs.
	 * Before activating the loading spinner, pre-loads the dropped folder or compendium and shows a confirmation
	 * dialog if the estimated number of valid entries meets or exceeds the large-drop threshold.
	 * @param {DragEvent} event - The drag event triggered on drop.
	 * @returns {Promise<void>}
	 * @override
	 */
	async _handleDrop(event) {
		let entries = [];
		let addedCount = 0;
		const data = TextEditor.implementation.getDragEventData(event);

		// Debug logs
		pk5eLog("pk5e (npc hp fixer): Dropped Data", data);


		// Confirmation dialog
		const LARGE_THRESHOLD = 100;
		let showFirstLoadDialog = false;
		let showConfirmDialog = false;
		let dialogCount = 0;
		let dialogLabel = "";

		// Pre-load the folder or compendium before the spinner (needed for the dialog and reused inside the try block)
		let preloadedFolder = null;
		let preloadedCompendium = null;

		if (data.type === "Folder") {
			preloadedFolder = await fromUuid(data.uuid);

			if (preloadedFolder.type === "Compendium") {
				// Case A: Sidebar folder containing compendiums
				const allPacks = [];
				this.#collectActorPacksInSidebarFolder(preloadedFolder, allPacks);
				if (allPacks.length > 0) {
					const allCached = allPacks.every(p => this.#compendiumDocsCache.has(p.collection));
					if (allCached) {
						const validDocs = allPacks.flatMap(p => this.#compendiumDocsCache.get(p.collection)).filter(d => this.#isValidEntry(d));
						if (validDocs.length >= LARGE_THRESHOLD) { showConfirmDialog = true; dialogCount = validDocs.length; }
					} else {
						const totalIndexSize = allPacks.reduce((sum, p) => sum + p.index.size, 0);
						if (totalIndexSize >= LARGE_THRESHOLD) { showFirstLoadDialog = true; dialogCount = totalIndexSize; }
					}
					dialogLabel = `The folder "${preloadedFolder.name}"`;
				}

			} else {
				// Case B: Document folder (from the sidebar or from a compendium)
				const isFromCompendium = Boolean(preloadedFolder.pack);
				if (isFromCompendium) {
					const compendium = game.packs.get(preloadedFolder.pack);
					if (this.#compendiumDocsCache.has(compendium.collection)) {
						const tempEntries = [];
						this.#collectFolderEntries(preloadedFolder, tempEntries, this.#compendiumDocsCache.get(compendium.collection), compendium.folders);
						const validEntries = tempEntries.filter(e => this.#isValidEntry(e.data));
						if (validEntries.length >= LARGE_THRESHOLD) { showConfirmDialog = true; dialogCount = validEntries.length; }
					} else if (compendium.index.size >= LARGE_THRESHOLD) {
						showFirstLoadDialog = true;
						dialogCount = compendium.index.size;
					}
				} else {
					const tempEntries = [];
					this.#collectFolderEntries(preloadedFolder, tempEntries);
					const validEntries = tempEntries.filter(e => this.#isValidEntry(e.data));
					if (validEntries.length >= LARGE_THRESHOLD) { showConfirmDialog = true; dialogCount = validEntries.length; }
				}
				dialogLabel = `The folder "${preloadedFolder.name}"`;
			}

		} else if (data.type === "Compendium") {
			preloadedCompendium = game.packs.get(data.collection);
			if (this.#compendiumDocsCache.has(preloadedCompendium.collection)) {
				const validDocs = this.#compendiumDocsCache.get(preloadedCompendium.collection).filter(d => this.#isValidEntry(d));
				if (validDocs.length >= LARGE_THRESHOLD) { showConfirmDialog = true; dialogCount = validDocs.length; }
			} else if (preloadedCompendium.index.size >= LARGE_THRESHOLD) {
				showFirstLoadDialog = true;
				dialogCount = preloadedCompendium.index.size;
			}
			dialogLabel = `The compendium "${preloadedCompendium.metadata.label}"`;
		}

		// data.type === "Actor": always a single actor, never needs a dialog

		if (showFirstLoadDialog) {
			const confirmed = await this.#showTooManyActorsDialog(dialogLabel, dialogCount, "entries");
			if (!confirmed) return;

		} else if (showConfirmDialog) {
			const confirmed = await this.#showTooManyActorsDialog(dialogLabel, dialogCount, "valid");
			if (!confirmed) return;
		}

		// Loading State ON
		this.#toggleLoading(true);
		await new Promise(resolve => setTimeout(resolve, 0)); // Allow time for the spinner to render in synchronous cases

		try {
			// * Folder Dropped
			if (data.type === "Folder") {
				const folder = preloadedFolder; // Pre-loaded before the dialog

				// Case A: A folder that contains compendiums
				if (folder.type === "Compendium") {
					await this.#collectFolderWithCompendiumsEntries(folder, entries);

				// Case B: A folder that contains docs and subfolders, but no compendiums
				// Can be from the sidebar or from a compendium; the method handles both cases
				} else {
					const isFromCompendium = Boolean(folder.pack);

					// When the folder is from a compendium, pre-load all documents and folders
					// from that compendium to correctly build the container paths of the entries
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
				const compendium = preloadedCompendium; // Pre-loaded before the dialog
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
				ui.notifications.warn(`Document type "${data.type}" is not supported. Only actors, folders, and compendiums containing actors can be added.`);
			}

			pk5eLog("pk5e (npc hp fixer): Entries collected", entries);
			addedCount = this.#processAndAddEntries(entries);
			pk5eLog(`pk5e (npc hp fixer): ${addedCount} actor(s) added from drop`);

		} catch (error) {
			ui.notifications.error("An error occurred while processing the drop. Check the console for details.");
			console.error("Error processing drop:", error);

		} finally {
			// Loading State OFF
			this.#toggleLoading(false);
			await this.render({ parts: ["footer"] });
			if (addedCount > 0) this.#animateCounter();
		}
	}

	/**
	 * Called before the application is rendered.
	 * Saves the current scroll position of the tree navigation sidebar ({@link #treeNavScrollTop})
	 * so it can be restored in {@link _onRender} after the re-render replaces the DOM.
	 * @param {Object} context - The rendering context.
	 * @param {Object} options - Additional options for rendering.
	 * @returns {Promise<void>}
	 * @override
	 */
	async _preRender(context, options) {
		await super._preRender(context, options);
		const treeNav = this.element?.querySelector(".tree-content");
		if (treeNav) this.#treeNavScrollTop = treeNav.scrollTop;
	}

	/**
	 * Called when the application is rendered.
	 * Currently used to set up drag and drop event listeners on the drop zone, allowing actors, folders, and compendiums to be dragged and dropped into the app for selection.
	 * @param {Object} context - The rendering context.
	 * @param {Object} options - Additional options for rendering.
	 * @override
	 */
	_onRender(context, options) {
		super._onRender(context, options);
		const contentWasRerendered = !options.parts || options.parts.includes("content");
		const footerWasRerendered = !options.parts || options.parts.includes("footer");

		//* Expand/collapse footer summary panel
		if (footerWasRerendered && this.#currentView === this.#VIEWS.ACTORS_SELECTION) {
			const expandButton = this.element.querySelector(".expand-summary-button");
			const summaryHeader = this.element.querySelector(".summary-header");

			// Toggle by clicking the button
			expandButton?.addEventListener("click", () => {
				this.#toggleFooterSummary();
			});

			// Toggle by clicking the header
			summaryHeader?.addEventListener("click", (event) => {
				if (event.target.closest("button")) return;
				this.#toggleFooterSummary();
			});

			//* Remove actor from summary panel
			const hiddenSummary = this.element.querySelector(".hidden-summary");
			hiddenSummary?.addEventListener("click", (event) => {
				const removeButton = event.target.closest(".remove-button");
				if (!removeButton) return;

				const uuid = removeButton.dataset.uuid;

				// Find the entry before removing it (needed for the notification message)
				const removedEntry = this.#selectedActors.find(a => a.uuid === uuid);
				pk5eLog(`pk5e (npc hp fixer): Actor "${removedEntry?.name}" removed from summary panel`, { uuid });


				// Remove from the data array
				this.#selectedActors = this.#selectedActors.filter(a => a.uuid !== uuid);

				// Remove the card from the DOM directly (avoids collapsing the panel via re-render)
				hiddenSummary.querySelector(`.summary-card[data-uuid="${uuid}"]`)?.remove();

				// Update the counter number in the true-footer
				const numberElement = this.element.querySelector(".current-counter-container .number");
				if (numberElement) numberElement.textContent = this.#selectedActors.length;

				// Update the summary header title
				const summaryTitle = hiddenSummary.querySelector(".summary-header .title");
				if (summaryTitle) summaryTitle.textContent = `Selected Pokémon (${this.#selectedActors.length})`;

				// Show the empty state if no actors remain
				if (this.#selectedActors.length === 0) {
					const summaryList = hiddenSummary.querySelector(".summary-list");
					summaryList?.classList.add("empty");
					const emptyDiv = document.createElement("div");
					emptyDiv.className = "summary-empty";
					emptyDiv.innerHTML = `<i class="icon fa-duotone fa-solid fa-user-slash"></i><span class="text">No pokémon selected yet</span>`;
					summaryList?.appendChild(emptyDiv);
				}

				ui.notifications.info(`"${removedEntry?.name}" removed from selected actors.`);
				this.render({ parts: ["content"] });
				this.#animateCounter();
			});

			//* Actor sheet open (click on summary card)
			hiddenSummary?.addEventListener("click", (event) => {
				// Ignore clicks on the remove button
				if (event.target.closest(".remove-button")) return;

				const summaryCard = event.target.closest(".summary-card");
				if (!summaryCard) return;

				// Ignore if already loading
				if (summaryCard.classList.contains("loading")) return;

				const uuid = summaryCard.dataset.uuid;
				summaryCard.classList.add("loading");
				this.#loadingActorSheetsOnApp.set(uuid, summaryCard); // Stores the actor item element in the map of items awaiting their sheet render (spinner is active while waiting)

				fromUuidSync(uuid)?.sheet.render(true);
				pk5eLog(`pk5e (npc hp fixer): Opening actor sheet from summary panel`, { uuid });
			});

			//* Clear all actors from summary panel
			const clearAllButton = hiddenSummary?.querySelector(".clear-all-button");
			clearAllButton?.addEventListener("click", () => {
				if (this.#selectedActors.length === 0) return;

				const removedCount = this.#selectedActors.length;
				this.#selectedActors = [];
				pk5eLog(`pk5e (npc hp fixer): Cleared all actors from summary panel (${removedCount} removed).`);

				// Clear all cards from the DOM directly (avoids collapsing the panel via re-render)
				const summaryList = hiddenSummary.querySelector(".summary-list");
				summaryList?.querySelectorAll(".summary-card").forEach(card => card.remove());
				summaryList?.classList.add("empty");

				// Show the empty state
				const emptyDiv = document.createElement("div");
				emptyDiv.className = "summary-empty";
				emptyDiv.innerHTML = `<i class="icon fa-duotone fa-solid fa-user-slash"></i><span class="text">No pokémon selected yet</span>`;
				summaryList?.appendChild(emptyDiv);

				// Update the counter number in the true-footer
				const numberElement = this.element.querySelector(".current-counter-container .number");
				if (numberElement) numberElement.textContent = 0;

				// Update the summary header title
				const summaryTitle = hiddenSummary.querySelector(".summary-header .title");
				if (summaryTitle) summaryTitle.textContent = `Selected Pokémon (0)`;

				ui.notifications.info(`${removedCount} ${removedCount === 1 ? "entry" : "entries"} removed.`);
				this.render({ parts: ["content"] });
				this.#animateCounter();
			});
		}

		//* Review and Process View: Remove actor and open sheet
		if (contentWasRerendered && this.#currentView === this.#VIEWS.REVIEW_AND_PROCESS) {
			const confirmationList = this.element.querySelector(".confirmation-list");

			//* Remove actor from confirmation list
			confirmationList?.addEventListener("click", (event) => {
				const removeButton = event.target.closest(".remove-button");
				if (!removeButton) return;

				const uuid         = removeButton.dataset.uuid;
				const removedEntry = this.#selectedActors.find(a => a.uuid === uuid);
				pk5eLog(`pk5e (npc hp fixer): Actor "${removedEntry?.name}" removed from confirmation view`, { uuid });

				// Remove from the data array
				this.#selectedActors = this.#selectedActors.filter(a => a.uuid !== uuid);

				// If no actors remain, go back to the selection view
				if (this.#selectedActors.length === 0) {
					this.#currentView = this.#VIEWS.ACTORS_SELECTION;
					this.render();
					return;
				}

				// Remove the card from the DOM directly
				confirmationList.querySelector(`.summary-card[data-uuid="${uuid}"]`)?.remove();

				// Update the actor count in the title and the confirm button
				this.element.querySelectorAll(".review-and-process-view .actor-count").forEach(el => {
					el.textContent = this.#selectedActors.length;
				});

				ui.notifications.info(`"${removedEntry?.name}" removed from selected actors.`);
			});

			//* Actor sheet open (click on summary card)
			confirmationList?.addEventListener("click", (event) => {
				// Ignore clicks on the remove button
				if (event.target.closest(".remove-button")) return;

				const summaryCard = event.target.closest(".summary-card");
				if (!summaryCard) return;

				// Ignore if already loading
				if (summaryCard.classList.contains("loading")) return;

				const uuid = summaryCard.dataset.uuid;
				summaryCard.classList.add("loading");
				this.#loadingActorSheetsOnApp.set(uuid, summaryCard); // Stores the actor item element in the map of items awaiting their sheet render (spinner is active while waiting)

				fromUuidSync(uuid)?.sheet.render(true);
				pk5eLog(`pk5e (npc hp fixer): Opening actor sheet from confirmation view`, { uuid });
			});
		}

		//* Result View: Actor sheet open (click on group item)
		if (contentWasRerendered && this.#currentView === this.#VIEWS.RESULT) {
			const resultGroups = this.element.querySelector(".result-groups");
			resultGroups?.addEventListener("click", (event) => {
				const groupItem = event.target.closest(".group-item[data-uuid]");
				if (!groupItem) return;

				// Ignore if already loading
				if (groupItem.classList.contains("loading")) return;

				const uuid = groupItem.dataset.uuid;
				groupItem.classList.add("loading");
				this.#loadingActorSheetsOnApp.set(uuid, groupItem); // Stores the actor item element in the map of items awaiting their sheet render (spinner is active while waiting)

				fromUuidSync(uuid)?.sheet.render(true);
				pk5eLog(`pk5e (npc hp fixer): Opening actor sheet from result view`, { uuid });
			});
		}

		//* Restore the search bar input value from #searchQuery after content re-renders,
		//* since the DOM replacement clears the input's previous value.
		if (contentWasRerendered && ( this.isTheActiveTab(this.#TABS.ACTORS) || this.isTheActiveTab(this.#TABS.COMPENDIUMS) )) {
			const searchBar = this.element.querySelector(".search-bar");
			if (searchBar) searchBar.value = this.#searchQuery;
		}

		//* Search bar filtering
		if (contentWasRerendered && ( this.isTheActiveTab(this.#TABS.ACTORS) || this.isTheActiveTab(this.#TABS.COMPENDIUMS) )) {
			const searchBar = this.element.querySelector(".search-bar");
			searchBar?.addEventListener("input", (event) => {
				this.#searchQuery = event.target.value;
				const query = this.#searchQuery.toLowerCase().trim();

				// Filtering works by toggling CSS display:none on item containers
				// whose names do not match the current search query
				const content = this.element.querySelector(".selection-pane .content");
				content?.querySelectorAll(".item-container").forEach(itemContainer => {
					const nameHtmlElement = itemContainer.querySelector(".item .name span");
					const itemName = nameHtmlElement?.textContent?.toLowerCase() ?? "";
					itemContainer.style.display = (!query || itemName.includes(query)) ? "" : "none";
				});
			});
		}

		//* Drag and Drop highlighting
		if ( this.isTheActiveTab(this.#TABS.DROP) ) {
			const dropZone = this.element.querySelector(".drop-zone");

			// Drag Over
			dropZone?.addEventListener("dragover", (event) => {
				event.preventDefault();
				dropZone.classList.add("highlight");
			});

			// Drag Leave
			dropZone?.addEventListener("dragleave", (event) => {
				// Avoid removing the highlight class when hovering over a child of the drop zone
				if ( dropZone.contains(event.relatedTarget) ) return;
				dropZone.classList.remove("highlight");
			});

			// Drop
			dropZone?.addEventListener("drop", (event) => {
				dropZone.classList.remove("highlight");
			});

			//* Set Drag and Drop Handler
			new DragDrop({
				dropSelector: ".drop-zone",
				callbacks: { drop: this._handleDrop.bind(this) }
			}).bind(this.element);
		}

		//* Folder navigation (enter folder on click) for Actors Tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("click", (event) => {
				// Ignore clicks on the checkbox
				if (event.target.classList.contains("check-button")) return;

				const folderItem = event.target.closest(".folder-item");
				if (!folderItem) return;

				const folder = game.folders.get(folderItem.dataset.nodeId);
				if (!folder) return;

				this.#currentLocationOnActorsTab.push(folder);
				this.#searchQuery = "";
				this.render({ parts: ["content"] });
				pk5eLog(`pk5e (npc hp fixer): Navigated into folder "${folder.name}" (Actors tab).`);
			});
		}

		//* Folder/Compendium navigation (enter folder/compendium on click) for Compendiums tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.COMPENDIUMS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("click", async (event) => {
				// Ignore clicks on the checkbox
				if (event.target.classList.contains("check-button")) return;

				const folderItem = event.target.closest(".folder-item");
				if (!folderItem) return;

				const nodeId   = folderItem.dataset.nodeId;
				const nodeType = folderItem.dataset.nodeType;

				let node;

				if (nodeType === "compendium") {
					// It's a compendium: nodeId is the collection string
					node = game.packs.get(nodeId);

					// Warning dialog if the compendium is large and not yet cached
					const LARGE_COMPENDIUM_THRESHOLD = 100;
					if (node && !this.#compendiumDocsCache.has(nodeId) && node.index.size >= LARGE_COMPENDIUM_THRESHOLD) {
						const result = await this.#showLargeCompendiumDialog(node);

						if (!result) return;  // Closed without choosing

						if (result === "sidebar") {
							game.packs.get(nodeId)?.render(true);
							return;  // Do not navigate inside the app
						}

						// If result === "enter", continue with navigation normally
					}

				} else {
					// It's a folder: can be from the sidebar or from a compendium.
					// Use the current location to infer which collection to look it up in.
					const location             = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
					const isAtCompendium       = typeof location?.collection === "string";
					const isAtCompendiumFolder = !isAtCompendium && Boolean(location?.pack);

					if (isAtCompendium) {
						// Inside a compendium: folders are root-level compendium folders
						node = location.folders.get(nodeId);
					} else if (isAtCompendiumFolder) {
						// Inside a compendium folder: subfolders also belong to the compendium
						const pack = game.packs.get(location.pack);
						node = pack?.folders.get(nodeId);
					} else {
						// At root or inside a sidebar folder: folders belong to the sidebar
						node = game.folders.get(nodeId);
					}
				}

				if (!node) return;

				this.#currentLocationOnCompendiumsTab.push(node);
				pk5eLog(`pk5e (npc hp fixer): Navigated into ${nodeType} "${nodeId}" (Compendiums tab).`);

				this.#searchQuery = "";
				this.#toggleLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0));
				await this.render({ parts: ["content"] });
				this.#toggleLoading(false);
			});
		}

		//* Breadcrumb navigation
		if (contentWasRerendered && (this.isTheActiveTab(this.#TABS.ACTORS) || this.isTheActiveTab(this.#TABS.COMPENDIUMS))) {
			const currentRoute = this.element.querySelector(".selection-pane .current-route");
			currentRoute?.addEventListener("click", async (event) => {
				const segment = event.target.closest(".breadcrumb-segment[data-breadcrumb-index]");
				if (!segment) return;

				const index = parseInt(segment.dataset.breadcrumbIndex);
				const isActorsTab = this.isTheActiveTab(this.#TABS.ACTORS);

				// Capture destination name before modifying the array
				const locationArray = isActorsTab ? this.#currentLocationOnActorsTab : this.#currentLocationOnCompendiumsTab; // ? Read-only reference: Used only to check .length; private fields cannot be reassigned through a local variable
				const destinationName = index === -1
					? "root"
					: (locationArray[index]?.name ?? locationArray[index]?.metadata?.label ?? `index ${index}`);

				if (index === -1) {
					// Navigate to root (ignore if already there)
					if (locationArray.length === 0) return;
					if (isActorsTab) this.#currentLocationOnActorsTab = [];
					else this.#currentLocationOnCompendiumsTab = [];
				} else {
					// Navigate to a specific point in the breadcrumb (slice up to and including that index)
					if (isActorsTab) this.#currentLocationOnActorsTab = this.#currentLocationOnActorsTab.slice(0, index + 1);
					else this.#currentLocationOnCompendiumsTab = this.#currentLocationOnCompendiumsTab.slice(0, index + 1);
				}

				pk5eLog(`pk5e (npc hp fixer): Breadcrumb navigated to "${destinationName}" (${isActorsTab ? "Actors" : "Compendiums"} tab).`);

				this.#searchQuery = "";
				if (!isActorsTab) {
					this.#toggleLoading(true);
					await new Promise(resolve => setTimeout(resolve, 0));
					await this.render({ parts: ["content"] });
					this.#toggleLoading(false);
				} else {
					this.render({ parts: ["content"] });
				}
			});
		}

		//* Actor sheet open (click on actor) for Actors & Compendiums Tab
		if (contentWasRerendered && ( this.isTheActiveTab(this.#TABS.ACTORS) || this.isTheActiveTab(this.#TABS.COMPENDIUMS) )) {
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
				this.#loadingActorSheetsOnApp.set(uuid, actorItem); // Stores the actor item element in the map of items awaiting their sheet render (spinner is active while waiting)

				fromUuidSync(uuid)?.sheet.render(true);
				pk5eLog(`pk5e (npc hp fixer): Opening actor sheet from explorer`, { uuid });
			});
		}

		//* Invalid section toggle
		if (contentWasRerendered && ( this.isTheActiveTab(this.#TABS.ACTORS) || this.isTheActiveTab(this.#TABS.COMPENDIUMS) )) {
			const invalidHeader = this.element.querySelector(".selection-pane .invalid-section-header");
			invalidHeader?.addEventListener("click", () => {
				invalidHeader.closest(".invalid-section").classList.toggle("expanded");
				const isExpanded = invalidHeader.closest(".invalid-section").classList.contains("expanded");
				pk5eLog(`pk5e (npc hp fixer): Invalid section ${isExpanded ? "expanded" : "collapsed"}`);
			});
		}

		//* Invalid compendium open (click on invalid compendium) for Compendiums Tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.COMPENDIUMS)) {
			const invalidContent = this.element.querySelector(".selection-pane .invalid-content");
			invalidContent?.addEventListener("click", (event) => {
				const invalidCompendiumItem = event.target.closest(".invalid-compendium-item");
				if (!invalidCompendiumItem) return;
				if (event.target.classList.contains("check-button")) return;
				if (event.target.classList.contains("lock-icon")) return;
				if (invalidCompendiumItem.classList.contains("loading")) return; // Already loading

				const collection = invalidCompendiumItem.dataset.nodeId;

				invalidCompendiumItem.classList.add("loading");
				this.#loadingCompendiumsOnExplorer.set(collection, invalidCompendiumItem); // Stores the collection in the map of items awaiting their compendium render (spinner is active while waiting)

				game.packs.get(collection)?.render(true);
				pk5eLog(`pk5e (npc hp fixer): Opening invalid compendium from explorer`, { collection });
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
    				pk5eLog(`pk5e (npc hp fixer): Actor "${actor.name}" selected (Actors tab)`, { uuid });
				} else {
					this.#selectedActors = this.#selectedActors.filter(a => a.uuid !== uuid);
    				pk5eLog(`pk5e (npc hp fixer): Actor deselected (Actors tab)`, { uuid });
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

				const folder = game.folders.get(folderItem.dataset.nodeId);
				if (!folder) return;

				const isChecked = event.target.checked;
				const validActorCount = parseInt(folderItem.dataset.validActorCount) || 0;

				// Confirmation dialog and loading spinner for folders with many actors
				const LARGE_ACTORS_THRESHOLD = 100;
				if (isChecked && validActorCount >= LARGE_ACTORS_THRESHOLD) {
					const result = await this.#showTooManyActorsDialog(`The folder "${folder.name}"`, validActorCount, "valid");

					if (!result || result === "cancel") {
						event.target.checked = !isChecked; // Revert the checkbox state if the user cancels
						return;
					}

					this.#toggleLoading(true);
					await new Promise(resolve => setTimeout(resolve, 0)); // Allow time for the spinner to render in synchronous cases
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
    					pk5eLog(`pk5e (npc hp fixer): Folder "${folder.name}" selected. ${addedCount} actor(s) added (Actors tab).`);
					} else {
						// Remove all actors from the folder (and subfolders)
						const uuidsToRemove = new Set(entries.map(e => e.uuid));
						const previousCount = this.#selectedActors.length;
						this.#selectedActors = this.#selectedActors.filter(a => !uuidsToRemove.has(a.uuid));
						const removedCount = previousCount - this.#selectedActors.length;
						if (removedCount > 0) {
							ui.notifications.info(`${removedCount} ${removedCount === 1 ? "entry" : "entries"} removed.`);
							shouldAnimateFooterCounter = true;
						}
    					pk5eLog(`pk5e (npc hp fixer): Folder "${folder.name}" deselected. ${removedCount} actor(s) removed (Actors tab).`);

					}
				} catch (error) {
					ui.notifications.error("An error occurred while processing the folder. Check the console for details.");
					console.error("Error processing folder checkbox:", error);
				} finally {
					this.#toggleLoading(false);
					this.render({ parts: ["footer"] }); // Update the footer counter
					if (shouldAnimateFooterCounter) this.#animateCounter();
    				if (isChecked) event.target.checked = true; // Re-check if the operation completed after a stale revert
				}
			});
		}

		//* Actor checkbox toggle (for Compendiums tab)
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.COMPENDIUMS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("change", (event) => {
				if (!event.target.classList.contains("check-button")) return;
				const actorItem = event.target.closest(".actor-item");
				if (!actorItem) return;

				const uuid = actorItem.dataset.uuid;

				if (event.target.checked) {
					if (this.#selectedActors.some(a => a.uuid === uuid)) return;
					const actor = fromUuidSync(uuid);
					const pack  = game.packs.get(actor.pack);
					const containerPath = actor.folder
						? this.#buildFolderPath(actor.folder)
						: this.#buildCompendiumRootPath(pack);
					this.#selectedActors.push({ name: actor.name, uuid, containerPath, data: actor });
					pk5eLog(`pk5e (npc hp fixer): Actor "${actor.name}" selected (Compendiums tab)`, { uuid });
				} else {
					this.#selectedActors = this.#selectedActors.filter(a => a.uuid !== uuid);
					pk5eLog(`pk5e (npc hp fixer): Actor deselected (Compendiums tab)`, { uuid });
				}

				this.render({ parts: ["footer"] });
				this.#animateCounter();
			});
		}

		//* Folder/compendium checkbox toggle (for Compendiums tab)
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.COMPENDIUMS)) {
			const content = this.element.querySelector(".selection-pane .content");
			content?.addEventListener("change", async (event) => {
				if (!event.target.classList.contains("check-button")) return;
				const folderItem = event.target.closest(".folder-item");
				if (!folderItem) return;

				const nodeId    = folderItem.dataset.nodeId;
				const nodeType  = folderItem.dataset.nodeType;
				const isChecked = event.target.checked;

				// Confirmation Dialog for large folders/compendiums
				const LARGE_THRESHOLD = 100;
				if (isChecked) {
					const location             = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
					const isAtCompendium       = typeof location?.collection === "string";
					const isAtCompendiumFolder = !isAtCompendium && Boolean(location?.pack);

					let showFirstLoadDialog = false;
					let showConfirmDialog   = false;
					let dialogCount         = 0;
					let dialogLabel         = "";

					if (nodeType === "compendium") {
						const pack = game.packs.get(nodeId);
						if (pack) {
							if (!this.#compendiumDocsCache.has(nodeId) && pack.index.size >= LARGE_THRESHOLD) {
								showFirstLoadDialog = true;
								dialogCount = pack.index.size;
								dialogLabel = `The compendium "${pack.metadata.label}"`;
							} else if (this.#compendiumDocsCache.has(nodeId)) {
								const cachedDocs = this.#compendiumDocsCache.get(nodeId);
								const validCount = cachedDocs.filter(d => this.#isValidEntry(d)).length;
								if (validCount >= LARGE_THRESHOLD) {
									showConfirmDialog = true;
									dialogCount = validCount;
									dialogLabel = `The compendium "${pack.metadata.label}"`;
								}
							}
						}

					} else { // nodeType === "folder"
						if (isAtCompendium || isAtCompendiumFolder) {
							// Folder inside a compendium: the parent compendium is always cached
							const pack   = isAtCompendium ? location : game.packs.get(location.pack);
							const folder = pack?.folders.get(nodeId);
							if (pack && folder) {
								const allDocs     = this.#compendiumDocsCache.get(pack.collection);
								const tempEntries = [];
								this.#collectFolderEntries(folder, tempEntries, allDocs, pack.folders);
								const validCount = tempEntries.filter(e => this.#isValidEntry(e.data)).length;
								if (validCount >= LARGE_THRESHOLD) {
									showConfirmDialog = true;
									dialogCount = validCount;
									dialogLabel = `The folder "${folder.name}"`;
								}
							}
						} else {
							// Sidebar folder: sum the index.size of all actor compendiums inside
							const sidebarFolder = game.folders.get(nodeId);
							if (sidebarFolder) {
								const allPacks = [];
								this.#collectActorPacksInSidebarFolder(sidebarFolder, allPacks);
								const allCached = allPacks.every(p => this.#compendiumDocsCache.has(p.collection));

								if (allCached && allPacks.length > 0) {
									const validCount = allPacks.reduce((sum, p) => {
										const cachedDocs = this.#compendiumDocsCache.get(p.collection);
										return sum + cachedDocs.filter(d => this.#isValidEntry(d)).length;
									}, 0);
									if (validCount >= LARGE_THRESHOLD) {
										showConfirmDialog = true;
										dialogCount = validCount;
										dialogLabel = `The folder "${sidebarFolder.name}"`;
									}
								} else {
									const totalIndexSize = allPacks.reduce((sum, p) => sum + p.index.size, 0);
									if (totalIndexSize >= LARGE_THRESHOLD) {
										showFirstLoadDialog = true;
										dialogCount = totalIndexSize;
										dialogLabel = `The folder "${sidebarFolder.name}"`;
									}
								}
							}
						}
					}

					if (showFirstLoadDialog) {
						const confirmed = await this.#showTooManyActorsDialog(dialogLabel, dialogCount, "entries");
						if (!confirmed) {
							event.target.checked = !isChecked;
							return;
						}
					} else if (showConfirmDialog) {
						const confirmed = await this.#showTooManyActorsDialog(dialogLabel, dialogCount, "valid");
						if (!confirmed) {
							event.target.checked = !isChecked;
							return;
						}
					}
				}

				// Early return: if unchecking a source that has not been cached yet,
				// no actors from it can be in the selection, so nothing to remove.
				if (!isChecked) {
					if (nodeType === "compendium") {
						const pack = game.packs.get(nodeId);
						if (pack && !this.#compendiumDocsCache.has(pack.collection)) return;

					} else if (nodeType === "folder") {
						const location             = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
						const isAtCompendium       = typeof location?.collection === "string";
						const isAtCompendiumFolder = !isAtCompendium && Boolean(location?.pack);

						if (!isAtCompendium && !isAtCompendiumFolder) {
							// Sidebar folder: if none of its packs are cached, nothing to remove
							const sidebarFolder = game.folders.get(nodeId);
							if (sidebarFolder) {
								const allPacks = [];
								this.#collectActorPacksInSidebarFolder(sidebarFolder, allPacks);
								if (allPacks.every(p => !this.#compendiumDocsCache.has(p.collection))) return;
							}
						}
						// For compendium folders (isAtCompendium or isAtCompendiumFolder),
						// the parent compendium is always cached when navigating inside it, proceed normally.
					}
				}

				// Always show spinner, no exceptions (no pre-calculated validCount for compendiums)
				this.#toggleLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0));

				// ? Info: Unlike the Actors tab (where each folder has a pre-calculated validCount),
				// ? in Compendiums we don't have that information upfront: the compendium index only
				// ? contains basic data (id, name, img...) and does not allow checking whether actors
				// ? are valid without loading the full documents via getDocuments(). That's why the
				// ? spinner is always activated.

				const entries = [];
				let shouldAnimateFooterCounter = false;

				try {
					if (nodeType === "compendium") {
						// It's a compendium: collect all its documents recursively
						const pack = game.packs.get(nodeId);
						if (!pack) return;
						await this.#collectCompendiumEntries(pack, entries);

					} else {
						// It's a folder: can be from the sidebar or from a compendium.
						// Use the current location to infer the type (same logic as in the navigation listener).
						const location             = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
						const isAtCompendium       = typeof location?.collection === "string";
						const isAtCompendiumFolder = !isAtCompendium && Boolean(location?.pack);

						if (isAtCompendium) {
							// Root folder of the current compendium
							const folder = location.folders.get(nodeId);
							if (!folder) return;
							const allCompendiumDocs    = await this.#getCompendiumDocuments(location);
							const allCompendiumFolders = location.folders;
							this.#collectFolderEntries(folder, entries, allCompendiumDocs, allCompendiumFolders);

						} else if (isAtCompendiumFolder) {
							// Subfolder inside a compendium
							const pack   = game.packs.get(location.pack);
							const folder = pack?.folders.get(nodeId);
							if (!folder) return;
							const allCompendiumDocs    = await this.#getCompendiumDocuments(pack);
							const allCompendiumFolders = pack.folders;
							this.#collectFolderEntries(folder, entries, allCompendiumDocs, allCompendiumFolders);

						} else {
							// Sidebar folder (contains compendiums, not actors directly)
							const folder = game.folders.get(nodeId);
							if (!folder) return;
							await this.#collectFolderWithCompendiumsEntries(folder, entries);
						}
					}

					// Empty folder/compendium: do nothing (the finally block will turn off the spinner)
					const hasValidEntries = entries.some(e => this.#isValidEntry(e.data));
					if (!hasValidEntries) return;

					if (isChecked) {
						// Add all valid actors
						const addedCount = this.#processAndAddEntries(entries);
	    				pk5eLog(`pk5e (npc hp fixer): ${nodeType} "${nodeId}" selected. ${addedCount} actor(s) added (Compendiums tab).`);
						if (addedCount > 0) shouldAnimateFooterCounter = true;
					} else {
						// Remove all actors from the folder/compendium
						const uuidsToRemove = new Set(entries.map(e => e.uuid));
						const previousCount = this.#selectedActors.length;
						this.#selectedActors = this.#selectedActors.filter(a => !uuidsToRemove.has(a.uuid));
						const removedCount = previousCount - this.#selectedActors.length;
    					pk5eLog(`pk5e (npc hp fixer): ${nodeType} "${nodeId}" deselected. ${removedCount} actor(s) removed (Compendiums tab).`);
						if (removedCount > 0) {
							ui.notifications.info(`${removedCount} ${removedCount === 1 ? "entry" : "entries"} removed.`);
							shouldAnimateFooterCounter = true;
						}
					}

				} catch (error) {
					ui.notifications.error("An error occurred while processing the folder/compendium. Check the console for details.");
					console.error("Error processing folder/compendium checkbox:", error);
				} finally {
					this.#toggleLoading(false);
					this.render({ parts: ["footer"] }); // Update the footer counter
					if (shouldAnimateFooterCounter) this.#animateCounter();
    				if (isChecked) event.target.checked = true; // Re-check if the operation completed after a stale revert
				}
			});
		}

		//* Select All button for Actors Tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const selectAllBtn = this.element.querySelector(".select-all-button");
			selectAllBtn?.addEventListener("click", async () => {

				// Calculate entries synchronously (before the dialog and the spinner)
				const location = this.#currentLocationOnActorsTab.at(-1) ?? null;
				const entries = [];

				// Inside a folder
				if (location) {
					this.#collectFolderEntries(location, entries);

				// At the root of the tab
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

				// Confirmation dialog (only when selecting, not when deselecting)
				const LARGE_ACTORS_THRESHOLD = 100;
				if (!areAllEntriesAlreadySelected && validEntries.length >= LARGE_ACTORS_THRESHOLD) {
					const dialogLabel = location ? `The folder "${location.name}"` : `The Actors Sidebar Tab`;
					const confirmed = await this.#showTooManyActorsDialog(dialogLabel, validEntries.length, "valid");
					if (!confirmed) return;
				}

				// Loading spinner (after the dialog)
				this.#toggleLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0)); // Allow time for the spinner to render in synchronous cases

				let shouldAnimateFooterCounter = false;

				try {
					const content = this.element.querySelector(".selection-pane .content");

					if (areAllEntriesAlreadySelected) {
						// Deselect all
						const previousCount = this.#selectedActors.length;
						const uuidsToRemove = new Set(validEntries.map(e => e.uuid));                                    // ? Info: A Set is used to leverage the .has() method, which is far more efficient for existence checks than iterating with .some() over an array
						this.#selectedActors = this.#selectedActors.filter(a => !uuidsToRemove.has(a.uuid));             // ? This filter is much faster than working with the original validEntries array; since this app may handle a large number of elements, efficiency is critical.
						const removedCount = previousCount - this.#selectedActors.length;
						if (removedCount > 0) {
							ui.notifications.info(`${removedCount} ${removedCount === 1 ? "entry" : "entries"} removed.`);
							shouldAnimateFooterCounter = true;
						}
    					pk5eLog(`pk5e (npc hp fixer): Select All (Actors tab). Deselected ${removedCount} actor(s).`);
						content?.querySelectorAll(".check-button:not(:disabled)").forEach(cb => cb.checked = false);
					} else {
						// Select the remaining ones
						const addedCount = this.#processAndAddEntries(entries);
    					pk5eLog(`pk5e (npc hp fixer): Select All (Actors tab). Added ${addedCount} actor(s).`);
						content?.querySelectorAll(".check-button:not(:disabled)").forEach(cb => cb.checked = true);
						if (addedCount > 0) shouldAnimateFooterCounter = true;
					}

				} catch (error) {
					ui.notifications.error("An error occurred while selecting all. Check the console for details.");
					console.error("Error selecting all:", error);
				} finally {
					this.#toggleLoading(false);
					this.render({ parts: ["footer"] });
					if (shouldAnimateFooterCounter) this.#animateCounter();
				}
			});
		}

		//* Select All button for Compendiums tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.COMPENDIUMS)) {
			const selectAllBtn = this.element.querySelector(".select-all-button");
			selectAllBtn?.addEventListener("click", async () => {
				// Location constants (calculated before the spinner, needed for the dialog)
				const location             = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
				const isAtRoot             = location === null;
				const isAtCompendium       = typeof location?.collection === "string";
				const isAtCompendiumFolder = !isAtCompendium && Boolean(location?.pack);

				// Confirmation Dialog
				const LARGE_THRESHOLD = 100;
				let showFirstLoadDialog = false;
				let showConfirmDialog   = false;
				let dialogCount         = 0;
				let dialogLabel         = "";

				if (isAtCompendium) {
					if (!this.#compendiumDocsCache.has(location.collection) && location.index.size >= LARGE_THRESHOLD) {
						// Not cached: we cannot know how many are valid or whether all are already selected
						showFirstLoadDialog = true;
						dialogCount = location.index.size;
						dialogLabel = `The compendium "${location.metadata.label}"`;
					} else if (this.#compendiumDocsCache.has(location.collection)) {
						const cachedDocs = this.#compendiumDocsCache.get(location.collection);
						const validDocs  = cachedDocs.filter(d => this.#isValidEntry(d));
						const areAllAlreadySelected = validDocs.length > 0 && validDocs.every(d => this.#selectedActors.some(a => a.uuid === d.uuid));
						if (!areAllAlreadySelected && validDocs.length >= LARGE_THRESHOLD) {
							showConfirmDialog = true;
							dialogCount = validDocs.length;
							dialogLabel = `The compendium "${location.metadata.label}"`;
						}
					}

				} else if (isAtCompendiumFolder) {
					// The parent compendium is always cached (it was necessarily loaded when navigating into it)
					const pack = game.packs.get(location.pack);
					if (pack && this.#compendiumDocsCache.has(pack.collection)) {
						const cachedDocs  = this.#compendiumDocsCache.get(pack.collection);
						const tempEntries = [];
						this.#collectFolderEntries(location, tempEntries, cachedDocs, pack.folders);
						const validEntries = tempEntries.filter(e => this.#isValidEntry(e.data));
						const areAllAlreadySelected = validEntries.length > 0 && validEntries.every(e => this.#selectedActors.some(a => a.uuid === e.uuid));
						if (!areAllAlreadySelected && validEntries.length >= LARGE_THRESHOLD) {
							showConfirmDialog = true;
							dialogCount = validEntries.length;
							dialogLabel = `The folder "${location.name}"`;
						}
					}
				} else if (!isAtRoot) {
					// isAtSidebarFolder: sidebar folder containing compendiums
					const allPacks = [];
					this.#collectActorPacksInSidebarFolder(location, allPacks);

					if (allPacks.length > 0) {
						const allCached = allPacks.every(p => this.#compendiumDocsCache.has(p.collection));

						if (allCached) {
							const validDocs = allPacks.flatMap(p => this.#compendiumDocsCache.get(p.collection)).filter(d => this.#isValidEntry(d));
							const areAllAlreadySelected = validDocs.length > 0 && validDocs.every(d => this.#selectedActors.some(a => a.uuid === d.uuid));
							if (!areAllAlreadySelected && validDocs.length >= LARGE_THRESHOLD) {
								showConfirmDialog = true;
								dialogCount = validDocs.length;
								dialogLabel = `The folder "${location.name}"`;
							}
						} else {
							const totalIndexSize = allPacks.reduce((sum, p) => sum + p.index.size, 0);
							if (totalIndexSize >= LARGE_THRESHOLD) {
								showFirstLoadDialog = true;
								dialogCount = totalIndexSize;
								dialogLabel = `The folder "${location.name}"`;
							}
						}
					}

				} else {
					// isAtRoot: root of the compendiums sidebar
					const allPacks = [];
					const rootSidebarFolders = game.folders.filter(f => f.type === "Compendium" && !f.folder);
					for (const folder of rootSidebarFolders) this.#collectActorPacksInSidebarFolder(folder, allPacks);
					const rootPacks = game.packs.filter(p => !p.folder && p.documentName === "Actor");
					allPacks.push(...rootPacks);

					if (allPacks.length > 0) {
						const allCached = allPacks.every(p => this.#compendiumDocsCache.has(p.collection));

						if (allCached) {
							const validDocs = allPacks.flatMap(p => this.#compendiumDocsCache.get(p.collection)).filter(d => this.#isValidEntry(d));
							const areAllAlreadySelected = validDocs.length > 0 && validDocs.every(d => this.#selectedActors.some(a => a.uuid === d.uuid));
							if (!areAllAlreadySelected && validDocs.length >= LARGE_THRESHOLD) {
								showConfirmDialog = true;
								dialogCount = validDocs.length;
								dialogLabel = `The Compendiums Sidebar Tab`;
							}
						} else {
							const totalIndexSize = allPacks.reduce((sum, p) => sum + p.index.size, 0);
							if (totalIndexSize >= LARGE_THRESHOLD) {
								showFirstLoadDialog = true;
								dialogCount = totalIndexSize;
								dialogLabel = `The Compendiums Sidebar Tab`;
							}
						}
					}
				}

				if (showFirstLoadDialog) {
					const confirmed = await this.#showTooManyActorsDialog(dialogLabel, dialogCount, "entries");
					if (!confirmed) return;
				} else if (showConfirmDialog) {
					const confirmed = await this.#showTooManyActorsDialog(dialogLabel, dialogCount, "valid");
					if (!confirmed) return;
				}

				// Loading spinner
				this.#toggleLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0)); // Allow time for the spinner to render in synchronous cases

				const entries = [];
				let shouldAnimateFooterCounter = false;

				try {
					if (isAtRoot) {
						// Collect from all sidebar folders of type Compendium + all actor packs without a folder
						const rootSidebarFolders = game.folders.filter(f => f.type === "Compendium" && !f.folder);
						for (const folder of rootSidebarFolders) await this.#collectFolderWithCompendiumsEntries(folder, entries);
						const rootPacks = game.packs.filter(p => !p.folder && p.documentName === "Actor");
						for (const pack of rootPacks) await this.#collectCompendiumEntries(pack, entries);

					} else if (isAtCompendium) {
						// Collect all actors from the compendium
						await this.#collectCompendiumEntries(location, entries);

					} else if (isAtCompendiumFolder) {
						// Collect actors from the compendium folder
						const pack                 = game.packs.get(location.pack);
						const allCompendiumDocs    = await this.#getCompendiumDocuments(pack);
						const allCompendiumFolders = pack.folders;
						this.#collectFolderEntries(location, entries, allCompendiumDocs, allCompendiumFolders);

					} else {
						// isAtSidebarFolder: sidebar folder containing compendiums
						await this.#collectFolderWithCompendiumsEntries(location, entries);
					}

					const validEntries = entries.filter(e => this.#isValidEntry(e.data));
					const areAllEntriesAlreadySelected = (validEntries.length > 0)
						&& validEntries.every(e => this.#selectedActors.some(a => a.uuid === e.uuid));
					const content = this.element.querySelector(".selection-pane .content");

					if (areAllEntriesAlreadySelected) {
						// Deselect all
						const previousCount  = this.#selectedActors.length;
						const uuidsToRemove  = new Set(validEntries.map(e => e.uuid));
						this.#selectedActors = this.#selectedActors.filter(a => !uuidsToRemove.has(a.uuid));
						const removedCount   = previousCount - this.#selectedActors.length;
    					pk5eLog(`pk5e (npc hp fixer): Select All (Compendiums tab). Deselected ${removedCount} actor(s).`);
						if (removedCount > 0) {
							ui.notifications.info(`${removedCount} ${removedCount === 1 ? "entry" : "entries"} removed.`);
							shouldAnimateFooterCounter = true;
						}
						content?.querySelectorAll(".check-button:not(:disabled)").forEach(cb => cb.checked = false);
					} else {
						// Select the remaining ones
						const addedCount = this.#processAndAddEntries(entries);
    					pk5eLog(`pk5e (npc hp fixer): Select All (Compendiums tab). Added ${addedCount} actor(s).`);
						content?.querySelectorAll(".check-button:not(:disabled)").forEach(cb => cb.checked = true);
						if (addedCount > 0) shouldAnimateFooterCounter = true;
					}

				} catch (error) {
					ui.notifications.error("An error occurred while selecting all. Check the console for details.");
					console.error("Error selecting all:", error);
				} finally {
					this.#toggleLoading(false);
					this.render({ parts: ["footer"] });
					if (shouldAnimateFooterCounter) this.#animateCounter();
				}
			});
		}

		//* Tree nav navigation for Actors Tab
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.ACTORS)) {
			const treeNav = this.element.querySelector(".tree-nav");
			treeNav?.addEventListener("click", (event) => {
				const treeNode = event.target.closest(".tree-node");
				if (!treeNode) return;

				const nodeId = treeNode.dataset.nodeId;

				if (!nodeId) {
					// Click on the root node
					if (this.#currentLocationOnActorsTab.length === 0) return;
					this.#currentLocationOnActorsTab = [];
    				pk5eLog(`pk5e (npc hp fixer): Tree nav navigated to root (Actors tab).`);
				} else {
					// Click on a folder node
					if (this.#currentLocationOnActorsTab.at(-1)?.id === nodeId) return; // Already there: the user clicked on the folder they are currently in
					const folder = game.folders.get(nodeId);
					if (!folder) return;
					this.#currentLocationOnActorsTab = this.#buildActorBreadcrumbPath(folder);
    				pk5eLog(`pk5e (npc hp fixer): Tree nav navigated to folder "${folder.name}" (Actors tab).`);
				}

				this.#searchQuery = "";
				this.render({ parts: ["content"] });
			});
		}

		//* Tree nav navigation (Compendiums tab)
		if (contentWasRerendered && this.isTheActiveTab(this.#TABS.COMPENDIUMS)) {
			const treeNav = this.element.querySelector(".tree-nav");
			treeNav?.addEventListener("click", async (event) => {
				const treeNode = event.target.closest(".tree-node");
				if (!treeNode) return;

				const nodeId   = treeNode.dataset.nodeId;
				const nodeType = treeNode.dataset.nodeType;

				if (!nodeId) {
					// Click on the root node
					if (this.#currentLocationOnCompendiumsTab.length === 0) return;
					this.#currentLocationOnCompendiumsTab = [];
    				pk5eLog(`pk5e (npc hp fixer): Tree nav navigated to root (Compendiums tab).`);
				} else {
					// Check if we are already at that node (to avoid unnecessary re-renders)
					const currentLocation = this.#currentLocationOnCompendiumsTab.at(-1) ?? null;
					const currentId = (typeof currentLocation?.collection === "string")
						? currentLocation.collection
						: currentLocation?.id ?? null;
					if (currentId === nodeId) return;

					// Warning Dialog
					// Determine which compendium is about to be loaded
					const LARGE_COMPENDIUM_THRESHOLD = 100;
					let packToCheck = null;

					if (nodeType === "compendium") {
						packToCheck = game.packs.get(nodeId);
					} else if (nodeType === "folder") {
						// Find the pack that owns this folder
						const ownerPack = game.packs.find(p => p.folders.get(nodeId));
						if (ownerPack) packToCheck = ownerPack;
					}

					if (packToCheck && !this.#compendiumDocsCache.has(packToCheck.collection) && packToCheck.index.size >= LARGE_COMPENDIUM_THRESHOLD) {
						const result = await this.#showLargeCompendiumDialog(packToCheck);

						if (!result) return;  // Closed without choosing

						if (result === "sidebar") {
							packToCheck.render(true);
							return;  // Do not navigate inside the app
						}

						// If result === "enter", continue with navigation normally
					}

					// Rebuild the full path up to the clicked node
					const newPath = this.#buildCompendiumBreadcrumbPath(nodeId, nodeType);
					if (!newPath) return;
					this.#currentLocationOnCompendiumsTab = newPath;
    				pk5eLog(`pk5e (npc hp fixer): Tree nav navigated to ${nodeType} "${nodeId}" (Compendiums tab).`);
				}

				this.#searchQuery = "";
				this.#toggleLoading(true);
				await new Promise(resolve => setTimeout(resolve, 0));
				await this.render({ parts: ["content"] });
				this.#toggleLoading(false);
			});
		}

		//* Restore tree nav scroll position after re-render
		const treeNav = this.element.querySelector(".tree-content");
		if (treeNav) treeNav.scrollTop = this.#treeNavScrollTop;
	}

}