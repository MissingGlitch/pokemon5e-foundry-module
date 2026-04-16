const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class NpcHpFixer extends HandlebarsApplicationMixin (ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: "pk5e-npc-hp-fixer",
		window: {
			title: "NPC HP Fixer",
			icon: "fa-solid fa-heart-circle-exclamation",
			contentTag: "form"
		},
		position: {
			width: 400,
			height: "auto"
		},
		form: {
			handler: NpcHpFixer.#handleSubmit,
			closeOnSubmit: false
		},
		actions: {
			cancel: NpcHpFixer.#onCancel
		}
	};

	static PARTS = {
		content: {
			template: "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.hbs"
		}
	};

	async _prepareContext() {
		return {
			// variables para el .hbs
		};
	}

	static async #handleSubmit (event, form, formData) {
		// Primero debemos recolectar toda la info de las opciones seleccionadas, y mostrar un resumen al usuario con un
		// dialog de confirmación. En caso de que confirme, mostrar un spiner de carga, y cuando todo termine, mostrar un ¡éxito!



		// formData.object contiene los valores del formulario
		console.log("Datos del fixer:", formData.object);
		// lógica de arreglo de HP aquí

		const data = formData.object;

		// Construye el HTML del resumen
		const summaryHtml = `
			<h4>¿Confirmas que quieres aplicar los siguientes cambios?</h4>
			<p>Esto es solo de ejemplo</p>
		`;

		// Muestra el diálogo de confirmación
		const confirmed = await foundry.applications.api.DialogV2.confirm({
			window: { title: "Confirmar cambios" },
			content: summaryHtml,
			rejectClose: false  // si el usuario cierra sin confirmar, retorna false en vez de lanzar error
		});

		if (!confirmed) return; // el usuario canceló, NpcHpFixer sigue abierto

		// El usuario confirmó → ejecuta la lógica real
		console.log("Aplicando cambios:", data);
		// ... tu lógica aquí ...

		// Cierra el NpcHpFixer manualmente
		// await this.close();
	}

	static async #onCancel (event, target) {
		this.close();
	}
}