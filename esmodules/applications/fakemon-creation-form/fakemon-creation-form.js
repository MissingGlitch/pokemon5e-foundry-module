import { pk5eLog } from '../../utils/logs.js';
import { POKEMON_TYPES } from '../../add-pokemon-system-properties.js';

/**
 * Compendium Item UUIDs for each of the 18 real Pokémon types
 * @type {Record<string, string>}
 */
const POKEMON_TYPE_UUIDS = {
	bug: 'Compendium.pokemon5e.pokemon_features.Item.jK466h0FxTM3E9y5',
	dark: 'Compendium.pokemon5e.pokemon_features.Item.0ImTngm94sacmzTJ',
	dragon: 'Compendium.pokemon5e.pokemon_features.Item.FfnccGLYBrA7nLUv',
	electric: 'Compendium.pokemon5e.pokemon_features.Item.KApdMrKdyXnfJlXr',
	fairy: 'Compendium.pokemon5e.pokemon_features.Item.aMdOEX5MAAQYO8bJ',
	fighting: 'Compendium.pokemon5e.pokemon_features.Item.QITA3C8sih45GhsT',
	fire: 'Compendium.pokemon5e.pokemon_features.Item.VsRkNpmEZBK0UnRf',
	flying: 'Compendium.pokemon5e.pokemon_features.Item.3nxzz6wKLDF8vHaW',
	ghost: 'Compendium.pokemon5e.pokemon_features.Item.0o9rE9bwL8LjsTJZ',
	grass: 'Compendium.pokemon5e.pokemon_features.Item.2AvSLcSmxWltgXLr',
	ground: 'Compendium.pokemon5e.pokemon_features.Item.NhHRsF857B68uGuu',
	ice: 'Compendium.pokemon5e.pokemon_features.Item.kPnmDyxFSBm1BXcI',
	normal: 'Compendium.pokemon5e.pokemon_features.Item.bTlPH8T67LGVEFKp',
	poison: 'Compendium.pokemon5e.pokemon_features.Item.dirLucCtDukMPD9f',
	psychic: 'Compendium.pokemon5e.pokemon_features.Item.MBl4s7HcseRweHMw',
	rock: 'Compendium.pokemon5e.pokemon_features.Item.2kCpMNYPRM45ypE5',
	steel: 'Compendium.pokemon5e.pokemon_features.Item.J187dwFrTXn2B6OY',
	water: 'Compendium.pokemon5e.pokemon_features.Item.cizYNw5DzMXgrGYz'
};

/**
 * Application for creating a new "Fakemon" (homebrew Pokémon) NPC actor from a guided form.
 */
export class FakemonCreationDialog extends dnd5e.applications.api.Dialog5e {
	/**
	 * Default configuration options for the application.
	 * Defines the application's unique ID, CSS classes, window appearance, initial size, form
	 * submission behavior, and the set of data-action handlers used by the template buttons.
	 * @type {ApplicationConfiguration}
	 * @override
	 */
	static DEFAULT_OPTIONS = {
		id: 'pk5e-fakemon-creation-dialog',
		classes: ['pk5e', 'fakemon-creation-dialog'],
		tag: 'form',
		window: {
			title: 'Create Fakemon',
			contentClasses: ['standard-form'],
			contentTag: 'div' // Avoids a nested <form>: the app's own root is already "form" (see "tag"
			// above); without this, Dialog5e's default contentTag: "form" is inherited
			// and we'd end up with a <form> inside another <form> (invalid HTML),
			// confirmed with the real <form> count macro (see context.md, "page reload" bug section).
		},
		position: { width: 640, height: 'auto' },

		/**
		 * Configures how ApplicationV2 handles the HTML form element inside the app.
		 * The handler builds the class item, applies the HP advancement, and creates the actor.
		 * closeOnSubmit is true because, unlike NpcHpFixer, there is no result view to display after
		 * a successful creation (the actor sheet itself is opened instead, see #onSubmit).
		 */
		form: {
			handler: FakemonCreationDialog.#onSubmit,
			submitOnChange: false,
			closeOnSubmit: true
		},

		/**
		 * Footer buttons rendered by the generic form-footer template shared by Dialog5e apps.
		 * type: "submit" makes this a real <button type="submit">, so clicking it triggers the
		 * form's normal submission flow (and therefore form.handler, i.e. #onSubmit) instead of
		 * needing a separate data-action entry in "actions" below.
		 */
		buttons: [
			{
				action: 'submit',
				icon: 'fa-solid fa-check',
				label: 'Create Fakemon',
				type: 'submit'
			}
		],

		/**
		 * Maps data-action attribute values to their handler functions.
		 * ApplicationV2 automatically listens for clicks on any element with data-action="key"
		 * inside the app and calls the corresponding handler. No manual addEventListener needed.
		 */
		actions: {
			openCompendiumPicker: FakemonCreationDialog.#onOpenCompendiumPicker
		}
	};

	/**
	 * Template parts that compose the application's rendered HTML.
	 * Each part maps to a Handlebars template file rendered independently, allowing selective
	 * re-rendering of specific tabs without rebuilding the entire form (e.g. when adding a move level row).
	 * @type {Record<string, HandlebarsTemplatePart>}
	 * @override
	 */
	static PARTS = {
		tabs: { template: 'templates/generic/tab-navigation.hbs' },
		identity: {
			template:
				'modules/pokemon5e/esmodules/applications/fakemon-creation-form/tabs/identity.hbs'
		},
		stats: {
			template:
				'modules/pokemon5e/esmodules/applications/fakemon-creation-form/tabs/stats.hbs'
		},
		features: {
			template:
				'modules/pokemon5e/esmodules/applications/fakemon-creation-form/tabs/features.hbs'
		},
		moves: {
			template:
				'modules/pokemon5e/esmodules/applications/fakemon-creation-form/tabs/moves.hbs'
		},
		evolution: {
			template:
				'modules/pokemon5e/esmodules/applications/fakemon-creation-form/tabs/evolution.hbs'
		},
		footer: { template: 'templates/generic/form-footer.hbs' }
	};

	/**
	 * Currently active tab per tab group.
	 * @type {Record<string, string>}
	 * @override
	 */
	tabGroups = {
		primary: 'identity'
	};

	/**
	 * Current value of the "minLevel" field (stats tab), tracked locally so the "moves" tab can be
	 * re-rendered with the correct set of level rows without needing a full dialog re-render.
	 * @type {number}
	 * @private
	 */
	#minLevel = 1;

	/**
	 * Lookup of every move's display name -> UUID, filled once per render from context.availableMoves,
	 * so #bindMovePickers can resolve what the user typed/selected against the shared <datalist>
	 * without querying the compendium again on every keystroke.
	 * @type {Map<string, string>}
	 * @private
	 */
	#movesByName = new Map();

	/**
	 * Selections made via the CompendiumBrowser picker, keyed by data-field name (e.g. "moves.tm",
	 * "possibleAbilities"), each value a Map<uuid, name>. Kept outside the DOM (unlike the previous
	 * datalist-based #bindMovePickers) because #onOpenCompendiumPicker/#renderPickerTags need to
	 * merge new selections into whatever was already picked across multiple browser openings.
	 * @type {Map<string, Map<string, string>>}
	 * @private
	 */
	#pickerSelections = new Map();

	//* Hit Points Calculation status codes
	/**
	 * Unique Symbol-based status codes returned by #calculateHitPointsAdvancement to indicate whether
	 * a valid per-level HitPointsAdvancement.value map could be produced for the entered stats.
	 * @type {{ OK: symbol, UNCORRECTABLE: symbol }}
	 * @private
	 */
	static #HP_STATUS = {
		OK: Symbol('Fakemon Creation HP Status'), // OK:            A valid advancement.value map was produced for the entered HP/level/hit die/CON combination
		UNCORRECTABLE: Symbol('Fakemon Creation HP Status') // Uncorrectable: Even clamping every level to its minimum of 1 point, the progression already exceeds the entered HP
	};

	/* -------------------------------------------- */
	/*  Context Preparation                         */
	/* -------------------------------------------- */

	/**
	 * Prepare rendering context shared across all parts of the dialog.
	 * Adds the list of available Pokémon types, the default move-learning levels, and the moves/
	 * abilities available for selection (pulled live from the module's compendiums) so the templates
	 * can populate their selects without querying Foundry collections themselves.
	 * @param {HandlebarsRenderOptions} options
	 * @returns {Promise<ApplicationRenderContext>}
	 * @inheritDoc
	 */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.tabs = this._getTabs();
		context.pokemonTypes = POKEMON_TYPES.filter(
			(type) => type !== 'typeless'
		);
		context.moveLevels = Array.from({ length: 20 }, (_, i) => i + 1)
			.filter((level) => level >= this.#minLevel)
			.map((level) => ({
				level,
				label:
					level === this.#minLevel
						? `Starting Moves at Level ${level}`
						: `Moves Learned at Level ${level}`
			}));

		return context;
	}

	/**
	 * Prepare the tab information for the dialog.
	 * @returns {Record<string, Partial<ApplicationTab>>}
	 * @protected
	 */
	_getTabs() {
		const makeTab = (id, icon, label) => ({
			id,
			group: 'primary',
			icon,
			label,
			active: this.tabGroups.primary === id,
			cssClass: this.tabGroups.primary === id ? 'active' : ''
		});
		return {
			identity: makeTab(
				'identity',
				'fa-solid fa-circle-info',
				'Identity'
			),
			stats: makeTab('stats', 'fas fa-dice-d20', 'Stats'),
			features: makeTab('features', 'fas fa-star', 'Features'),
			moves: makeTab('moves', 'fas fa-hand-fist', 'Moves'),
			evolution: makeTab('evolution', 'fa-solid fa-dna', 'Evolution')
		};
	}

	/**
	 * Prepare rendering context for each individual tab part, attaching its own tab metadata
	 * (id, active state, label, icon) under context.tab so the corresponding .hbs template can
	 * render its containing element with the correct data-tab/data-group/active state.
	 * @param {string} partId
	 * @param {ApplicationRenderContext} context
	 * @param {HandlebarsRenderOptions} options
	 * @returns {Promise<ApplicationRenderContext>}
	 * @inheritDoc
	 */
	async _preparePartContext(partId, context, options) {
		context = await super._preparePartContext(partId, context, options);
		if (partId in context.tabs) context.tab = context.tabs[partId];
		return context;
	}

	/**
	 * After every render, (re)attach a live "input" listener on each ability score field so its
	 * paired read-only modifier field updates instantly as the user types, without waiting for a
	 * full actor to be created. Purely cosmetic: the modifier field has no "name" and is never sent
	 * as part of the submitted form data.
	 * @param {ApplicationRenderContext} context
	 * @param {HandlebarsRenderOptions}  options
	 * @returns {Promise<void>}
	 * @inheritDoc
	 */
	async _onRender(context, options) {
		await super._onRender(context, options);

		this.#bindGenderRatioInputs();
		this.#bindEvolutionInputs();
		this.#bindFakemonNamePlaceholder();
		this.#bindEvolutionaryStages();

		this.element
			.querySelectorAll('.pk5e-ability-score')
			.forEach((scoreInput) => {
				const ability = scoreInput.dataset.ability;
				const modInput = this.element.querySelector(
					`.pk5e-ability-mod[data-mod-for="${ability}"]`
				);
				if (!modInput) return;

				const updateMod = () => {
					const score = Number(scoreInput.value) || 0;
					const mod = Math.floor((score - 10) / 2);
					modInput.value = mod >= 0 ? `+${mod}` : `${mod}`;
				};

				scoreInput.addEventListener('input', updateMod);
				updateMod(); // Syncs the displayed modifier with the score's initial value on render.
			});

		// Inserts the visual divider (pokeball) between the tabs nav and the rest of the form,
		// only on the first render (avoids duplicating it on subsequent re-renders).
		const tabsNav = this.element.querySelector(
			'[data-application-part="tabs"]'
		);
		if (
			tabsNav &&
			!tabsNav.nextElementSibling?.classList.contains('ampersand')
		) {
			const divider = document.createElement('hr');
			divider.classList.add('ampersand');
			divider.style.backgroundImage =
				"url('modules/pokemon5e/extras/pokeball.svg')";
			divider.style.filter =
				'invert(64%) sepia(14%) saturate(563%) hue-rotate(3deg) brightness(89%) contrast(90%)';
			divider.style.flexShrink = '0';
			tabsNav.insertAdjacentElement('afterend', divider);
		}
	}

	/* -------------------------------------------- */
	/*  Event Listeners and Handlers                */
	/* -------------------------------------------- */

	/**
	 * Track live changes to "minLevel" (stats tab) so the "moves" tab can be partially re-rendered
	 * to only show level rows from minLevel to 20, without a full dialog re-render.
	 * @inheritDoc
	 */
	_onChangeForm(formConfig, event) {
		super._onChangeForm(formConfig, event);
		if (event.target?.name === 'minLevel') {
			this.#minLevel = Number(event.target.value) || 1;
			this.render({ parts: ['moves'] });
		}
	}

	/**
	 * Keep the read-only "male %" input in sync with the "female %" input, and disable both
	 * whenever the "Has Gender" checkbox is unchecked (genderless Fakemon).
	 */
	#bindGenderRatioInputs() {
		const hasGenderCheckbox =
			this.element.querySelector('.pk5e-has-gender');
		const femaleInput = this.element.querySelector('.pk5e-gender-female');
		const maleInput = this.element.querySelector('.pk5e-gender-male');
		const genderlessInput = this.element.querySelector(
			'.pk5e-gender-genderless'
		);
		const femaleUnit = this.element.querySelector(
			'.pk5e-gender-female-unit'
		);
		const maleUnit = this.element.querySelector('.pk5e-gender-male-unit');
		if (
			!hasGenderCheckbox ||
			!femaleInput ||
			!maleInput ||
			!genderlessInput
		)
			return;

		const syncMale = () => {
			const female = Math.clamp(Number(femaleInput.value) || 0, 0, 100);
			maleInput.value = 100 - female;
		};

		const toggleGenderMode = () => {
			const hasGender = hasGenderCheckbox.checked;

			femaleInput.style.display = hasGender ? '' : 'none';
			maleInput.style.display = hasGender ? '' : 'none';
			femaleInput.disabled = !hasGender;
			maleInput.disabled = true;

			if (femaleUnit) femaleUnit.style.display = hasGender ? '' : 'none';
			if (maleUnit) maleUnit.style.display = hasGender ? '' : 'none';

			genderlessInput.style.display = hasGender ? 'none' : '';
			genderlessInput.disabled = true;
		};

		femaleInput.addEventListener('input', syncMale);
		hasGenderCheckbox.addEventListener('change', toggleGenderMode);

		syncMale();
		toggleGenderMode();
	}

	/**
	 * Toggle the pre-evolution / next-evolution name inputs between editable and a fixed read-only
	 * placeholder ("No Pre-Evolution" / "No Next Evolution") depending on their "Has ..." checkbox.
	 * The optional "introSelector" (only used by next-evolution, which has an extra "<Fakemon> can
	 * evolve into..." label above its textarea) is hidden/shown together with the name field, since
	 * it makes no sense to show the intro text when there is no next evolution to describe.
	 */
	#bindEvolutionInputs() {
		const bindPair = (
			checkboxSelector,
			nameInputSelector,
			noneInputSelector,
			introSelector = null
		) => {
			const checkbox = this.element.querySelector(checkboxSelector);
			const nameInput = this.element.querySelector(nameInputSelector);
			const noneInput = this.element.querySelector(noneInputSelector);
			const introEl = introSelector
				? this.element.querySelector(introSelector)
				: null;
			if (!checkbox || !nameInput || !noneInput) return;

			const toggleEvolutionMode = () => {
				const hasEvolution = checkbox.checked;

				nameInput.style.display = hasEvolution ? '' : 'none';
				nameInput.disabled = !hasEvolution;

				if (introEl) introEl.style.display = hasEvolution ? '' : 'none';

				noneInput.style.display = hasEvolution ? 'none' : '';
				noneInput.disabled = true; // Always read-only.
			};

			checkbox.addEventListener('change', toggleEvolutionMode);
			toggleEvolutionMode();
		};

		bindPair(
			'.pk5e-has-pre-evolution',
			'.pk5e-pre-evolution-name',
			'.pk5e-pre-evolution-none'
		);
		bindPair(
			'.pk5e-has-next-evolution',
			'.pk5e-next-evolution-name',
			'.pk5e-next-evolution-none',
			'.pk5e-evolution-intro'
		);

		// The "Next Evolution" group is stacked in a column (intro text on top, textarea below)
		// instead of the default row layout of ".form-fields", via inline style so the system's
		// .less file doesn't need to be touched.
		const stackedFields = this.element.querySelector(
			'.pk5e-evolution-fields-stacked'
		);
		if (stackedFields) {
			stackedFields.style.flexDirection = 'column';
			stackedFields.style.alignItems = 'stretch';
		}
	}

	/**
	 * Show/hide the "Evolutionary Stages" fieldset depending on whether either evolution checkbox is
	 * checked (an OR condition: pre-evolution alone, next-evolution alone, or both), and (re)build the
	 * "Current Evolutionary Stage" <select> options based on the total stages entered (1 = "Initial
	 * Stage", last = "Final Stage", any stage in between = "Intermediate Stage" if there is only one,
	 * or "Intermediate Stage N" if there are several). Unlike the pre/next evolution fields, this
	 * fieldset's own values don't need special preservation logic -- it's purely hidden/shown via
	 * display, so the browser keeps whatever was typed/selected regardless.
	 */
	#bindEvolutionaryStages() {
		const hasPreCheckbox = this.element.querySelector(
			'.pk5e-has-pre-evolution'
		);
		const hasNextCheckbox = this.element.querySelector(
			'.pk5e-has-next-evolution'
		);
		const stagesGroup = this.element.querySelector(
			'.pk5e-evolutionary-stages-group'
		);
		const totalInput = this.element.querySelector(
			'.pk5e-evolution-stages-total'
		);
		const currentSelect = this.element.querySelector(
			'.pk5e-evolution-stages-current'
		);
		if (
			!hasPreCheckbox ||
			!hasNextCheckbox ||
			!stagesGroup ||
			!totalInput ||
			!currentSelect
		)
			return;

		const rebuildStageOptions = () => {
			const total = Math.max(Number(totalInput.value) || 1, 1);
			const previousValue = Number(currentSelect.value) || 1;

			const labelForStage = (stage) => {
				if (stage === 1) return 'Initial Stage';
				if (stage === total) return 'Final Stage';
				const middleStages = total - 2;
				return middleStages <= 1
					? 'Intermediate Stage'
					: `Intermediate Stage ${stage - 1}`;
			};

			currentSelect.innerHTML = '';
			for (let stage = 1; stage <= total; stage++) {
				const option = document.createElement('option');
				option.value = String(stage);
				option.textContent = `${stage} - ${labelForStage(stage)}`;
				currentSelect.appendChild(option);
			}

			// Keeps the selected stage if it's still valid for the new total; otherwise, defaults to 1.
			currentSelect.value =
				previousValue <= total ? String(previousValue) : '1';
		};

		const toggleStagesVisibility = () => {
			const hasAnyEvolution =
				hasPreCheckbox.checked || hasNextCheckbox.checked;
			stagesGroup.style.display = hasAnyEvolution ? '' : 'none';
		};

		totalInput.addEventListener('input', rebuildStageOptions);
		hasPreCheckbox.addEventListener('change', toggleStagesVisibility);
		hasNextCheckbox.addEventListener('change', toggleStagesVisibility);

		rebuildStageOptions();
		toggleStagesVisibility();
	}

	/**
	 * Keep every "<Fakemon> can evolve into..." placeholder in the evolution tab in sync with the
	 * name typed in the identity tab, live, without waiting for the actor to be created. Falls back
	 * to the literal word "Fakemon" if the name field is left empty.
	 */
	#bindFakemonNamePlaceholder() {
		const nameInput = this.element.querySelector('input[name="name"]');
		const placeholders = this.element.querySelectorAll(
			'.pk5e-fakemon-name-placeholder'
		);
		if (!nameInput || !placeholders.length) return;

		const updatePlaceholders = () => {
			const fakemonName = nameInput.value.trim() || 'Fakemon';
			placeholders.forEach(
				(placeholder) => (placeholder.textContent = fakemonName)
			);
		};

		nameInput.addEventListener('input', updatePlaceholders);
		updatePlaceholders(); // Syncs with the name field's initial value on render.
	}

	/**
	 * Handle clicking any "Browse..." button that opens a CompendiumBrowser multi-selection picker
	 * (used for moves.tm, moves.egg, moves.level.N, possibleAbilities, hiddenAbilities). Resolves the
	 * chosen UUIDs to display names, merges them into the picker's already-selected tags (so opening
	 * the browser again to add more moves doesn't wipe out previous picks), and repaints the tags.
	 * NOTE: selection.max MUST be a truthy number (never null/0) -- CompendiumBrowser#displaySelection
	 * returns `!!min || !!max`, so leaving both at null disables the selection checkboxes entirely
	 * (confirmed empirically in console, see context.md section 11).
	 * @this {FakemonCreationDialog}
	 * @param {PointerEvent} event  Triggering click event.
	 * @param {HTMLElement}  target The button that defined [data-action="openCompendiumPicker"].
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #onOpenCompendiumPicker(event, target) {
		const picker = target.closest('[data-field]');
		const fieldName = picker?.dataset.field;
		const filterType = target.dataset.filterType; // "move" | "ability"
		pk5eLog('pk5e (diagnostic): picker opened', {
			picker,
			fieldName,
			filterType
		});
		if (!picker || !fieldName) return;

		const filters =
			filterType === 'ability'
				? {
						locked: {
							documentClass: 'Item',
							types: new Set(['feat']),
							additional: { subtype: { ability: 1 } }
						}
					}
				: {
						locked: {
							documentClass: 'Item',
							types: new Set(['weapon']),
							additional: { type: { pokemon: 1 } }
						}
					};

		const result = await dnd5e.applications.CompendiumBrowser.select({
			filters,
			selection: { min: null, max: 9999 }
		});
		if (!result) return; // Usuario cerró sin seleccionar nada nuevo.
		pk5eLog(
			'pk5e (diagnostic): raw result from CompendiumBrowser.select()',
			{ fieldName, size: result.size, uuids: Array.from(result) }
		);

		const selected = this.#pickerSelections.get(fieldName) ?? new Map();
		const resolved = await Promise.all(
			Array.from(result).map(async (uuid) => [
				uuid,
				(await fromUuid(uuid))?.name ?? uuid
			])
		);
		resolved.forEach(([uuid, name]) => selected.set(uuid, name));
		pk5eLog(
			'pk5e (diagnostic): accumulated selection for this field after merge',
			{ fieldName, selected: Array.from(selected.entries()) }
		);
		this.#pickerSelections.set(fieldName, selected);

		this.#renderPickerTags(picker, fieldName);
	}

	/**
	 * (Re)paint the removable tags + hidden inputs for a single picker, reading from
	 * #pickerSelections[fieldName]. Mirrors the same tag/hidden-input markup #bindMovePickers used
	 * previously with the datalist approach, so #onSubmit keeps receiving repeated inputs with the
	 * same "name" (collected into an array by FormDataExtended) without any change downstream.
	 * @param {HTMLElement} picker    The ".pk5e-move-picker" (or equivalent) container element.
	 * @param {string}      fieldName The data-field value, used as the "name" of each hidden input.
	 * @private
	 */
	#renderPickerTags(picker, fieldName) {
		const tagsContainer = picker.querySelector('.pk5e-move-picker-tags');
		const selected = this.#pickerSelections.get(fieldName) ?? new Map();
		tagsContainer.innerHTML = '';

		selected.forEach((name, uuid) => {
			const tag = document.createElement('span');
			tag.className = 'tag';
			tag.textContent = name;

			const hidden = document.createElement('input');
			hidden.type = 'hidden';
			hidden.name = fieldName;
			hidden.value = uuid;
			tag.appendChild(hidden);

			const remove = document.createElement('a');
			remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
			remove.addEventListener('click', () => {
				selected.delete(uuid);
				this.#renderPickerTags(picker, fieldName);
			});
			tag.appendChild(remove);

			tagsContainer.appendChild(tag);
		});

		pk5eLog(
			'pk5e (diagnostic): hidden inputs painted in the DOM for this field',
			{
				fieldName,
				hiddenInputsCount: tagsContainer.querySelectorAll(
					`input[type="hidden"][name="${fieldName}"]`
				).length
			}
		);
	}

	/* -------------------------------------------- */
	/*  Biography Generation                        */
	/* -------------------------------------------- */

	/**
	 * Compute the ability modifier for a given ability score (standard D&D formula), used only by
	 * the ability scores table in the biography.
	 * @param {number} score Raw ability score.
	 * @returns {number} Ability modifier.
	 * @private
	 */
	static #calculateModifier(score) {
		return Math.floor((Number(score) - 10) / 2);
	}

	/**
	 * Build the auto-generated HTML biography (system.details.biography.public) for the Fakemon.
	 * Structure and inline styles (yellow=#fed841 titles, #a98701 bold labels) are ported 1:1 from
	 * the old macro's createBiography, minus SR and "Species Traits" (explicitly excluded per
	 * design decision). Ability/skill labels are read directly from CONFIG.DND5E.abilities/skills
	 * -- these are already plain, human-readable text by the time this code runs (pre-localized
	 * in-place by dnd5e's own "i18nInit" hook, confirmed in consola: CONFIG.DND5E.skills.his.label
	 * === "History", not a raw i18n key), so no extra game.i18n.localize() call is needed here.
	 * Reads move/ability names from #pickerSelections (see #onOpenCompendiumPicker/#renderPickerTags).
	 * @param {object} data Expanded form data, as produced by foundry.utils.expandObject in #onSubmit.
	 * @returns {string} Raw HTML (with unresolved @UUID[...] links) ready to store as-is.
	 * @private
	 */
	#buildBiographyHtml(data) {
		const open = `<strong style="color:#a98701">`;
		const close = `</strong>`;

		let html = `<div>`;
		html += `<h1 style="color:#fed841;text-align:center">Pokémon Species Information</h1>`;

		// General Information list
		html += `<ul>`;
		html += `<li>${open}Species:${close} ${data.species || data.name || 'Unknown'}.</li>`;
		html += `<li>${open}Pokédex Number:${close} #${data.pokedexNumber || '???'}.</li>`;
		html += `</ul>`;

		// Pokédex entry
		if (data.pokedexEntry) {
			html += `<p style="text-align: center"><em>${data.pokedexEntry}</em></p>`;
		}

		// Secondary details list
		const typesText = (data.pokemonTypes ?? [])
			.map(
				(slug) =>
					`@UUID[${POKEMON_TYPE_UUIDS[slug]}]{${FakemonCreationDialog.#capitalize(slug)}}`
			)
			.join(', ');

		html += `<ul>`;
		html += `<li>${open}Size:${close} ${CONFIG.DND5E.actorSizes[data.size]?.label ?? data.size}.</li>`;
		html += `<li>${open}Egg Group:${close} ${(data.eggGroup ?? []).join(', ') || 'None'}.</li>`;

		// Gender Ratio: rounds to the nearest canonical Pokémon fraction
		const genderText = !data.hasGender
			? 'Genderless'
			: (() => {
					const female = Math.clamp(
						Number(data.genderRatio?.female) || 0,
						0,
						100
					);
					const male = 100 - female;

					const STEP = 12.5;
					const nearestStep = Math.round(female / STEP) * STEP;
					const isCloseEnough =
						Math.abs(female - nearestStep) <= STEP / 2;
					const roundedFemale = isCloseEnough ? nearestStep : female;
					const roundedMale = 100 - roundedFemale;

					const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
					const scale = 8;
					const divisor =
						gcd(
							Math.round(roundedFemale * scale),
							Math.round(roundedMale * scale)
						) || 1;
					const femaleRatio =
						Math.round(roundedFemale * scale) / divisor;
					const maleRatio = Math.round(roundedMale * scale) / divisor;

					return `${femaleRatio}:${maleRatio} (${roundedFemale}%♀️, ${roundedMale}%♂️)`;
				})();
		html += `<li>${open}Gender Ratio:${close} ${genderText}.</li>`;
		html += `<li>${open}Type:${close} ${typesText || 'None'}.</li>`;
		html += `</ul>`;

		html += `<p><br></p>`;
		html += `<h2 style="color:#fed841">Stats Data</h2>`;

		// Ability Scores table
		html += `<ul><li>${open}Ability Scores:${close}</li></ul>`;

		const abilityRows = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
		const modsRow = abilityRows
			.map((k) => {
				const mod = FakemonCreationDialog.#calculateModifier(
					data.abilities[k].value
				);
				return `<td><p>${mod >= 0 ? `+${mod}` : mod}</p></td>`;
			})
			.join('');
		const valuesRow = abilityRows
			.map((k) => `<td><p>${data.abilities[k].value}</p></td>`)
			.join('');
		html += `<table style="text-align:center"><tbody>
            <tr>${abilityRows.map((k) => `<th><p>${k.toUpperCase()}</p></th>`).join('')}</tr>
            <tr>${modsRow}</tr>
            <tr>${valuesRow}</tr>
        </tbody></table>`;

		// Additional Stats list
		html += `<ul>`;
		html += `<li>${open}Min Level:${close} ${data.minLevel}.</li>`;
		html += `<li>${open}Natural Armor Class:${close} ${data.naturalArmorClass}.</li>`;
		html += `<li>${open}Initial Hit Points:${close} ${data.hpBase} (d${data.hitDie}).</li>`;

		// Speeds (omits those that are 0)
		const speedLabels = {
			walk: 'Walking',
			fly: 'Flying',
			swim: 'Swimming',
			climb: 'Climbing',
			burrow: 'Burrowing'
		};
		const speedsText = Object.entries(speedLabels)
			.map(([key, label]) => [label, Number(data.movement?.[key])])
			.filter(([, value]) => value > 0)
			.map(([label, value]) => `${value}ft ${label}`)
			.join(', ');
		html += `<li>${open}Speeds:${close} ${speedsText || 'None'}.</li>`;

		// Special Senses (omits those that are 0)
		const senseLabels = {
			darkvision: 'Darkvision',
			blindsight: 'Blindsight',
			tremorsense: 'Tremorsense',
			truesight: 'Truesight'
		};
		const sensesText = Object.entries(senseLabels)
			.map(([key, label]) => [label, Number(data.senses?.[key])])
			.filter(([, value]) => value > 0)
			.map(([label, value]) => `${value}ft ${label}`)
			.join(', ');
		html += `<li>${open}Special Senses:${close} ${sensesText || 'None'}.</li>`;

		// Saving Throw Proficiencies
		const savesText = (data.proficientSaves ?? [])
			.map((key) =>
				(CONFIG.DND5E.abilities[key]?.label ?? key)
					.toUpperCase()
					.slice(0, 3)
			)
			.join(', ');
		html += `<li>${open}Saving Throws Proficiencies:${close} ${savesText || 'None'}.</li>`;

		// Skill Proficiencies
		const skillsText = (data.proficientSkills ?? [])
			.map((key) => CONFIG.DND5E.skills[key]?.label ?? key)
			.join(', ');
		html += `<li>${open}Skills Proficiencies:${close} ${skillsText || 'None'}.</li>`;

		// Abilities (Combined into a single "Possible Ability" bullet point)
		const getAbilityEntries = (fieldName, hidden) => {
			const selected = this.#pickerSelections.get(fieldName) ?? new Map();
			return Array.from(selected.entries()).map(
				([uuid, name]) =>
					`@UUID[${uuid}]{${name}${hidden ? ' (hidden)' : ''}}`
			);
		};
		const allAbilities = [
			...getAbilityEntries('possibleAbilities', false),
			...getAbilityEntries('possibleHiddenAbilities', true)
		].join(', ');
		html += `<li>${open}Possible Ability:${close} ${allAbilities || 'None'}.</li>`;
		html += `</ul>`;

		html += `<p><br></p>`;
		html += `<h2 style="color:#fed841">Leveling Data</h2>`;

		// Evolution
		if (data.hasPreEvolution || data.hasNextEvolution) {
			const total = Number(data.evolutionStages) || 1;
			const current = Number(data.currentEvolutionStage) || 1;
			const stageLabel = (() => {
				if (current === 1) return 'Initial Stage';
				if (current === total) return 'Final Stage';
				const middleStages = total - 2;
				return middleStages <= 1
					? 'Intermediate Stage'
					: `Intermediate Stage ${current - 1}`;
			})();

			html += `<p>${open}Evolution:${close} ${current} / ${total} (${stageLabel}).</p>`;
			html += `<ul>`;
			if (data.hasNextEvolution && data.nextEvolution) {
				html += `<li><p>${data.species || data.name || 'This Pokémon'} can evolve into ${data.nextEvolution}.</p></li>`;
			}
			if (data.hasPreEvolution && data.preEvolution) {
				html += `<li><p>${data.species || data.name || 'This Pokémon'} evolves from ${data.preEvolution}.</p></li>`;
			}
			html += `</ul>`;
		}

		// Moves
		const formatMoves = (fieldName) => {
			const selected = this.#pickerSelections.get(fieldName) ?? new Map();
			return (
				Array.from(selected.entries())
					.map(([uuid, name]) => `@UUID[${uuid}]{${name}}`)
					.join(', ') || 'None'
			);
		};
		const startLevel = Number(data.minLevel) || 1;
		const movesList = [
			`<li><p>Starting: ${formatMoves(`moves.level.${startLevel}`)}.</p></li>`
		];
		for (let level = startLevel + 1; level <= 20; level++) {
			const levelMoves = formatMoves(`moves.level.${level}`);
			if (levelMoves === 'None') continue;
			movesList.push(`<li><p>Level ${level}: ${levelMoves}.</p></li>`);
		}
		movesList.push(`<li><p>TMs: ${formatMoves('moves.tm')}.</p></li>`);
		movesList.push(
			`<li><p>Egg Moves: ${formatMoves('moves.egg')}.</p></li>`
		);
		html += `<p style="margin-top: 20px">${open}Moves:${close}</p><ul>${movesList.join('')}</ul>`;

		html += `</div>`;

		return html;
	}

	/**
	 * Capitalize the first letter of a string (used for Pokémon type slugs in the biography, e.g.
	 * "fire" -> "Fire").
	 * @param {string} str
	 * @returns {string}
	 * @private
	 */
	static #capitalize(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/* -------------------------------------------- */
	/*  Hit Points Calculation                      */
	/* -------------------------------------------- */

	/**
	 * Calculate the per-level HitPointsAdvancement.value map needed so that, once dnd5e combines it
	 * with the actor's Constitution modifier (see NPCData#prepareDerivedData and
	 * HitPointsAdvancement#getAdjustedTotal), the total HP matches the statblock HP entered by the user.
	 * Mirrors the same math as NpcHpFixer#calculateFixData: level 1 = "max", levels 2..minLevel = "avg",
	 * each individually clamped to a minimum of 1 point before applying the CON modifier.
	 * @param {object} data
	 * @param {number} data.desiredHP   Total HP entered by the user (statblock HP).
	 * @param {number} data.minLevel    Minimum level at which this Fakemon can be found.
	 * @param {number} data.hitDieValue Face value of the hit die (e.g. 8 for a d8).
	 * @param {number} data.conMod      Constitution modifier.
	 * @returns {{status: symbol, value: object|null, hpBonus: number|null}}
	 *          `value` is the advancement.value map to store on the class item (null if UNCORRECTABLE).
	 *          `hpBonus` is the remaining flat offset to store as system.attributes.hp.max
	 *          (0 in the normal case; only non-zero if per-level values had to be clamped to 1).
	 * @private
	 */
	static #calculateHitPointsAdvancement({
		desiredHP,
		minLevel,
		hitDieValue,
		conMod
	}) {
		const value = {};
		let progressionTotal = 0;

		for (let level = 1; level <= minLevel; level++) {
			const dieValue =
				level === 1 ? hitDieValue : Math.floor(hitDieValue / 2) + 1; // "max" | "avg"
			value[level] = level === 1 ? 'max' : 'avg';
			progressionTotal += Math.max(dieValue + conMod, 1);
		}

		const hpBonus = desiredHP - progressionTotal;

		// If even at minimum per-level values (all clamped to 1) the progression already exceeds
		// the statblock HP, there is no valid offset that makes this Fakemon's HP correct.
		if (hpBonus < 0 && minLevel * 1 > desiredHP) {
			pk5eLog(
				'pk5e (fakemon creation): HP configuration is uncorrectable',
				{ desiredHP, minLevel, hitDieValue, conMod, progressionTotal }
			);
			return {
				status: this.#HP_STATUS.UNCORRECTABLE,
				value: null,
				hpBonus: null
			};
		}

		pk5eLog('pk5e (fakemon creation): HP advancement calculated', {
			value,
			progressionTotal,
			hpBonus
		});
		return { status: this.#HP_STATUS.OK, value, hpBonus };
	}

	/* -------------------------------------------- */
	/*  Form Submission                             */
	/* -------------------------------------------- */

	/**
	 * Handle form submission: calculate the HP advancement, build the Fakemon NPC actor data,
	 * create the actor, and open its sheet. Aborts (without closing the dialog) if the entered
	 * HP/level/hit die/Constitution combination is not mathematically achievable.
	 * @this {FakemonCreationDialog}
	 * @param {SubmitEvent}      event    The originating form submission event.
	 * @param {HTMLFormElement}  form     The form element that was submitted.
	 * @param {FormDataExtended} formData Processed data for the submitted form.
	 * @returns {Promise<void>}
	 * @private
	 */
	static async #onSubmit(event, form, formData) {
		event.preventDefault(); // Defensive: prevents the native <form> submission if something fails below.

		try {
			// foundry.utils.expandObject is necessary because formData.object is FLAT (keys with literal
			// dots, e.g. "abilities.con.value"), not nested -- same pattern dnd5e itself uses in
			// TransformDialog#handleFormSubmission, ActivityUsageDialog#_prepareSubmitData, etc.
			const data = foundry.utils.expandObject(formData.object);

			// Validation of required fields: if any are missing, notify with the native Foundry warning
			// notification (ui.notifications.warn) listing ALL missing fields at once, instead of
			// stopping at the first one -- this way the user doesn't have to submit the form N times
			// to discover each missing field one by one. Does not close the dialog in any case.
			const missingFields = [];
			if (!data.name) missingFields.push('Name');
			if (!data.pokedexNumber) missingFields.push('Pokédex Number');
			if (!data.pokedexEntry) missingFields.push('Pokédex Entry');
			if (!data.size) missingFields.push('Size');
			if (!data.hitDie) missingFields.push('Hit Die');
			if (!data.hpBase) missingFields.push('Total HP');
			if (!data.minLevel) missingFields.push('Minimum Level');
			if (!data.naturalArmorClass)
				missingFields.push('Natural Armor Class');
			for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
				if (!data.abilities?.[key]?.value)
					missingFields.push(`${key.toUpperCase()} Ability Score`);
			}

			if (missingFields.length) {
				ui.notifications.warn(
					`pk5e: Missing required fields: ${missingFields.join(', ')}.`
				);
				pk5eLog(
					'pk5e (fakemon creation): Aborting actor creation, missing required fields',
					missingFields
				);
				return; // Does not close the dialog; the user completes the missing fields
			}

			pk5eLog('pk5e (fakemon creation): Form submitted', data);

			// pk5e (diagnostic): confirm whether FormDataExtended delivers a string (1 selection), array (2+),
			// or undefined (0 selections) for each field populated by the CompendiumBrowser picker.
			// ["moves.tm", "moves.egg", "moves.level.1", "moves.level.2", "possibleAbilities", "hiddenAbilities"].forEach(key => {
			// 	const value = data[key];
			// 	pk5eLog(`pk5e (diagnostic): real type of data["${key}"]`, {
			// 		value, type: Array.isArray(value) ? "array" : typeof value, length: value?.length
			// 	});
			// });

			const hitDieValue = Number(data.hitDie);
			const conMod = Math.floor(
				(Number(data.abilities.con.value) - 10) / 2
			);

			const hpResult =
				FakemonCreationDialog.#calculateHitPointsAdvancement({
					desiredHP: Number(data.hpBase),
					minLevel: Number(data.minLevel),
					hitDieValue,
					conMod
				});

			if (
				hpResult.status ===
				FakemonCreationDialog.#HP_STATUS.UNCORRECTABLE
			) {
				ui.notifications.error(
					'pk5e: The entered HP is not achievable with the given level, hit die and Constitution. Adjust the values and try again.'
				);
				pk5eLog(
					'pk5e (fakemon creation): Aborting actor creation, HP uncorrectable'
				);
				return; // Does not close the dialog; the user corrects the values
			}

			// Merges the saving throw proficiency (checkbox from the multi-select "proficientSaves") into
			// each ability, since the dnd5e schema does not have a separate "saves" block: the field
			// "abilities.{key}.proficient" IS the saving throw proficiency.
			const proficientSaves = new Set(data.proficientSaves ?? []);
			for (const key of Object.keys(data.abilities ?? {})) {
				data.abilities[key].proficient = proficientSaves.has(key)
					? 1
					: 0;
			}

			// Builds the "skills" object with only the skills marked as proficient in the
			// multi-select "proficientSkills"; the remaining skills will use the default value (0) that
			// is already applied by the dnd5e schema.
			const skills = {};
			for (const key of data.proficientSkills ?? []) {
				skills[key] = { value: 1 };
			}

			// Generates the HTML for the biography based on the fields that don't have another destination in the
			// actor (Pokédex, types, abilities, gender, egg group, moves and evolution in free text).
			// These fields ONLY exist in the biography -- they are not mapped to any other part of the actor.
			const biographyHtml = this.#buildBiographyHtml(data);

			// The "img" field of the Actor is a FilePathField validated by the Foundry core (not by
			// dnd5e), which rejects any path/URL whose final extension is not a recognized image
			// (fails even with Actor.create returning undefined instead of rejecting the promise, see
			// guard "if (!actor)" below). If it doesn't have a valid extension, it is omitted completely
			// so that Foundry applies its own default NPC icon, instead of forcing a custom value.
			const IMAGE_EXTENSION_REGEX =
				/\.(apng|avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i;
			const validImg =
				data.img && IMAGE_EXTENSION_REGEX.test(data.img)
					? data.img
					: undefined;

			const actorData = {
				name: data.name,
				type: 'npc',
				img: validImg || 'modules/pokemon5e/extras/pokeball.svg',
				folder: data.folder || null,
				system: {
					attributes: {
						hp: {
							formula: `1d${hitDieValue}`,
							value: Number(data.hpBase),
							max: hpResult.hpBonus
						},
						movement: {
							walk: Number(data.movement?.walk) || 0,
							fly: Number(data.movement?.fly) || 0,
							swim: Number(data.movement?.swim) || 0,
							climb: Number(data.movement?.climb) || 0,
							burrow: Number(data.movement?.burrow) || 0,
							units: 'ft',
							hover: !!data.movement?.hover
						},
						senses: {
							darkvision: Number(data.senses?.darkvision) || 0,
							blindsight: Number(data.senses?.blindsight) || 0,
							tremorsense: Number(data.senses?.tremorsense) || 0,
							truesight: Number(data.senses?.truesight) || 0,
							units: 'ft',
							special: data.senses?.special || ''
						},
						ac: {
							calc: 'natural',
							flat: Number(data.naturalArmorClass) || 10
						}
					},
					abilities: data.abilities,
					skills: skills,
					traits: {
						size: data.size || 'med'
					},
					details: {
						cr: 0,
						biography: { public: biographyHtml }
					}
				}
			};

			const actor = await Actor.create(actorData, { renderSheet: false });
			// Actor.create does not always reject the promise if validation fails (e.g., "name" is empty);
			// in that case the error is already logged as console.error by the Foundry core, but "actor"
			// remains undefined -- we must stop here, not proceed to actor.sheet.render().
			if (!actor) {
				pk5eLog(
					'pk5e (fakemon creation): Actor.create returned undefined (validation failed, see error above)'
				);
				ui.notifications.error(
					"pk5e: Could not create the Fakemon. Check that the 'Name' field (Identity tab) is not empty."
				);
				return;
			}
			pk5eLog('pk5e (fakemon creation): Actor created', actor);

			// "Pokémon Level" class item: carries the HitPoints advancement with hpResult.value, so
			// NPCData#prepareDerivedData (advancement.byType.HitPoints.[0].getAdjustedTotal) adds the
			// "base" that was missing -- without this Item, system.attributes.hp.max stayed at the pure
			// offset (hpBonus), never at the desired total HP. "levels" is set to minLevel (the minimum
			// level at which this Fakemon appears) so the class reflects the actual level --
			// NPCData#prepareBaseData ADDS this to details.level/attributes.hd.max (it doesn't overwrite
			// it), so the actor will end up with details.level === minLevel, as expected.
			const classItemData = {
				name: 'Pokémon Level',
				type: 'class',
				img: 'https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/others/lv.svg',
				system: {
					levels: Number(data.minLevel) || 1,
					hd: { denomination: `d${hitDieValue}` },
					advancement: [
						{
							type: 'HitPoints',
							configuration: {},
							value: hpResult.value
						}
					]
				}
			};

			// Type items: resolves each slug in data.pokemonTypes to its real UUID (POKEMON_TYPE_UUIDS)
			// and clones the compendium Item to embed it on the actor -- previously these were only used
			// to build the @UUID[...] link in the biography, never as a real Item.
			const typeItems = (
				await Promise.all(
					(data.pokemonTypes ?? [])
						.map((slug) => POKEMON_TYPE_UUIDS[slug])
						.filter((uuid) => uuid)
						.map((uuid) => fromUuid(uuid))
				)
			)
				.filter((item) => item)
				.map((item) => item.toObject());

			// Ability item: of the "possibleAbilities", only the FIRST is embedded (if at least one
			// exists) -- user's decision: a Fakemon doesn't need all N "possible" abilities as
			// simultaneous real items, just one so it can be played right away. The rest remain listed
			// only in the biography as "possible", same as before.
			const possibleAbilityUuids = Array.isArray(data.possibleAbilities)
				? data.possibleAbilities
				: data.possibleAbilities
					? [data.possibleAbilities]
					: [];
			const abilityItems = possibleAbilityUuids.length
				? [await fromUuid(possibleAbilityUuids[0])]
						.filter((item) => item)
						.map((item) => item.toObject())
				: [];

			// Moves: embeds the first 4 level moves (in ascending level order, starting at minLevel --
			// same criterion #buildBiographyHtml already uses for the biography text), plus "Struggle"
			// -- always mandatory, since every Pokémon knows it by default without needing to learn it.
			// The Set prevents duplicating Struggle if it happened to already be among the first 4.
			const STRUGGLE_UUID =
				'Compendium.pokemon5e.pokemon_moves.Item.53VnJUr12moqMJim';
			const levelMoveUuids = Object.keys(data.moves?.level ?? {})
				.map(Number)
				.sort((a, b) => a - b)
				.flatMap((level) => {
					const value = data.moves.level[level];
					return Array.isArray(value) ? value : value ? [value] : [];
				});
			const moveUuids = [
				...new Set([...levelMoveUuids.slice(0, 4), STRUGGLE_UUID])
			];
			const moveItems = (
				await Promise.all(moveUuids.map((uuid) => fromUuid(uuid)))
			)
				.filter((item) => item)
				.map((item) => item.toObject());

			await actor.createEmbeddedDocuments('Item', [
				classItemData,
				...typeItems,
				...abilityItems,
				...moveItems
			]);
			pk5eLog(
				'pk5e (fakemon creation): Class item (HP advancement), type items, ability item y move items embedded',
				{
					classItemData,
					typeItemsCount: typeItems.length,
					abilityItemsCount: abilityItems.length,
					moveItemsCount: moveItems.length
				}
			);

			actor.sheet.render(true);
		} catch (err) {
			console.error(
				'pk5e (fakemon creation): unexpected error in #onSubmit',
				err
			);
			ui.notifications.error(
				`pk5e: An unexpected error occurred while creating the Fakemon (${err.message}). Check the console.`
			);
		}
	}
}
