import { pokemonModuleLog } from "./../utils/logs.js";

//* HTML Button Creation
const moveManagerButton = document.createElement("button");
moveManagerButton.setAttribute("type", "button");
const moveManagerButtonName = "Move Manager";
moveManagerButton.setAttribute("aria-label", moveManagerButtonName);
moveManagerButton.setAttribute("data-tooltip", moveManagerButtonName);
moveManagerButton.addEventListener("click", managePokemonMoves);
const moveManagerButtonIcon = document.createElement("i");
moveManagerButtonIcon.classList.add("fa-duotone", "fa-solid", "fa-bars-progress");
moveManagerButton.appendChild(moveManagerButtonIcon);

//* HTML Button Injection
Hooks.on("renderBaseActorSheet", (app, html, context, options) => {
	pokemonModuleLog("<-- Pokémon 5e Move Manager Button Shortcut Rendered on Actor Sheet -->");

	// Place where everything will be rendered: Header Buttons (Short/Long Rest Buttons)
	const searchBarContainerForFeatures = html.querySelector(".dnd5e2.actor .window-content .tab-body .tab[data-tab=\"features\"] search").parentElement;
	const searchBarContainerForInventory = html.querySelector(".dnd5e2.actor .window-content .tab-body .tab[data-tab=\"inventory\"] search").parentElement;

	const searchBarContainers = [searchBarContainerForFeatures, searchBarContainerForInventory];
	searchBarContainers.forEach(searchBarContainer => {
		searchBarContainer.style.display = "grid";
		searchBarContainer.style.gridTemplateColumns = "30px 1fr";
		searchBarContainer.style.gap = "8px";

		const shortcutButton = moveManagerButton.cloneNode(true);
		shortcutButton.classList.add("pokemon5e");
		shortcutButton.addEventListener("click", managePokemonMoves);
		searchBarContainer.insertAdjacentElement("afterbegin", shortcutButton);
	});
});

async function managePokemonMoves(event) {
	// Variables
	const { Dialog } = foundry.applications.api;
	const dID = "pk5e-move-manager-dialog";
	// Identify the type of actor (synthetic or normal)
	const rawUUID = event.target.form.id; // HTML Form Element ID
	console.info(`Sheet UUID from HTML: ${rawUUID}`);
	const idsIdentificator = /(-Scene-[^-]+)?(-Token-[^-]+)?(-Actor-[^-]+)/;
	const parsedUUID = rawUUID.match(idsIdentificator)?.[0]?.replaceAll("-", ".")?.slice(1);
	const sheet = fromUuidSync(parsedUUID);

	// Initial Validation
	if (!sheet) {
		ui.notifications.error(`Actor not found`, { console: true });
	} else {
		const sheetLevel = sheet.system.details.level;
		const sheetPokemonMoves = sheet.items
			.filter(item => item.type === "weapon")
			.filter(weapon => weapon.system.type.value === "pokemon");

		const sheetBiography = document.createElement("div");
		sheetBiography.innerHTML = sheet.system.details.biography.public;
		const biographyMoveList = sheetBiography.querySelector("ul:last-of-type");
		const allAvailableMovesToLernByLevel = getMovesToLern(biographyMoveList);
		const applyShowInfoOnHover = (uuid) => `<section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>`;

		// HTML
		// Main Dialog Content
		const mainContent = document.createElement("div");
		mainContent.className = `${dID}__main-content`;
		mainContent.dataset.actorUuid = sheet.uuid;

		// Selected Moves Section
		const selectedMovesSection = document.createElement("div");
		{
			// Section Title
			selectedMovesSection.innerHTML = `
				<div style="position: relative;">
					<h3>Known Moves</h3>
					<i class="fa-solid fa-gear pk5e-dialog-toggle-settings" style="right: 20px;"></i>
				</div>
			`;

			// Section Settings
			selectedMovesSection.innerHTML += `
				<div class="pk5e-dialog-settings-container">
					<div class="pk5e-dialog-settings-label">
						<span>line</span> <p>settings</p> <span>line</span>
					</div>
					<div class="pk5e-dialog-settings-list pk5e-dialog-settings-list-for-selected-moves">
						<div class="pk5e-dialog-setting">
							<input type="checkbox"></input>
							<p>show struggle move</p>
						</div>
						<div class="pk5e-dialog-setting">
							<input type="checkbox"></input>
							<p>allow exceed max moves</p>
						</div>
					</div>
				</div>
			`;

			// Section "Subtitle"
			selectedMovesSection.innerHTML += `
				<p class="move-list-extra-info">
					Current Moves:
					<span class="sheet-current-moves">X</span>
					(max <span class="sheet-max-moves">Y</span>)
				</p>
			`;

			// Section Content
			const selectedMovesList = document.createElement("div");
			selectedMovesList.className = "selected-moves-list";
			const sheetMovesSorted = sheetPokemonMoves.toSorted(sortMovesAlphabetically);
			sheetMovesSorted.forEach(move => {
				const moveItem = document.createElement("div");
				moveItem.ondragleave = "removeDragHoverAreaHighlight(event)";
				moveItem.dataset.moveName = move.name;
				moveItem.dataset.itemUuid = move.uuid;
				moveItem.dataset.tooltip = applyShowInfoOnHover(move.uuid);
				moveItem.className = "selected-move-item pk5e-move-item";
				moveItem.innerHTML = `<img src="${move.img}"/> <p>${move.name}</p>`;
				// Forget Move Button
				const forgetMoveButton = document.createElement("button");
				forgetMoveButton.type = "button";
				forgetMoveButton.className = "forget-move-button";
				forgetMoveButton.innerHTML = `<i class="fas fa-times"></i>`; // Icon
				moveItem.appendChild(forgetMoveButton);
				selectedMovesList.appendChild(moveItem);
				if (move.name === "Struggle") {
					moveItem.classList.add("pk5e-hide-move-item");
					moveItem.children[2].style.visibility = "hidden";
				}
			});
			selectedMovesSection.appendChild(selectedMovesList);
		}

		// Available Moves Section
		const availableMovesSection = document.createElement("div");
		{
			// Section Title
			availableMovesSection.innerHTML = `
				<div style="position: relative;">
					<h3>Available to Lern</h3>
					<i class="fa-solid fa-gear pk5e-dialog-toggle-settings" style="right: 3px;"></i>
				</div>
			`;

			// Section Settings
			availableMovesSection.innerHTML += `
				<div class="pk5e-dialog-settings-container">
					<div class="pk5e-dialog-settings-label">
						<span>line</span> <p>settings</p> <span>line</span>
					</div>
					<div class="pk5e-dialog-settings-list pk5e-dialog-settings-list-for-available-moves">
						<div class="pk5e-dialog-setting">
							<input type="checkbox"></input>
							<p>show all levels</p>
						</div>
						<div class="pk5e-dialog-setting">
							<input type="checkbox"></input>
							<p>show tm moves</p>
						</div>
						<div class="pk5e-dialog-setting">
							<input type="checkbox"></input>
							<p>show egg moves</p>
						</div>
					</div>
				</div>
			`;

			// Section Subtitle
			availableMovesSection.innerHTML += `
				<p class="move-list-extra-info">
					Moves from level <span class="sheet-current-level-moves">${sheetLevel}</span> or lower
					<span class="additional-moves-shown pk5e-hide-additional-moves">( <span>+TM</span> <span>+Egg</span> )</span>
				</p>
			`;

			// Section Content
			const availableMovesList = document.createElement("div");
			availableMovesList.className = "available-moves-list";
			for (const movesOnLevel in allAvailableMovesToLernByLevel) {
				const learningLevelRaw = movesOnLevel;
				const learningLevelFormatted = formatLevel(movesOnLevel);
				const moves = allAvailableMovesToLernByLevel[movesOnLevel];
				const movesSorted = moves.toSorted(sortMovesAlphabetically);

				movesSorted.forEach(move => {
					const moveItem = document.createElement("div");
					moveItem.dataset.moveName = move.name;
					moveItem.dataset.itemUuid = move.UUID;
					moveItem.dataset.itemImg = move.img;
					moveItem.dataset.learningLevel = learningLevelRaw.replace("Level ", "").replace("TMs", "TM");
					moveItem.dataset.tooltip = applyShowInfoOnHover(move.UUID);
					moveItem.dataset.tooltipDirection = "RIGHT";
					moveItem.setAttribute("draggable", "true");
					moveItem.className = "available-move-item pk5e-move-item";
					moveItem.innerHTML = `
						<img src="${move.img}" draggable="false"/>
						<div>
							<p>${move.name}</p>
							<p>${learningLevelFormatted}</p>
						</div>
					`;
					availableMovesList.appendChild(moveItem);
					const learningLevelNumber = Number(moveItem.dataset.learningLevel);
					if (learningLevelRaw.includes("TMs") || learningLevelRaw.includes("Egg") || learningLevelNumber > sheetLevel) {
						moveItem.classList.add("pk5e-hide-move-item");
					}
				});
			}
			availableMovesSection.appendChild(availableMovesList);
		}

		// Css Styles
		const foundryItemHoverStyle = "0 0 8px #c9593f";
		const cssStyles = document.createElement("style");
		cssStyles.textContent = `
			/* All Dialog Content */
			#${dID} .${dID}__main-content {
				display: grid;
				grid-template-columns: 260px 260px;
				grid-template-rows: 1fr;
				grid-column-gap: 90px;
			}

			/* Section Title */
			#${dID} h3 {
				margin: 0;
				text-align: center;
			}

			/* Toggle Settings Button */
			#${dID} .pk5e-dialog-toggle-settings {
				cursor: pointer;
				position: absolute;
				top: -5px;
				font-size: 12px;
				padding: 2px;
				transition: transform 0.5s;
			}

			#${dID} .pk5e-dialog-toggle-settings:hover {
				box-shadow: ${foundryItemHoverStyle};
			}

			#${dID} .pk5e-dialog-toggle-settings.pk5e-dialog-showing-settings {
				color: #ee9b3a;
				transform: rotate(90deg);
			}

			/* Section Settings */
			#${dID} .pk5e-dialog-settings-container.pk5e-show-settings {
				display: block;
				min-height: 86px;

				@starting-style {
					min-height: 0;
				}
			}

			#${dID} .pk5e-dialog-settings-container {
				display: none;
				height: 0;
				min-height: 0;
				margin: 10px 0 15px 0;
				padding: 10px 0;
				border-bottom: 1px solid;
				text-align: center;
				overflow: hidden;
				transition: min-height, display;
				transition-duration: 0.3s;
				transition-behavior: allow-discrete;
			}

			/* Settings Label */
			#${dID} .pk5e-dialog-settings-label {
				display: grid;
				grid-template-rows: 1fr;
				grid-template-columns: 1fr min-content 1fr;
			}

			#${dID} .pk5e-dialog-settings-label span {
				color: transparent;
				display: inline-block;
				border-top: 1px solid #efe6d8;
			}

			#${dID} .pk5e-dialog-settings-label p {
				margin: 0;
				padding: 0 5px;
				font-size: 14px;
				position: relative;
				top: -9px;
			}

			/* Settings List */
			#${dID} .pk5e-dialog-settings-list {
				display: grid;
				grid-template-rows: 1fr;
			}

			#${dID} .pk5e-dialog-settings-list-for-selected-moves {
				grid-template-columns: repeat(2, 1fr);
			}

			#${dID} .pk5e-dialog-settings-list-for-available-moves {
				grid-template-columns: repeat(3, 1fr);
			}

			#${dID} .pk5e-dialog-setting {
				display: flex;
				flex-direction: column;
				align-items: center;
			}

			#${dID} .pk5e-dialog-setting input {
				margin: 0;
			}

			#${dID} .pk5e-dialog-setting p {
				margin: 0;
				max-width: 60px;
				font-size: 10px;
			}

			/* Section Subtitle */
			#${dID} .move-list-extra-info {
				opacity: 0.6;
				font-size: 13px;
				text-align: center;
			}

			#${dID} .move-list-extra-info .additional-moves-shown.pk5e-hide-additional-moves {
				display: none;
			}

			/* Section Content */
			#${dID} .selected-moves-list,
			#${dID} .available-moves-list {
				display: flex;
				flex-direction: column;
				gap: 8px;
				min-height: 300px;
				max-height: 350px;
				overflow: scroll;
				padding: 5px;
			}

			#${dID} .selected-moves-list.highlight-dragover-general {
				outline: 2px dashed;
				box-shadow: ${foundryItemHoverStyle};
			}

			#${dID} .selected-moves-list.highlight-dragover {
				background: #c9593f99;
			}

			/* Move Item */
			#${dID} .pk5e-move-item {
				display: flex;
				height: 50px;
				padding: 5px;
				border: 2px solid;
				font-size: 15px;
				background: #18171f;
			}

			#${dID} .pk5e-move-item img {
				width: 30px;
			}
			
			#${dID} .pk5e-move-item:hover {
				cursor: pointer;
				box-shadow: ${foundryItemHoverStyle};
			}

			#${dID} .pk5e-move-item:hover p {
				text-shadow: ${foundryItemHoverStyle};
			}

			#${dID} .pk5e-move-item :nth-child(2) {
				width: 100%;
				text-align: center;
			}

			#${dID} .pk5e-move-item.pk5e-hide-move-item {
				display: none;
			}

			/* Move Item (Available) */
			#${dID} .available-move-item div p {
				margin: 0;
			}

			#${dID} .available-move-item div p:nth-child(2) {
				opacity: 0.6;
				font-size: 12px;
			}

			/* Move Item (Selected) */
			#${dID} .selected-move-item .forget-move-button {
				padding: 5px;
				font-size: 12px;
				margin: auto 0px;
				border: 1px solid #efe6d8;
			}

			#${dID} .selected-move-item.highlight-dragover {
				background: #c9593f99;
				box-shadow: ${foundryItemHoverStyle};
				text-shadow: ${foundryItemHoverStyle};
			}
		`;

		// Final Assembly: Attach Sections + Styles
		const allContent = document.createElement("div");
		mainContent.appendChild(selectedMovesSection);
		mainContent.appendChild(availableMovesSection);
		allContent.appendChild(cssStyles);
		allContent.appendChild(mainContent);

		const result = await Dialog.wait({
			id: dID,
			window: {
				title: `${sheet.name}'s Move Manager`,
				icon: "fa-duotone fa-solid fa-bars-progress"
			},
			content: allContent,
			position: {},
			buttons: [
			{
				icon: "fas fa-times",
				label: "Cancel",
				action: "cancel",
				callback: (event, button, dialog) => null
			},
			{
				icon: "fas fa-check",
				label: "Confirm",
				action: "confirm",
				default: true,
				callback: async (event, button, dialog) => {
					const dialogHtml = dialog.element.querySelector(".pk5e-move-manager-dialog__main-content");

					// Sheet Old Moves
					const sheet = fromUuidSync(dialogHtml.dataset.actorUuid);
					const sheetOldMoves = sheet.items
						.filter(item => item.type === "weapon")
						.filter(weapon => weapon.system.type.value === "pokemon");
					const sheetOldMovesNames = sheetOldMoves.map(move => move.name);

					// Dialog Selected Moves
					const selectedMovesSection = dialogHtml.querySelector(":scope > div:nth-child(1)");
					const selectedMovesList = selectedMovesSection.querySelector(".selected-moves-list");
					const dialogSelectedMoves = Array.from(selectedMovesList.children);
					const dialogSelectedMovesNames = dialogSelectedMoves.map(move => move.dataset.moveName);

					// Moves to Upload
					const namesOfMovesToAdd = dialogSelectedMovesNames.filter(newMove => !sheetOldMovesNames.some(oldMove => oldMove === newMove));
					const namesOfMovesToRemove = sheetOldMovesNames.filter(oldMove => !dialogSelectedMovesNames.some(newMove => oldMove === newMove));
					console.log(`PK5E: Move Manager Logs`);
					console.log(`- Moves to add: ${namesOfMovesToAdd.join(", ").trim()}.`);
					console.log(`- Moves to remove: ${namesOfMovesToRemove.join(", ").trim()}.`);

					try {
						// Removes
						const idsOfMovesToRemove = sheetOldMoves
							.filter(move => namesOfMovesToRemove.some(moveToRemove => moveToRemove === move.name))
							.map(move => move.id);
						sheet.deleteEmbeddedDocuments("Item", idsOfMovesToRemove);

						// Adds
						const movesToAdd = [];
						const movesCompendium = game.packs.get("pokemon5e.pokemon_moves");
						namesOfMovesToAdd.forEach(moveName => {
							const moveToAdd = movesCompendium.getName(moveName);
							if (!moveToAdd) console.log(`Move "${moveName}" not found`);
							else movesToAdd.push(moveToAdd.toObject());
						});
						sheet.createEmbeddedDocuments("Item", movesToAdd);

					} catch (error) {
						console.error(error);
					}
				}
			}
			],
			render: (renderEvent, dialog) => {
				const dialogHtml = dialog.element.querySelector(".pk5e-move-manager-dialog__main-content");
				// Actor Sheet
				const sheet = fromUuidSync(dialogHtml.dataset.actorUuid);
				const sheetLevel = sheet.system.details.level;
				const sheetHasExtraMoveFeat = sheet.toObject().items
					.filter(item => item.type === "feat").some(item => item.name === "Extra Move");
				const sheetHasStruggleMove = sheet.toObject().items
					.filter(item => item.type === "weapon")
					.filter(weapon => weapon.system.type.value === "pokemon")
					.some(pokemonMove => pokemonMove.name === "Struggle");
				const sheetTotalMaxMoves = sheetHasExtraMoveFeat ? 5 : 4;

				// HTML Elements
				const selectedMovesSection = dialogHtml.querySelector(":scope > div:nth-child(1)");
				const selectedMovesSettingsButton = selectedMovesSection.querySelector(".pk5e-dialog-toggle-settings");
				const selectedMovesSettingsList = selectedMovesSection.querySelector(".pk5e-dialog-settings-list");
				const selectedMovesList = selectedMovesSection.querySelector(".selected-moves-list");
				const totalCurrentMoves = selectedMovesSection.querySelector(".move-list-extra-info .sheet-current-moves");
				const totalMaxMoves = selectedMovesSection.querySelector(".move-list-extra-info .sheet-max-moves");
				updateNumberOfMoves();

				const availableMovesSection = dialogHtml.querySelector(":scope > div:nth-child(2)");
				const availableMovesSettingsButton = availableMovesSection.querySelector(".pk5e-dialog-toggle-settings");
				const availableMovesSettingsList = availableMovesSection.querySelector(".pk5e-dialog-settings-list");
				const availableMovesList = availableMovesSection.querySelector(".available-moves-list");
				const sheetCurrentLevelMoves = availableMovesSection.querySelector(".move-list-extra-info .sheet-current-level-moves");
				const additionalMovesShown = availableMovesSection.querySelector(".move-list-extra-info .additional-moves-shown");

				// Event Listeners
				selectedMovesSettingsButton.addEventListener("click", toggleSettingsList);
				selectedMovesSettingsList.addEventListener("click", toggleSetting);
				selectedMovesList.addEventListener("dragover", hightlightDragHoverArea);
				selectedMovesList.addEventListener("dragleave", removeDragHoverAreaHighlight);
				selectedMovesList.addEventListener("drop", dropNewMoveToTheList);
				selectedMovesList.addEventListener("click", forgetMove);

				availableMovesSettingsButton.addEventListener("click", toggleSettingsList);
				availableMovesSettingsList.addEventListener("click", toggleSetting);
				availableMovesList.addEventListener("dragstart", grabAndDragMove);
				availableMovesList.addEventListener("click", addSelectedMoveToTheList);

				// Functions
				function getNumberOfCurrentMoves() {
					const currentMoves = Array.from(selectedMovesList.children);
					return sheetHasStruggleMove ? currentMoves.length-1 : currentMoves.length;
				}

				// Settings: Show/Hide Setting List
				function toggleSettingsList(event) {
					const button = event.target;
					const parentSection = button.parentElement.parentElement;
					const settings = parentSection.children[1];

					settings.classList.toggle("pk5e-show-settings");
					button.classList.toggle("pk5e-dialog-showing-settings");
				}

				// Settings: Toggle 1 Setting
				function toggleSetting(event) {
					if (event.target.tagName === "INPUT") {
						const buttonClicked = event.target;
						const settingName = buttonClicked.nextElementSibling.textContent;
						toggleSpecificSetting[settingName]();
					}
				}

				// Settings: Setting List
				const toggleSpecificSetting = {
					// Selected Moves Settings
					"show struggle move": () => {
						if (!sheetHasStruggleMove) ui.notifications.warn(`The actor "${sheet.name}" doesn't have the Struggle move`, { console: true });
						else {
							const struggle = Array.from(selectedMovesList.children).find(move => move.textContent.trim() === "Struggle");
							struggle.classList.toggle("pk5e-hide-move-item");
							updateNumberOfMoves();
						}
					},

					"allow exceed max moves": () => {
						updateNumberOfMoves();
					},

					// Available Moves Settings
					"show all levels": () => {
						const higherLevelMoves = Array.from(availableMovesList.children).filter(move => move.dataset.learningLevel > sheetLevel);
						higherLevelMoves.forEach(move => move.classList.toggle("pk5e-hide-move-item"));

						// Update Current Moves Level Shown
						const prevLevelShowing = sheetCurrentLevelMoves.textContent;
						sheetCurrentLevelMoves.textContent = prevLevelShowing === "MAX" ? sheetLevel : "MAX";
					},

					"show tm moves": () => {
						const tmMoves = Array.from(availableMovesList.children).filter(move => move.dataset.learningLevel === "TM");
						tmMoves.forEach(move => move.classList.toggle("pk5e-hide-move-item"));
						updateAdditionalMovesShown();
					},

					"show egg moves": () => {
						const eggMoves = Array.from(availableMovesList.children).filter(move => move.dataset.learningLevel === "Egg");
						eggMoves.forEach(move => move.classList.toggle("pk5e-hide-move-item"));
						updateAdditionalMovesShown();
					}
				};

				// Update Texts: Number of Moves
				function updateNumberOfMoves() {
					const numberOfCurrentMoves = getNumberOfCurrentMoves();
					// Perhaps it's not showing because it's hidden or because it's not in the "selectedMovesList".
					const struggleMove = Array.from(selectedMovesList.children).find(move => move.dataset.moveName === "Struggle");
					const isStruggleShowing = sheetHasStruggleMove ? (struggleMove.classList.contains("pk5e-hide-move-item") ? false : true) : false;

					if (verifyIfExceedMaxMovesIsAllowed()) totalMaxMoves.textContent = "unlimited";
					else totalMaxMoves.textContent = sheetTotalMaxMoves;

					if (isStruggleShowing) {
						totalMaxMoves.textContent += " + Struggle";
						totalCurrentMoves.textContent = `${numberOfCurrentMoves} + Struggle`;
					} else {
						totalCurrentMoves.textContent = numberOfCurrentMoves;
					}
				}

				// Update Texts: Additional Moves Shown
				function updateAdditionalMovesShown() {
					const allSettings = availableMovesSettingsList;
					const additionalMoveSettings = [allSettings.children[1].children[0], allSettings.children[2].children[0]];
					const isAnyAdditionalMoveSettingEnabled = additionalMoveSettings.some(setting => setting.checked);
					if (isAnyAdditionalMoveSettingEnabled) {
						additionalMovesShown.classList.remove("pk5e-hide-additional-moves");
						if (additionalMoveSettings[0].checked) additionalMovesShown.children[0].style.display = "inline";
						else additionalMovesShown.children[0].style.display = "none";

						if (additionalMoveSettings[1].checked) additionalMovesShown.children[1].style.display = "inline";
						else additionalMovesShown.children[1].style.display = "none";
					}

					else {
						additionalMovesShown.classList.add("pk5e-hide-additional-moves");
					}
				}

				// Verification: Exceed Max Moves Allowed
				function verifyIfExceedMaxMovesIsAllowed() {
					return selectedMovesSettingsList.children[1].children[0].checked;
				}

				// Verification: Max Moves Reached
				function verifyIfMaxMovesReached() {
					const exceedMaxMovesIsAllowed = verifyIfExceedMaxMovesIsAllowed();
					if (exceedMaxMovesIsAllowed) return false;

					else {
						const totalCurrentMoves = getNumberOfCurrentMoves();
						if (totalCurrentMoves >= sheetTotalMaxMoves) {
							ui.notifications.warn(`"${sheet.name}" has already reached the maximum number of moves`, { console: true });
							return true;
						}
						else return false;
					}
				}

				// Verification: Move Already in the List
				function verifyIfSelectedMoveIsAlreadyInTheList(moveName) {
					const currentSelectedMoves = Array.from(selectedMovesList.children);
					const isSelectedMoveAlreadyInTheList = currentSelectedMoves.some(move => move.dataset.moveName === moveName);

					if (isSelectedMoveAlreadyInTheList) {
						ui.notifications.warn(`The move "${moveName}" is already known`, { console: true });
						return true;
					}

					else {
						return false;
					}
				}

				// Remove Move
				async function forgetMove(event) {
					if (event.target.classList.contains("forget-move-button")) {
						const moveToForget = event.target.parentElement;
						const moveName = moveToForget.dataset.moveName;

						const proceed = await foundry.applications.api.DialogV2.confirm({
							window: { title: `Confirmation` },
							content: `<p>Do you want to forget <b>${moveName}</b>?</p>`,
						});

						if (proceed) {
							moveToForget.remove();
							updateNumberOfMoves();
						}
					}
				}

				// Add Move: Grab and Drag
				function grabAndDragMove(event) {
					const selectedMove = event.target.closest(".available-move-item");
					if (selectedMove) {
						const moveBasicData = {
							name: selectedMove.dataset.moveName,
							img: selectedMove.dataset.itemImg,
							uuid: selectedMove.dataset.itemUuid
						};

						event.dataTransfer.setData("text/json", JSON.stringify(moveBasicData));
					}
				}

				// Styles: Highlight Areas While Dragging Over
				function hightlightDragHoverArea(event) {
					event.preventDefault();
					selectedMovesList.classList.add("highlight-dragover-general");
					const dragHoverPlace = event.target;

					// Over the list
					if (dragHoverPlace.classList.contains("selected-moves-list")) {
						dragHoverPlace.classList.add("highlight-dragover");
					}
					// Over an item
					else {
						dragHoverPlace.closest(".selected-move-item").classList.add("highlight-dragover");
					}
				}
				function removeDragHoverAreaHighlight(event) {
					event.target.classList.remove("highlight-dragover", "highlight-dragover-general");
				}

				// Add Move: By Drop
				async function dropNewMoveToTheList(event) {
					event.preventDefault();
					const releasePlaceOfDropping = event.target;
					const moveToDrop = JSON.parse(event.dataTransfer.getData("text/json"));

					const isSelectedMoveAlreadyInTheList = verifyIfSelectedMoveIsAlreadyInTheList(moveToDrop.name);
					if (!isSelectedMoveAlreadyInTheList) {
						const newSelectedMove = createMoveItemHTML(moveToDrop);
						const newSelectedMoveName = newSelectedMove.dataset.moveName;

						// Add as a new one
						if (releasePlaceOfDropping.classList.contains("selected-moves-list")) {
							const isMaxMovesReached = verifyIfMaxMovesReached();
							if (!isMaxMovesReached) {
								const proceed = await foundry.applications.api.DialogV2.confirm({
									window: { title: `Confirmation` },
									content: `<p>Do you want to learn <b>${newSelectedMoveName}</b>?</p>`,
								});

								if (proceed) selectedMovesList.appendChild(newSelectedMove);
							}
						}

						// Replace an old one
						else {
							const moveToReplace = releasePlaceOfDropping.closest(".selected-move-item");

							if (moveToReplace.dataset.moveName === "Struggle") {
								ui.notifications.warn(`The move "Struggle" cannot be replaced`, { console: true });
							}
							else {
								const moveToReplaceName = moveToReplace.dataset.moveName;

								const proceed = await foundry.applications.api.DialogV2.confirm({
									window: { title: `Confirmation` },
									content: `<p>Do you want to replace <b>${moveToReplaceName}</b> with <b>${newSelectedMoveName}</b>?</p>`,
								});

								if (proceed) moveToReplace.outerHTML = newSelectedMove.outerHTML;
							}
						}

						updateNumberOfMoves();
					}

					releasePlaceOfDropping.closest(".selected-move-item")?.classList.remove("highlight-dragover");
					selectedMovesList.classList.remove("highlight-dragover", "highlight-dragover-general");
				}

				// Add Move: By click
				async function addSelectedMoveToTheList(event) {
					const selectedMove = event.target.closest(".available-move-item");
					if (selectedMove) {
						const isMaxMovesReached = verifyIfMaxMovesReached();
						const isSelectedMoveAlreadyInTheList = verifyIfSelectedMoveIsAlreadyInTheList(selectedMove.dataset.moveName);
						if (!isMaxMovesReached && !isSelectedMoveAlreadyInTheList) {
							const selectedMoveName = selectedMove.dataset.moveName;

							const proceed = await foundry.applications.api.DialogV2.confirm({
								window: { title: `Confirmation` },
								content: `<p>Do you want to learn <b>${selectedMoveName}</b>?</p>`,
							});

							if (proceed) {
								const moveBasicData = {
									name: selectedMove.dataset.moveName,
									img: selectedMove.dataset.itemImg,
									uuid: selectedMove.dataset.itemUuid
								};
								const newSelectedMove = createMoveItemHTML(moveBasicData);
								selectedMovesList.appendChild(newSelectedMove);
								updateNumberOfMoves();
							}
						}
					}
				}

				function createMoveItemHTML(moveBasicData) {
					// Move Item
					const moveItem = document.createElement("div");
					moveItem.ondragleave = "removeDragHoverAreaHighlight(event)";
					moveItem.dataset.moveName = moveBasicData.name;
					moveItem.dataset.itemUuid = moveBasicData.uuid;
					moveItem.dataset.tooltip = applyShowInfoOnHover(moveBasicData.uuid);
					moveItem.className = "selected-move-item pk5e-move-item";
					moveItem.innerHTML = `<img src="${moveBasicData.img}"/> <p>${moveBasicData.name}</p>`;

					// Forget Move Button
					const forgetMoveButton = document.createElement("button");
					forgetMoveButton.type = "button";
					forgetMoveButton.className = "forget-move-button";
					forgetMoveButton.innerHTML = `<i class="fas fa-times"></i>`; // Icon
					moveItem.appendChild(forgetMoveButton);

					return moveItem;
				}
			}
		});
	}

	// ul -> li -> p -> Level X: @UUID[Compendium.pokemon5e...]{MoveName}, @... .
	function getMovesToLern(listHtml) {
		const moveLevelLabelDetector = /(\w+\s?\w*):/;
		const moveIdDetector = /@UUID\[(.+?)\]\{(.+?)\}/;

		const unsortedMoves = {};
		listHtml.querySelectorAll("p").forEach(htmlP => {
			const content = htmlP.textContent;
			const label = content.match(moveLevelLabelDetector)[1];
			const movesUUIDs = content.replace(label, "").split(",").map(x => x.trim());

			unsortedMoves[label] = [];
			movesUUIDs.forEach(moveIdRaw => {
				const UUID = moveIdRaw.match(moveIdDetector)[1];
				const ID = UUID.replace("Compendium.pokemon5e.pokemon_moves.Item.", "");
				const move = game.packs.get("pokemon5e.pokemon_moves").index.get(ID);
				unsortedMoves[label].push({ ...move, UUID });
			});
		});
		console.log(unsortedMoves);

		const sortedMoves = {};
		// Sorting Object Properties
		const learningLevels = Object.keys(unsortedMoves);
		for (let i=learningLevels.length-1; i >= 0; i--) {
			const key = learningLevels[i];
			const value = unsortedMoves[key];
			sortedMoves[key] = [...value];
		}

		return sortedMoves;
	}

	function formatLevel(level) {
		if (level.includes("Level")) {
			return `Learned at ${level}`;
		}

		else if (level.includes("TMs")) {
			return "TM (Technical Machine)";
		}

		else {
			return `${level} Move`;
		}
	}

	function sortMovesAlphabetically(move1, move2) {
		const move1name = move1.name.toLowerCase();
		const move2name = move2.name.toLowerCase();
		return move1name.localeCompare(move2name);
	}
}

//* Input Data to Export
export const manageMoves = {
	name: "Move Manager",
	description: "An interface to change the pokémon's moves",
	htmlElement: moveManagerButton

};
