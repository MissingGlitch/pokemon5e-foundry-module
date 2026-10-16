# Contexto: Formulario de Creación de "Fakemon" (módulo pokemon5e)

> Documento de contexto para retomar el desarrollo sin re-analizar decisiones ya tomadas.
> Última actualización (sesión 3): implementados los 2 pendientes bloqueantes de la sesión anterior
> -- Item de clase "Pokémon Level" con `HitPointsAdvancement` (bug de HP corregido) e Items de Tipo
> embebidos -- más el embebido de un Item de Ability y de 4 Move items + Struggle obligatorio,
> validación de campos requeridos (`ui.notifications.warn`), y traducción completa de comentarios/logs
> a inglés (ver secciones 7, 9, 11-13, 16). Estado: creación de Fakemon probada end-to-end
> ("Gatomon") con HP, clase, tipos, ability y moves embebidos correctamente. Pendiente real
> restante: confirmar si `possibleHiddenAbilities` también debe tener Item embebido (ver sección 13,
> pendiente #3, sin confirmar aún).

---

## 1. Objetivo del proyecto

El módulo `pokemon5e` (para FoundryVTT, sobre el sistema `dnd5e`) permite crear actores tipo NPC que representan Pokémon oficiales mediante un macro que lee un `all-pokemon.json`. Se quiere ofrecer una alternativa para que los usuarios finales (no desarrolladores del módulo) puedan crear **"Fakemon"** (Pokémon homebrew) llenando un formulario manual, sin tocar JSON ni macros.

## 2. Punto de entrada: opción "Fakemon" en el diálogo nativo "Create Actor"

- **Decisión tomada:** NO se crea un subtype de Actor nuevo ni se modifica `system.json`. Se opta por inyectar una opción visual "Fakemon" dentro del diálogo nativo `CreateDocumentDialog` (clase del **core de Foundry v13**, no de `dnd5e`), interceptando su `submit` cuando el usuario selecciona esa opción, cancelando la creación nativa, y en su lugar abriendo un `Dialog5e` propio.
- **Mecanismo confirmado y probado en consola (con `game.actors.size` antes/después):**
  - Hook usado: `Hooks.on("renderApplicationV2", (app, html, context, options) => {...})`, filtrando por `app.constructor.name === "CreateDocumentDialog"`.
  - Se clona el `<li>` del radio `input[name="type"][value="npc"]`, se cambia su `value` a `"fakemon"` y su label a "Fakemon", y se inserta en el mismo `<ol>`.
  - Se intercepta el `submit` del `<form>` con `{ capture: true }`: si `fakemonRadio.checked`, se hace `ev.preventDefault()` + `ev.stopImmediatePropagation()`, se cierra el diálogo (`app.close()`) y se abre `new FakemonCreationDialog().render(true)`. Si no está marcado, se deja pasar el flujo nativo sin alterarlo.
- **Validado:** con "Fakemon" seleccionado, `game.actors.size` no cambia (no se crea actor inválido). Con "npc" seleccionado, sí se crea normalmente. No hay efectos secundarios detectados.
- **✅ Cerrado:** el hook ya está conectado con el dialog real — el `// todo: openFakemonCreationDialog();` fue reemplazado por la instancia real (`new FakemonCreationDialog().render(true)`), confirmado en pruebas reales que el dialog se abre correctamente al seleccionar "Fakemon".

## 3. Estructura de carpetas relevante del módulo

```
pokemon5e/
├── como-sacar-una-release                 ← Notas/guía para crear una release del módulo
├── LICENSE                                ← Licencia del proyecto
├── module.json                            ← Metadatos del módulo FoundryVTT
├── README.md                              ← Documentación general del módulo
├── esmodules/
│   ├── addPokemonSystemProperties.js      ← Añade propiedades del sistema a Pokémon (fuente real de POKEMON_TYPES; NO exporta ningún UUID de tipos, ver sección 6.3)
│   ├── settingsMenuOptions.js             ← Opciones del menú de configuración
│   └── applications/
│       └── fakemonCreationForm/
│           ├── fakemonCreationForm.js     ← Clase FakemonCreationDialog (extends dnd5e.applications.api.Dialog5e)
│           ├── context.md                 ← Este archivo
│           └── tabs/
│               ├── identity.hbs           ← Nombre, imagen, N° Pokédex, entrada de Pokédex
│               ├── stats.hbs              ← Ability Scores+Mod, Hit Die (select), HP, nivel inicial, Skill/Save Proficiencies
│               ├── features.hbs           ← Tipos (fix de índices aplicado, ver sección 6.4), Habilidades (feats, vía picker), Egg Group, Gender, Speeds, Senses, Size, Natural AC
│               ├── moves.hbs              ← TM moves, Egg Moves, 20 niveles de movimientos, todos vía picker de CompendiumBrowser
│               └── evolution.hbs          ← Evolución pre/post + fases evolutivas, agrupada en 3 fieldsets
├── html_inputs/
│   ├── inputEvolvePokemon.js
│   ├── inputMoveManager.js
│   ├── inputUpdateMoves.js
│   └── pokemonInputsSection.js
├── utils/
│   └── logs.js                            ← pk5eLog()
├── extras/
│   └── jsons/ ... (sin cambios)
├── packs/ ... (sin cambios, compendios empaquetados)
└── styles/
    └── main.css                           ← Estilos CSS del módulo (no se ha tocado; el divisor "ampersand" se maneja inline vía JS, no CSS)
```

Ya existe también `applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.js` (`NpcHpFixer`, extiende `HandlebarsApplicationMixin(ApplicationV2)`), que es la referencia de estilo de código/JSDoc a seguir.

**Nota:** `features-and-moves.hbs` (el archivo original antes de dividir Features y Moves) fue eliminado y reemplazado por `features.hbs` + `moves.hbs` (ver sección 4).

## 4. Estructura de tabs: 5 tabs definitivas

**Decisión tomada:** el patrón real de tabs sobre `Dialog5e` es `tabGroups` (instancia) + `PARTS.tabs: { template: "templates/generic/tab-navigation.hbs" }` + `_getTabs()` + `_preparePartContext` (`context.tab = context.tabs[partId]`), confirmado funcionando igual que en `CurrencyManager` (que extiende `Application5e`, la misma base que `Dialog5e`). Originalmente se definieron 4 tabs, pero **se dividió `features-and-moves` en dos tabs independientes**, quedando la estructura definitiva en 5:

1. **`identity`** — Nombre, Imagen, N° Pokédex, Entrada de Pokédex.
2. **`stats`** — Ability Scores (agrupadas en `<fieldset>` "Base Info"/"Ability Scores"/"Proficiencies"), Hit Die (`<select>`), HP total, Nivel Inicial, Skill Proficiencies, Saving Throw Proficiencies, Size, Natural Armor Class.
3. **`features`** — Tipos, Habilidades (feats, ahora seleccionadas vía picker de `CompendiumBrowser`, ver sección 6.1), Egg Group, Gender (checkbox + ratio con textos de porcentaje/emoji), Speeds (incluyendo Fly+Hover en una sola fila), Special Senses.
4. **`moves`** — TM moves, Egg Moves, y 20 niveles fijos (1-20) de movimientos con labels dinámicos ("Starting Moves at Level 1" para el nivel 1, "Moves Learned at Level X" para el resto). **Ya no usan `<multi-select>` nativo**: cada campo es ahora un picker con botón "Browse Moves..." + tags removibles, respaldado por `CompendiumBrowser.select()` (ver sección 6.1).
5. **`evolution`** — Pre-Evolution, Next Evolution (con placeholder dinámico del nombre del Fakemon y textarea de descripción), y Evolutionary Stages (condicional), agrupados en 3 `<fieldset>` separados.

Archivos `.hbs`: `identity.hbs`, `stats.hbs`, `features.hbs`, `moves.hbs`, `evolution.hbs`.

### Bug de "tab activa" resuelto (aplica a las 5 tabs)

El `.hbs` de cada tab debe llevar la clase `cssClass` que retorna `_getTabs()` **en el propio `<div class="tab ...">`**, no solo en la nav. Patrón correcto confirmado contra plantillas reales de dnd5e:
```hbs
<div class="tab {{ tab.cssClass }}" data-group="{{ tab.group }}" data-tab="{{ tab.id }}">
```
Sin esto, ninguna tab se mostraba hasta hacer clic en otra tab primero. Ya aplicado en las 5 `.hbs`.

## 5. Nuevos campos agregados en sesiones anteriores

### `stats.hbs`
- **Ability Scores** ahora se muestran como par **Score (editable, `<input type="number">`) + Mod (solo lectura, calculado en vivo por JS)**, en vez de un solo input. Patrón visual replicado del propio `character-sheet-2.hbs` de dnd5e (`.mod` + `.score`). Manejado por lógica dentro de `_onRender`.
- **Hit Die** cambiado de `<input type="number">` libre a `<select>` con opciones fijas `d4/d6/d8/d10/d12`.
- Todo agrupado en `<fieldset><legend>...</legend>` (patrón nativo confirmado en `details-facility.hbs` de dnd5e) — secciones: "Base Info" (size, hit die, HP, nivel), "Ability Scores", "Proficiencies" (skills + saves).
- **Skill Proficiencies** y **Saving Throw Proficiencies**: `<multi-select>` poblados directamente desde `CONFIG.skills`/`CONFIG.abilities`, disponibles gratis en el contexto porque la clase base de `Dialog5e` ya inyecta `context.CONFIG = CONFIG.DND5E` en `_prepareContext`.

### `features.hbs`
- **Has Gender** (`<input type="checkbox" name="hasGender" checked>`) + **Gender Ratio** (`genderRatio.female` / `genderRatio.male`, calculado automáticamente el segundo a partir del primero vía JS), ahora con textos `% ♀️` y `% ♂️` junto a cada input (`<span class="sep pk5e-gender-female-unit">`/`pk5e-gender-male-unit`) + un tercer input oculto **"Genderless"** (`readonly`, texto fijo) que se muestra solo cuando el checkbox está desmarcado. Al desmarcar, los `<span>` de porcentaje/emoji también se ocultan junto con sus inputs. Todo manejado por el método `#bindGenderRatioInputs` en `_onRender`.
- **Speeds** (`movement.walk/climb/fly/swim/burrow` + `movement.units`) y **Special Senses** (`senses.darkvision/blindsight/tremorsense/truesight` + `senses.units`), cada uno agrupado en su propio `<fieldset>`.
- **Fly + Hover en una sola fila**: el `<input name="movement.fly">` ahora comparte `.form-fields` con el `<span class="sep unit">ft.</span>`, un `<span class="sep">Is hover?</span>` y el `<input type="checkbox" name="movement.hover">`, en vez de estar en filas separadas.
- **Size** (`<select name="size">` con `CONFIG.actorSizes`).
- **Natural Armor Class** (`naturalArmorClass`, mapea a `attributes.ac.flat` con `calc: "natural"` según `CONFIG.DND5E.armorClasses.natural`).
- **Possible Abilities** (renombrado desde `abilities` a **`possibleAbilities`**, ver sección 6.2) y **Possible Hidden Abilities** (`possibleHiddenAbilities` — **nombre confirmado leyendo el `data-field` real del `.hbs`, no `hiddenAbilities` como se documentó erróneamente en una versión anterior de este archivo**): ambos ahora son pickers con botón "Browse Abilities..." en vez de `<multi-select>`. **Decisión confirmada por el usuario:** ambos comparten exactamente el mismo pool/filtro de features elegibles (mismo catálogo de "monster"/"ability"), la única diferencia es a qué campo del formulario va cada resultado — analogía dada por el usuario: "es como movimientos a aprender a nivel 1 y a nivel 2, necesitan los mismos datos".

`movement.*`, `senses.*`, `size`, `naturalArmorClass` están mapeados hacia el actor real (ver sección 12). `eggGroup` sigue leyéndose solo para la biografía (sección 15), sin destino adicional. **`possibleAbilities`** ahora SÍ tiene destino adicional: la primera UUID del array se resuelve y se embebe como Item real en el actor (ver sección 16) -- decisión del usuario: "si tiene al menos 1, agrega esa". **`possibleHiddenAbilities` sigue sin destino fuera de la biografía** -- pendiente sin confirmar (ver sección 13, pendiente #3).

### `evolution.hbs`

- **Reestructurada en 3 `<fieldset>`**: "Pre-Evolution", "Next Evolution", "Evolutionary Stages".
- **Has Pre-Evolution** (`hasPreEvolution`, checkbox) + **Pre-Evolution Name** (`preEvolution`, `<input type="text">` con placeholder), con un input oculto de solo lectura `preEvolution.none` ("No Pre-Evolution") que se muestra cuando el checkbox está desmarcado. Toggle manejado por `#bindEvolutionInputs`.
- **Has Next Evolution** (`hasNextEvolution`, checkbox) + **Next Evolution Description**: bloque apilado verticalmente (`pk5e-evolution-fields-stacked`, `flex-direction: column` inline vía JS) compuesto por:
  - Un texto introductorio dinámico (`<span class="pk5e-fakemon-name-placeholder">`) que muestra "`{{Nombre del Fakemon}}` can evolve into..." sincronizado en vivo con el campo `name` de `identity.hbs` (método `#bindFakemonNamePlaceholder`, con fallback al texto literal "Fakemon" si el nombre está vacío).
  - Un `<textarea name="nextEvolution" rows="3">` con placeholder de ejemplo ("Fakemon2 at level X or above...").
  - Un input oculto de solo lectura `nextEvolution.none` ("No Next Evolution"), con `min-height` fijado inline con `!important` (ver bug resuelto en sección 5 previa).
  - Al desmarcar el checkbox, se ocultan tanto el texto introductorio como el `textarea`, dejando visible solo el input de solo lectura.
- **Evolutionary Stages** (condicional — solo visible si `hasPreEvolution` **OR** `hasNextEvolution` está marcado):
  - **Total Evolutionary Stages** (`evolutionStages`, `<input type="number">`, mínimo 1) — cuántas fases evolutivas tiene la línea completa de la especie.
  - **Current Evolutionary Stage** (`currentEvolutionStage`, `<select>` generado dinámicamente en JS según el total ingresado): opción `1` = "Initial Stage", última opción = "Final Stage", intermedias = "Intermediate Stage N" (numeradas si hay más de una intermedia).
  - El `<select>` se reconstruye en vivo cada vez que cambia `evolutionStages` (evento `input`), preservando la selección previa si sigue siendo válida para el nuevo total, o cayendo a `1` si no.
  - **No se protege la persistencia de estos 2 campos** al ocultarse/mostrarse (decisión explícita: "lo escrito en las evolutionary stages no es relevante"). En cambio, sí se preserva lo escrito en `preEvolution`/`nextEvolution`, porque el toggle de todo el bloque es puramente visual (`style.display`, sin re-render de la tab).
  - **NUEVO (esta sesión):** la lógica de "etiqueta de fase" (Initial/Intermediate/Final Stage) ya existía duplicada dentro de `#bindEvolutionaryStages` (para el propio `<select>`) y ahora se volvió a necesitar, con la misma fórmula, dentro de `#buildBiographyHtml` (sección 15) para el texto `"N / Total (Label)"`. **Sigue duplicada en dos lugares distintos del código** — no se extrajo a un método compartido (`#evolutionStageLabel`) en esta sesión; queda como mejora pendiente menor (ver sección 13).

#### Bug resuelto: `input[readonly].pk5e-next-evolution-none` con altura 14.95px en vez de 26px

- **Síntoma:** al desmarcar "Has Next Evolution" (mostrando el input de solo lectura dentro del contenedor apilado en columna), su altura computada quedaba en `14.95px` en vez de los `26px` esperados (`--form-field-height`), incluso forzando `height` con `!important` inline.
- **Causa exacta no identificada del todo** (ver pendiente en sección 13) — se confirmó empíricamente que `min-height` con `!important` sí sobreescribe el valor, pero `height` con `!important` no.
- **Solución aplicada (definitiva, no solo provisional):** `min-height: var(--input-height) !important;` inline en el propio input, directamente en el `.hbs`.

## 6. Divisor visual "ampersand" (línea + logo dorado entre nav de tabs y contenido) — ✅ RESUELTO

- **Confirmado el patrón nativo de dnd5e**: `<hr class="ampersand">` entre el `<nav>` de tabs y el `<section class="sheet-body">`, con el ícono puesto vía `background: url(...) no-repeat center / contain` en `less/v2/apps.less`.
- **Implementación elegida**: reutilizar la clase `.ampersand` (para heredar gratis el gradiente dorado y el posicionamiento/tamaño) pero sobreescribir solo el `background-image` inline vía JS en `_onRender`, apuntando al `pokeball.svg` del módulo — **sin tocar ningún `.less`/`.css` del sistema ni el `styles/main.css` propio**.
- **Color**: el SVG de la pokeball es negro por defecto. Se aplicó un `filter` CSS inline (`invert(64%) sepia(14%) saturate(563%) hue-rotate(3deg) brightness(89%) contrast(90%)`) para convertirlo a dorado.

### Bug del `<hr>` invisible en la tab "moves" — ✅ RESUELTO
Causa: `.window-content` es flex-column; sin `flex-shrink: 0`, Chrome colapsaba el `<hr>` al crecer
la tab "moves" (bug específico de Chrome, no reproducible en Firefox). Fix: `flexShrink = "0"`
inline vía JS en el `<hr class="ampersand">`.

## 6.1. Picker de movimientos/habilidades basado en `CompendiumBrowser` — ✅ IMPLEMENTADO Y PROBADO

**Motivación:** los `<multi-select>` nativos (22 campos de moves + 2 de abilities) duplicaban el catálogo completo de ~800 movimientos/features en el DOM en cada campo (~17,600 nodos DOM en moves), sin buscador. Se decidió reemplazarlos por un patrón de picker respaldado por `dnd5e.applications.CompendiumBrowser`, verificado exhaustivamente en consola antes de escribir el código final.

### Comportamiento confirmado de `CompendiumBrowser` (verificado contra el código fuente)
- `CompendiumBrowser.select(options)` devuelve `Promise<Set<string>|null>` de UUIDs, soporta multi-selección.
- `selection: { min: null, max: null }` (default) = checkboxes desactivados. Siempre pasar `max` numérico (ej. `999`) para activarlos.
- `#selected` (Set de instancia) persiste entre re-renders internos mientras la instancia viva.
- `additional: { subtype: { ability: 1 } }` (formato `{ valor: 1 }`) filtra correctamente el pool de moves/abilities.

### Implementación final confirmada funcionando en runtime

- Cada campo picker (`moves.tm`, `moves.egg`, `moves.level.{1-20}`, `possibleAbilities`, `possibleHiddenAbilities`) es un contenedor `<div class="pk5e-move-picker" data-field="{{nombreDelCampo}}">` con:
  - Un `<button type="button" data-action="openCompendiumPicker" data-filter-type="move|ability">Browse...</button>`.
  - Un `<div class="pk5e-move-picker-tags tags">` donde se pintan los resultados como tags removibles.
  - Hidden inputs (`<input type="hidden" name="{{nombreDelCampo}}" value="{{uuid}}">`) por cada UUID seleccionado — mismo `name` repetido, para que `FormDataExtended`/`expandObject` los junte en array.
- `#onOpenCompendiumPicker(event, target)`: resuelve `picker`/`fieldName` vía `target.closest("[data-field]")`, llama a `CompendiumBrowser.select({ filters, selection: { min: null, max: 999 } })`, resuelve los UUIDs nuevos a nombres, los mergea en un `Map` de instancia (`#pickerSelections`, uno por `fieldName`) para no perder selecciones anteriores del mismo campo, y llama a `#renderPickerTags` para pintar tags + hidden inputs.
- **Confirmado y en uso real en la biografía (sección 15):** `fieldName` viene siempre de `picker.dataset.field` (el atributo `data-field` en el `.hbs`), y coincide exactamente entre escritura (`#onOpenCompendiumPicker`) y lectura (`#renderPickerTags` y ahora también `#buildBiographyHtml`) — verificado leyendo el cuerpo completo de ambos métodos y los `data-field` reales de `moves.hbs`/`features.hbs`.
- `#onSubmit` usa `this.#pickerSelections.get(fieldName)` (un `Map<uuid, name>` ya resuelto en memoria) para obtener los nombres de moves/abilities en la biografía, **en vez de volver a llamar `fromUuid()`** — decisión confirmada por el usuario por rendimiento/simplicidad.

## 6.2. Colisión de nombre `"abilities"` — ✅ RESUELTA

El `<multi-select>` (ahora picker) de "Possible Abilities" en `features.hbs` usaba `name="abilities"`, chocando con `data.abilities` (las 6 Ability Scores del actor) usado en `#onSubmit`. **Resuelto:** renombrado a `possibleAbilities` en el HTML. El campo de "Possible Hidden Abilities" usa `possibleHiddenAbilities` (ver corrección de nombre en sección 5).

## 6.3. UUIDs de Tipos hardcodeados en `fakemonCreationForm.js` — ✅ IMPLEMENTADO

**Decisión tomada:** en vez de modificar `POKEMON_TYPES`/`addPokemonSystemProperties.js` (que sigue usándose intacto para `CONFIG.DND5E.damageTypes` y para poblar el `<multi-select>` de tipos en `features.hbs`), se agregó una constante nueva y separada **solo dentro de `fakemonCreationForm.js`**:

```js
const POKEMON_TYPE_UUIDS = {
	bug: "Compendium.pokemon5e.pokemon_features.Item.jK466h0FxTM3E9y5",
	dark: "Compendium.pokemon5e.pokemon_features.Item.0ImTngm94sacmzTJ",
	// ...los 18 tipos reales, EXCLUYENDO "typeless" (no tiene Item real en el compendio)
};
```

Se guarda el **UUID completo** (`"Compendium.pokemon5e.pokemon_features.Item.{id}"`), no el ID pelado, para usarlo directo en `@UUID[...]{Label}` dentro de la biografía sin reconstruir el string. Solo se usa como diccionario de traducción `slug → UUID` dentro de `#buildBiographyHtml` (sección 15), nunca para poblar ningún `<select>`/`<multi-select>` (esos siguen usando `POKEMON_TYPES` tal cual, ver sección 6.4).

## 6.4. Bug: `<multi-select name="pokemonTypes">` guardaba índices numéricos en vez de slugs — ✅ RESUELTO

- **Síntoma confirmado en consola:** `data.pokemonTypes` llegaba como `["0", "17"]` (índices del array `POKEMON_TYPES`) en vez de `["fire", "water"]` (los slugs reales), rompiendo cualquier lookup posterior en `POKEMON_TYPE_UUIDS[slug]`.
- **Causa confirmada comparando contra el patrón real de `dnd5e`:** el helper `selectOptions` (del *core* de Foundry, no de `dnd5e`), cuando recibe un **array plano de strings** sin indicar explícitamente qué usar como `value`, usa el **índice numérico** del array como `value` de cada `<option>` generado — no el string mismo. `dnd5e` nunca pasa un array plano de strings a `selectOptions` para este propósito; siempre usa objetos/`Record` con clave semántica, o bien evita el helper y usa un `{{#each}}` manual con `<option value="{{ @key }}">`.
- **Intento fallido:** `{{ selectOptions pokemonTypes valueAttr=false }}` — no corrigió el problema (el parámetro no existe o no se comporta como se esperaba en esta versión del helper core).
- **Fix definitivo aplicado y confirmado funcionando:** reemplazar el `selectOptions` por un `{{#each}}` manual en `features.hbs`:
  ```hbs
  <multi-select name="pokemonTypes">
  	{{#each pokemonTypes}}
  	<option value="{{ this }}">{{ this }}</option>
  	{{/each}}
  </multi-select>
  ```
- No hizo falta tocar `_prepareContext` ni `POKEMON_TYPES`/`addPokemonSystemProperties.js` — el `.filter(type => type !== "typeless")` que ya existía en `_prepareContext` sigue funcionando igual, solo cambió cómo se pintan los `<option>` en el `.hbs`.

## 7. Bugs encontrados y corregidos

1. **`#bindAbilityModCalculation` llamado pero no definido como método** — corregido, la lógica quedó inlined directamente en `_onRender`.
2. **`this` incorrecto dentro de `#onSubmit` (handler estático de formulario)** — corregido, reemplazado `this.#calculateHitPointsAdvancement`/`this.#HP_STATUS` por `FakemonCreationDialog.#calculateHitPointsAdvancement`/`FakemonCreationDialog.#HP_STATUS`.
3. **Lógica de `disabled` invertida en `#bindGenderRatioInputs`** — corregido, `genderlessInput.disabled = true` fijo.
4. **`context.availableMoves?.sort is not a function`** — corregido, envolviendo con `Array.from(...)` antes de `.sort()`.
5. **Divisor "ampersand" invisible en Chrome en la tab "moves"** — ver sección 6, causa real: flex-shrink de Flexbox, resuelto con `flexShrink = "0"` inline.
6. **Falta el `min-height` explícito en el input de solo lectura de "Next Evolution"** — ver sección 5, resuelto con `min-height !important` inline.
7. **Formulario sin botón de envío visible** — causa: `FakemonCreationDialog.DEFAULT_OPTIONS` no definía la propiedad `buttons`, por lo que `Dialog5e._prepareFooterContext` (que hace `this.options.buttons?.map(...)`) devolvía `context.buttons = undefined`. **Corregido:** se agregó `buttons: [{ action: "submit", icon: "fa-solid fa-check", label: "Create Fakemon", type: "submit" }]` a `DEFAULT_OPTIONS`, siguiendo el patrón de `TransformDialog`.
8. **`CompendiumBrowser.select({ selection: { min: null, max: null } })` no mostraba checkboxes.** Causa confirmada leyendo `displaySelection()` en runtime: ambos en `null` equivale a "selección desactivada". **Corregido:** siempre pasar un `max` numérico (`max: 999`) en las llamadas del picker (ver sección 6.1).
9. **Al pulsar "Create Fakemon" la página se recargaba por completo (URL cambiaba a un GET con todos los campos como query params).** Causa confirmada con un macro de conteo de `<form>` reales en el DOM: `FakemonCreationDialog` define `tag: "form"` en su `DEFAULT_OPTIONS` (heredado también de `Dialog5e`), pero `Dialog5e.DEFAULT_OPTIONS.window.contentTag` es también `"form"` por defecto — esto generaba un `<form class="window-content standard-form">` **anidado dentro** del `<form>` raíz de la app (HTML inválido), lo que hacía que el navegador interceptara el submit nativo antes de que `form.handler` (`#onSubmit`) se ejecutara. **Corregido:** se agregó `contentTag: "div"` dentro de `window` en `DEFAULT_OPTIONS` de `FakemonCreationDialog`, eliminando el `<form>` anidado.
10. **`TypeError: can't access property "con", data.abilities is undefined` dentro de `#onSubmit`.** Causa confirmada comparando contra **todos** los consumidores reales de `FormDataExtended` en `dnd5e` (`TransformDialog#handleFormSubmission`, `ActivityUsageDialog#_prepareSubmitData`, `PseudoDocumentSheet#_prepareSubmitData`, `AdvancementConfig#_updateObject`): sin excepción, todos llaman a `foundry.utils.expandObject(formData.object)` antes de leer campos anidados, porque `formData.object` es **plano** (claves literales con puntos, ej. `"abilities.str.value"`), no anidado. `#onSubmit` hacía `const data = formData.object;` sin expandir. **Corregido:** `const data = foundry.utils.expandObject(formData.object);`.
11. **`TypeError: can't access property "sheet", actor is undefined` tras un intento de creación con `name` vacío.** Causa: `Actor.create(actorData, ...)` puede devolver `undefined` (validación fallida del núcleo, sin rechazar la promesa) sin que el código lo detectara, y el flujo seguía intentando `actor.sheet.render(true)` sobre `undefined`. **Corregido:** se agregó un guard `if (!actor) { pk5eLog(...); ui.notifications.error(...); return; }` inmediatamente después de `Actor.create`.
12. **`img: does not have a valid file extension`** — ver detalle en sección 15.
13. **`<multi-select name="pokemonTypes">` guardaba índices en vez de slugs** — ver detalle en sección 6.4
14. **La clase "Pokémon Level" se creaba siempre en nivel 0** (`system.levels: 0`), decisión inicial equivocada para evitar una supuesta "duplicación" con `attributes.hd.max`. Causa real confirmada leyendo `NPCData#prepareBaseData`: por cada Item de clase, `details.level`/`attributes.hd.max` se **suman** (`+=`), no se sobreescriben -- con `levels: 0` la clase nunca aportaba nivel al actor. **Corregido:** `system.levels: Number(data.minLevel) || 1`, de forma que `details.level` del actor termine igual a `minLevel`, como se espera.

## 8. Decisión de UX: no se implementará búsqueda/filtro de texto adicional más allá del picker

Se evaluó (y se descartó en su momento) replicar el patrón completo de búsqueda del `CompendiumBrowser` directamente sobre `<multi-select>` nativos. **Esto quedó resuelto de otra forma:** en vez de agregar buscador al `<multi-select>`, se reemplazó el `<multi-select>` completo por el picker de `CompendiumBrowser` (sección 6.1), que ya trae su propio buscador/filtros nativos incluidos gratis. No se debe volver a proponer un buscador custom adicional salvo pedido explícito.

## 8.1. Decisión de UX: no se implementará filtrado de niveles de movimientos según el Nivel Mínimo

Se evaluó condicionar qué niveles (1-20) se muestran en `moves.hbs` según el valor de `minLevel` (`stats.hbs`). Requeriría re-renderizar la tab, perdiendo las selecciones ya hechas en los pickers afectados. **Decisión: se acepta esa pérdida y no se implementa por ahora** — "este creador de fakemon es sencillito, lo más simple que podamos". Queda como mejora futura.

**Nota relacionada confirmada en esta sesión:** en la biografía, "Starting" (nivel mínimo/inicial) se considera equivalente a `moves.level.{minLevel}` — confirmado explícitamente por el usuario (ver sección 15).

## 9. El problema central: HP dinámico en NPCs con clases

**Por qué importa:** en `dnd5e`, el HP máximo de un NPC solo se recalcula dinámicamente al cambiar CON si el NPC tiene un Item de clase embebido con una advancement `HitPoints`. Los Pokémon (bestiario oficial) tienen HP fijo predefinido que no siempre es lineal con la progresión de dados de golpe por nivel, de ahí que exista `NpcHpFixer`.

**Mecanismo confirmado en el código fuente de `dnd5e`:**
- `HitPointsAdvancement.valueForLevel(data, hitDieValue, level)`: `"max"` → `hitDieValue`; `"avg"` → `(hitDieValue/2)+1`; número → literal.
- `HitPointsAdvancement.getAdjustedTotal(mod)`: suma `Math.max(valueForLevel(level) + mod, 1)` por cada nivel en `value`.
- **Detalle crítico:** en un NPC, `HitPointsAdvancement.hitDie` usa `actor.system.attributes.hd.denomination` (número plano, ej. `12`), no `item.system.hd.denomination` (string con "d", ej. `"d12"`). No mezclar ambos formatos.
- `AttributesFields.prepareHitPoints` trata `hp.max` de los datos fuente como offset base (`hp.max = (hp.max ?? 0) + base + bonus`) — compatible con el diseño actual de `actorData.system.attributes.hp`.
- Cuando se cree el Item de clase embebido (pendiente, sección 13), debe hacerse con `actor.createEmbeddedDocuments("Item", [...], { keepId: true })`, siguiendo el mismo patrón que usa el propio `AdvancementManager` del sistema al aplicar cambios.

**Decisión tomada:** el formulario calcula y asigna el HP directamente en la creación vía `#calculateHitPointsAdvancement` (retorna `{ value, hpBonus }`), reutilizando la misma lógica de corrección (`CORRECTED`/`UNCORRECTABLE`) del `NpcHpFixer` ya existente. **✅ Confirmado funcionando en runtime**: probado con `desiredHP: 0` (caso inválido, correctamente abortado con mensaje al usuario, sin cerrar el diálogo) y con un HP válido, actor creado exitosamente.

**✅ RESUELTO (sesión 3):** el Item de clase embebido "Pokémon Level" ya se crea en `#onSubmit`, con `system.advancement: [{ type: "HitPoints", configuration: {}, value: hpResult.value }]` y `system.hd.denomination: \`d${hitDieValue}\``. Confirmado con datos reales (Gatomon, HP deseado 13, hit die 6, CON +2): antes del fix, `system.attributes.hp.max` quedaba en `5` (el `hpBonus` puro, sin ningún Item de clase que aportara el `base`); tras crear el Item, el HP final coincide con el deseado. `system.levels` del Item se fija en `minLevel` (bug #14, sección 7) para que `details.level` del actor refleje el nivel real del Fakemon. Ver implementación completa en sección 16.

Aquí tienes la continuación desde el punto 10, lista para copiar y pegar a partir de donde quedó tu fragmento:

## 10. Decisiones ya cerradas sobre el contenido del formulario

| Tipo de dato | Decisión |
|---|---|
| Moves | Selección desde compendios existentes (`pokemon5e.pokemon_moves`) vía picker de `CompendiumBrowser` (ver sección 6.1), no `<multi-select>`. TM moves, Egg Moves, y **20 niveles fijos (1-20)** siempre visibles con labels dinámicos. |
| Features/abilities (feats) | Selección desde compendio `pokemon5e.pokemon_features` vía picker de `CompendiumBrowser`, filtrado por `system.type.value === "monster"` y `subtype: "ability"`. "Possible Abilities" (`possibleAbilities`) y "Possible Hidden Abilities" (`possibleHiddenAbilities`) comparten el mismo pool/filtro — decisión confirmada por el usuario. |
| Egg Group | Lista de opciones típicas (`<multi-select>`, valores ya capitalizados como texto de presentación, ej. "Water 1", "No Eggs Discovered") |
| Género/ratio | Checkbox "Has Gender" + dos inputs numéricos (`genderRatio.female`/`.male`) + modo "Genderless" de solo lectura. En la biografía, se muestra como fracción reducida por GCD + redondeo al step canónico de Pokémon más cercano (ver sección 15). |
| Evolución (pre/post) | Solo texto libre, sin vínculo a UUID de ningún actor real. Checkboxes "Has Pre-Evolution"/"Has Next Evolution" + campo condicional de fases evolutivas. En la biografía se muestra el texto libre + una etiqueta de fase ("N / Total (Initial/Intermediate/Final Stage)"). |
| Biografía | Datos simples capturados en el formulario; HTML generado en código (`#buildBiographyHtml`, ver sección 15), guardado tal cual (sin resolver `@UUID[...]`) en `system.details.biography.public`. Se excluyen explícitamente "Species Rating (SR)" y "Species Traits" del macro viejo — SR solo se usa para fijar `details.cr = 0`, y Species Traits no tiene campo equivalente en el formulario actual, así que no se pide ni se muestra. |
| SR / CR | Nunca se pide al usuario. `details.cr` queda fijo en `0` siempre, decisión cerrada desde la sesión anterior. |
| `details.type` (creature type) | No se define explícitamente — queda vacío/por defecto (`CreatureTypeField` acepta `value: ""` en blanco). |

## 11. Flujo completo de `#onSubmit` (estado al cierre de esta sesión)

1. `event.preventDefault()` implícito por el guard de `<form>` no anidado (ver sección 7, bug #9).
2. `const formData = new FormDataExtended(this.element);` seguido de `const data = foundry.utils.expandObject(formData.object);` (fix del bug #10).
3. `pk5eLog("pk5e (fakemon creation): Form submitted", data);` — log de depuración, se mantiene.
4. **Validación de campos requeridos** (`name`, `pokedexNumber`, `pokedexEntry`, `size`, `hitDie`, `hpBase`, `minLevel`, `naturalArmorClass`, las 6 ability scores): si falta alguno, `ui.notifications.warn(...)` listando TODOS los faltantes de una vez, sin cerrar el diálogo. **Nuevo en esta sesión** (ver sección 16).
5. `FakemonCreationDialog.#calculateHitPointsAdvancement(...)` → `{ value, hpBonus }`, reutilizando la lógica de `NpcHpFixer` (ver sección 9). Si el resultado es inválido (`desiredHP <= 0`), se aborta con `ui.notifications.error(...)` sin cerrar el diálogo.
6. `const biographyHtml = this.#buildBiographyHtml(data);` — genera el HTML completo de la biografía (ver sección 15).
7. Validación de `img`: regex de extensión de imagen sobre `data.img`; si no matchea, `validImg = undefined` (fix del bug #12, sección 7).
8. Construcción de `actorData` con `type: "npc"`, `img: validImg`, `system.attributes.hp/movement/senses/ac`, `system.abilities` (incluyendo `proficientSaves` ya fusionado en `abilities.{key}.proficient`), `system.skills`, `system.traits.size`, `system.details.cr = 0`, `system.details.biography.public = biographyHtml`.
9. `const actor = await Actor.create(actorData, { renderSheet: false });` + guard `if (!actor) { ...; return; }` (fix del bug #11, sección 7).
10. **✅ Implementado (sesión 3):** construcción y `createEmbeddedDocuments("Item", [...])` en un solo llamado con: el Item de clase "Pokémon Level" (`HitPointsAdvancement`, sección 9), los Items de Tipo (`POKEMON_TYPE_UUIDS`, sección 6.3), el primer Item de `possibleAbilities` (si existe alguno), y los primeros 4 Items de `moves.level.*` (orden ascendente de nivel) + Struggle obligatorio. Ver detalle completo en sección 16.
11. `actor.sheet.render(true);`.
12. `try/catch` general envolviendo todo el método, con `console.error` + `ui.notifications.error` genérico para cualquier excepción no prevista.

## 12. Separación conceptual: campos que van al Actor real vs. campos que solo van a la biografía

Es importante no confundir estos dos destinos al seguir mapeando pendientes (sección 13):

- **Van al Actor real (`actorData.system.*`)**: `name`, `img` (validado), `folder`, `attributes.hp/movement/senses/ac`, `abilities` (las 6 stats, con `proficientSaves` fusionado en `abilities.{key}.proficient` -- ✅ confirmado, sección 13), `skills`, `traits.size`, `details.cr`, `details.biography.public` (el HTML generado).
- **Van al Actor real como Items embebidos** (`createEmbeddedDocuments`, sección 16): el nivel mínimo/hit die/HP vía el Item de clase "Pokémon Level" (`hitDie`, `hpBase`, `minLevel`), `pokemonTypes` (uno por tipo), la primera UUID de `possibleAbilities`, y los primeros 4 `moves.level.*` + Struggle obligatorio.
- **Van SOLO a la biografía (`#buildBiographyHtml`), sin ningún otro destino en el actor**: `pokedexNumber`, `pokedexEntry`, `possibleHiddenAbilities` (pendiente confirmar si necesita Item propio, ver sección 13, pendiente #3), `eggGroup`, `genderRatio.*`/`hasGender`, `moves.tm`/`moves.egg` y el resto de niveles de `moves.level.*` no embebidos, `hasPreEvolution`/`preEvolution`, `hasNextEvolution`/`nextEvolution`, `evolutionStages`/`currentEvolutionStage`, `naturalArmorClass` (aparece en la biografía como texto informativo aunque su valor numérico también alimenta `attributes.ac.flat`). Nota: `pokemonTypes` y `possibleAbilities` ahora aparecen TANTO en biografía (texto/`@UUID[...]`) COMO embebidos como Item real -- no son mutuamente excluyentes.

## 13. Pendientes y estado de mapeo hacia el Actor

### Snapshot de mapeo (no repite la sección 12, solo lo que falta)

Todo lo que **ya está mapeado** hacia `actorData` (actor real) o usado en biografía está descrito en la sección 12. Lo único pendiente de destino final:

- `proficientSaves` → `system.abilities.{key}.proficient` — sin confirmar si sigue vigente en `#onSubmit` (pendiente bloqueante #1, abajo).
- Item de clase embebido con `HitPointsAdvancement` — sigue como `// todo:` literal, sin implementar (pendiente bloqueante #2, abajo).
- `possibleHiddenAbilities` — sin destino más allá del texto de biografía (pendiente bloqueante #3, abajo).

### 🔴 Bloqueantes / de mayor tamaño

1. **✅ RESUELTO.** `proficientSaves` se fusiona en `system.abilities.{key}.proficient` dentro de `#onSubmit`, confirmado en el código.
2. **✅ RESUELTO (sesión 3).** Item de clase "Pokémon Level" embebido con `HitPointsAdvancement`, con `levels: minLevel` (bug #14 corregido, sección 7). Ver implementación en sección 16.
3. **🟡 PARCIAL / SIN CONFIRMAR.** `possibleAbilities` ya tiene destino como Item embebido (solo la primera UUID). **`possibleHiddenAbilities` sigue sin destino fuera de la biografía** -- no se ha confirmado con el usuario si también necesita un Item embebido propio, o si la decisión final es dejarlo solo como texto informativo. **No asumir, preguntar primero.**

### 🟡 Calidad de la biografía

4. **✅ RESUELTO.** El usuario corrigió directamente el formato de la biografía (negritas, centrados, orden de datos) sin necesitar más cambios de código.

### 🟢 Menores / cosméticas

5. **Duplicación de la lógica de etiqueta de fase evolutiva** (Initial/Intermediate/Final Stage) entre `#bindEvolutionaryStages` (`<select>` del formulario) y `#buildBiographyHtml` (texto de biografía) — candidato a extraer a un método compartido `#evolutionStageLabel(current, total)`.
6. **Causa raíz exacta no identificada** del bug de `min-height` en `input[readonly].pk5e-next-evolution-none` (sección 5) — la solución aplicada funciona; no se investigó por qué `height !important` no bastaba y `min-height !important` sí.
7. Estilizado general de `features.hbs` (sin mejora visual específica identificada, solo mencionado como posible pulido futuro).

### Al retomar la próxima sesión, en este orden

1. Punto #3 (`possibleHiddenAbilities`) — pendiente real restante, preguntar antes de asumir.
2. Puntos #5/#6/#7 (menores/cosméticas) — solo si hay tiempo, no bloqueantes.

## 15. Generador de biografía — `#buildBiographyHtml` (implementado esta sesión)

### Alcance y exclusiones confirmadas por el usuario

- Cubre: Pokédex (número + entrada), Types (con `@UUID[...]` reales vía `POKEMON_TYPE_UUIDS`, sección 6.3), tabla de Ability Scores + modificadores, Size (label vía `CONFIG.DND5E.actorSizes[key].label`), Minimum Level, Natural AC, Initial HP, Speeds y Special Senses (omitiendo los que valen `0`), Saving Throws y Skills proficientes (labels vía `CONFIG.DND5E.abilities`/`CONFIG.DND5E.skills`, ya pre-localizados por el propio `dnd5e` al arrancar el juego — confirmado leyendo el hook `i18nInit` + `performPreLocalization` del código fuente de `dnd5e`), Moves (Starting = `moves.level.{minLevel}`, luego niveles superiores, luego TMs, luego Egg Moves, en ese orden final), Género (fracción reducida por GCD + redondeo a los steps canónicos de Pokémon —0/12.5/25/…/100—, dejando la fracción "rara" tal cual si no hay un step suficientemente cercano), y Evolución (texto libre de `preEvolution`/`nextEvolution` + etiqueta de fase `"N / Total (Initial/Intermediate/Final Stage)"`).
- **Excluye explícitamente y a propósito** (decisión cerrada por el usuario): "Species Rating (SR)" y "Species Traits" del macro viejo — ninguno de los dos tiene campo equivalente en el formulario actual ni se piensa agregar.
- Lee nombres de moves/abilities desde `this.#pickerSelections.get(fieldName)` (`Map<uuid, name>` ya resuelto en memoria), nunca vuelve a llamar `fromUuid()` — decisión de rendimiento confirmada por el usuario (sección 6.1).
- El HTML se guarda crudo (con `@UUID[...]` sin resolver) en `system.details.biography.public`; el enriquecido a links reales ocurre en tiempo de render de la ficha, no al guardar (confirmado leyendo `npc-biography.hbs` del propio `dnd5e`, que usa `{{{ enriched.public }}}`).

### Bugs resueltos durante la construcción de la biografía

- **`img: does not have a valid file extension`** (bug #12, sección 7) — descubierto al probar con una URL externa de wiki sin extensión de imagen al final del path.
- **`pokemonTypes` guardaba índices en vez de slugs** (bug #13 / sección 6.4) — descubierto al inspeccionar el log real de `data.pokemonTypes` (`["0", "17"]`) antes de intentar resolver `POKEMON_TYPE_UUIDS[slug]`.

### Estado de calidad al cierre de la sesión

El usuario confirmó que la biografía generada funciona de punta a punta (probado con un Fakemon real, "Gatomon", incluyendo tipos con `@UUID[...]` resueltos correctamente al ver la ficha), pero indicó **"aún le falta bastante"** en cuanto a calidad/completitud, sin detallar los puntos específicos antes de que se acabara el tiempo de la sesión. No se debe asumir qué falta exactamente — es el primer punto a levantar la próxima vez (ver sección 13).

## 16. Items embebidos en el actor — Clase, Tipos, Ability y Moves (implementado sesión 3)

**Motivación:** hasta la sesión anterior, `Actor.create` no generaba ningún Item real embebido -- el HP quedaba mal (sección 9) y ni los Tipos, ni las Abilities, ni los Moves existían como Items jugables en la ficha, solo como texto/enlaces en la biografía.

### Item de clase "Pokémon Level"

- `system.levels: Number(data.minLevel) || 1` -- refleja el nivel mínimo del Fakemon (bug #14, sección 7).
- `system.hd.denomination: \`d${hitDieValue}\`` y `system.advancement: [{ type: "HitPoints", configuration: {}, value: hpResult.value }]` -- `hpResult.value` es el mismo `value` map ya calculado por `#calculateHitPointsAdvancement` (sección 9), reutilizado sin cambios.
- `img` fijo siempre en `"https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/others/lv.svg"` (decisión del usuario, no usa el `img` del actor).

### Items de Tipo

- Uno por cada slug en `data.pokemonTypes`, resuelto vía `fromUuid(POKEMON_TYPE_UUIDS[slug])` y clonado con `.toObject()`.

### Item de Ability

- Solo la **primera** UUID de `data.possibleAbilities` (si existe al menos una) se resuelve y embebe. El resto de "possible abilities" sigue solo en biografía. `possibleHiddenAbilities` NO tiene Item embebido (ver sección 13, pendiente #3, sin confirmar).

### Items de Moves

- Se recolectan los UUIDs de `data.moves.level.*` en orden ascendente de nivel (empezando en `minLevel`), se toman los primeros 4, y se agrega siempre `"Compendium.pokemon5e.pokemon_moves.Item.53VnJUr12moqMJim"` (Struggle) -- deduplicado con `Set`. `moves.tm`/`moves.egg` NO se incluyen en este conteo de "primeros 4" ni se embeben.
- Todos los Items (clase, tipos, ability, moves) se crean en un único `actor.createEmbeddedDocuments("Item", [...])`.

## 17. Validación de campos requeridos (implementado sesión 3)

- Campos requeridos: `name`, `pokedexNumber`, `pokedexEntry`, `size`, `hitDie`, `hpBase`, `minLevel`, `naturalArmorClass`, y las 6 ability scores (`abilities.{str,dex,con,int,wis,cha}.value`).
- Si falta alguno, se listan TODOS de una vez en un solo `ui.notifications.warn(...)` (no se detiene en el primero), y se aborta sin cerrar el diálogo.
- **Nota de diseño sin confirmar (self-flagged, no bloqueante):** el chequeo usa `!valor`, por lo que un `0` explícito en campos numéricos (ej. `naturalArmorClass: 0`) se trataría como "faltante". Se asumió que ningún campo tiene sentido legítimo en `0` para un Fakemon jugable -- no confirmado explícitamente por el usuario, pero tampoco reportado como problema tras la prueba.

## 18. Traducción a inglés (sesión 3)

- Todos los comentarios inline, `pk5eLog(...)` y mensajes de `ui.notifications` que estaban en español en `fakemonCreationForm.js` fueron traducidos a inglés, manteniendo la misma estructura/tono.
- Se dejó "Pokédex" sin traducir (nombre propio de la franquicia, no una palabra española del propio texto).