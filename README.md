<h1 align="center">Pokémon 5e Module for FoundryVTT</h1>

<div align="center">
  <a href="https://github.com/MissingGlitch/pokemon5e-foundry-module/releases/latest"><img src="https://img.shields.io/github/downloads/MissingGlitch/pokemon5e-foundry-module/total?style=for-the-badge&color=365fac&label=total%20downloads" alt="Total Downloads"/></a> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <a href="https://github.com/MissingGlitch/pokemon5e-foundry-module/releases/latest"><img src="https://img.shields.io/github/v/release/MissingGlitch/pokemon5e-foundry-module?style=for-the-badge&color=ffcc01&label=current%20version%20%28beta%29" alt="Current Version"/></a>
</div>

<div align="center">
  <img src="https://github.com/user-attachments/assets/a0396fd5-6e85-4083-82c9-a127b16dfbba" alt="Pokémon 5e Title Logo" height="250"/>
</div>

<div align="center">
  Module for the <strong><a href="https://poke5e.app/">Pokémon 5e</a></strong> homebrew system for <strong><a href="https://foundryvtt.com/">Foundry Virtual Tabletop</a></strong>.
</div>

<div align="center">
  <img src="https://github.com/user-attachments/assets/5b4a10d2-5b96-479f-b4fa-0f88620653d8" alt="Screenshot of a Pokémon sheet and a Compendium"/>
</div>

<div align="center">
  <i>This module includes compendiums with pre-made actors and items, automation tools, and everything necessary to play Pokémon 5e in FoundryVTT.</i>
</div>

<br/>

-----

<br/>

<h2 align="center">Minimum Compatibility Requirements</h2>

<p align="center">
  <a href="https://foundryvtt.com/"><img src="https://img.shields.io/badge/Foundry%20VTT-v13-FE6A1F?style=for-the-badge&logo=foundryvirtualtabletop" alt="Foundry V13"/></a> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <a href="https://foundryvtt.com/packages/dnd5e"><img src="https://img.shields.io/badge/D&D%205e-v5-ED1C24?style=for-the-badge&logo=dungeonsanddragons" alt="D&D5e V5"/></a>
</p>

<p>It is necessary to use at least <a href="https://foundryvtt.com/releases/13.341">Foundry v13.341</a> and <a href="https://github.com/foundryvtt/dnd5e/releases/tag/release-5.0.0">D&D5e v5.0.0</a> for the module to function. However, we recommend using the latest versions of <strong><a href="https://foundryvtt.com/">Foundry v13</a></strong> and <strong><a href="https://foundryvtt.com/packages/dnd5e">D&D5e v5</a></strong> for the best experience.</p>

<br/>

-----

<br/>

## Main Features

### Core System Additions
  - **Pokémon Types:** All 18 Pokémon Types as new Damage Types.
    - <img src="https://github.com/user-attachments/assets/0a4062dd-6b63-459c-8c90-c3f75e134c95" alt="Languages" height="250"/>

  - **World Languages:** Languages from all regions available in the main games.
    - <img src="https://github.com/user-attachments/assets/9214bbc5-56b3-4463-a63d-518189a089a5" alt="Languages" height="260"/>

  - **Status Conditions:** Status Conditions from the main games implemented as new conditions.
    - <img src="https://github.com/user-attachments/assets/8a923cd5-0e87-4dd7-904b-e024e3354ce5" alt="Status Conditions" height="260"/>

  - **Currency:** Replacement of all D&D currency types with the unique currency from the Pokémon games (₽).
    - <img src="https://github.com/user-attachments/assets/fda66a58-f42a-438e-82d6-abbf490bbe86" alt="Currency" height="70"/>
<br/>

### Comprehensive Compendiums
  - **Rules:** Contains journals with Pokémon 5e rules; currently includes a registry of all Pokémon with their statblocks and another for status condition rules.
  - **Trainers:** Everything related to trainer creation: classes, subclasses, specializations, races by region, and more.
  - **Items & Consumables:** Includes potions, berries, pokéballs, TMs, held items, evolution items, and more.
  - **Pokédex (Bestiary):** Over 1000 existing pokémon to date, pre-made and ready to use.
    - **Pokémon Moves:** Over 800 pre-made pokémon moves with their respective damage, scaling, range, areas, and PP.
    - **Pokémon Features:** Abilities, hidden abilities, special feats, pokémon types, loyalty, and more.

<p align="center">
  <img src="https://github.com/user-attachments/assets/1e412ee9-b4a4-4fb2-919f-a6c0d60dc9c0" alt="Compendiums"/>
</p>
<br/>

### Automations
  - **Auto Scaling Moves:** Automatic move damage increase based on level.
  - **Move Manager:** Allows for easy management of pokémon moves as they level up and learn new ones.

<p align="center">
  <img src="https://github.com/user-attachments/assets/ffbffa5c-4ba5-4d77-8f44-fe5dc3618ab7" alt="Using the Move Manager"/>
</p>
<br/>

### Future Implementations:
  - **More Homebrew:** Fakemon and Custom Move creator.
  - **App Compatibility:** Data transfer from <a href="https://poke5e.app/">poke5e.app</a> and <a href="https://github.com/Jerakin/Pokedex5E">pokédex5e</a>.
  - **Transformations:** Evolution, Mega Evolution, Terastalization, and others, within the character sheets.
  - **Default Token Art Selector:** Ability to choose between 2D Sprites, 3D Models, or Anime designs.

<br/>

-----

<br/>

## Installation

### Method 1 (Recommended): Manifest URL
1.  Launch Foundry VTT and go to the **Add-on Modules** tab.
2.  Click **Install Module**.
3.  Copy and paste the following URL into the **Manifest URL** field:
    ```
    https://github.com/MissingGlitch/pokemon5e-foundry-module/releases/latest/download/module.json
    ```
4.  Click **Install** and wait for the module to download.
5.  Enter your world and activate the module in the settings.

<br/>

### Method 2: Manual Installation
1.  Download the `.zip` file from the <strong>[Latest Release](https://github.com/MissingGlitch/pokemon5e-foundry-module/releases/latest)</strong>.
2.  Extract the content into the **modules** folder inside **Data**.
    By default, [Foundry User Data](https://foundryvtt.com/article/user-data/) is usually located at:
      - **Windows**: `AppData/Local/FoundryVTT/Data`
      - **Linux**: `/home/$USER/.local/share/FoundryVTT/Data`
      - **Mac**: `~/Library/Application Support/FoundryVTT/Data`
3.  Launch Foundry VTT and verify that the module appears in the **Add-on Modules** tab.
4.  Enter your world and activate the module in the settings.

<br/>

-----

<br/>

## Bug Reporting and Feedback
This project is still in development. If you find any errors —from a simple typo to a direct malfunction— you can report them in the feedback channel on Discord or [Open a GitHub Issue](https://github.com/MissingGlitch/pokemon5e-foundry-module/issues) by following these steps.

Before reporting, please confirm that:
1. You are using the [compatible versions](#minimum-compatibility-requirements) of Foundry and D&D5e.
2. You have the [latest version](https://github.com/MissingGlitch/pokemon5e-foundry-module/releases/latest) of the module installed.
3. The error hasn't already been reported in [Issues](https://github.com/MissingGlitch/pokemon5e-foundry-module/issues).

<br/>

If the error persists, please report it including data such as:
1. **Your Environment:** Versions (Foundry, D&D5e, Module), Operating System, Browser, and a list of other active modules.
2. **Steps to Reproduce:** A simple numbered list of what you did. Test in a clean world with only this module active to check for conflicts with other modules.
3. **Result:** What you expected to happen and what actually happened.
4. **Evidence:** Screenshots, Videos, GIFs, and/or any error messages.
5. **Logs:** Any messages or logs from the console (opened with F12) from the moment the error occurred.
    - If possible, enable the option to show module log messages in your world settings.

<br/>

-----

<br/>

## Contributing to Development

Whether it's adding new items, correcting moves, or improving script functionality, if you wish to collaborate on the development of the module, follow these steps:

1.  Fork the project.
2.  Create a new branch for your contribution.
3.  Submit a Pull Request explaining your changes and additions, including screenshots if possible.

We will review and test your changes before deciding to add them to the module.

<br/>

-----

<br/>

## Support & Contact:

- <span style="text-decoration:underline">Lead Module Developers:</span>
  - [Moge](https://github.com/Moge5e), [Missing Glitch](https://github.com/MissingGlitch).

<br/>

- <span style="text-decoration:underline">Contributors and Special Thanks:</span>
  - <strong>[Auroratide](https://github.com/Auroratide)</strong>, <strong>Vik DaBom</strong>, <strong>Kytako</strong>, Estratega583, Darkizard.

<br/>

- <span style="text-decoration:underline">Discord Server:</span>
  - <strong>[Poke5e.app Discord](https://discord.gg/6VMhR7XGqV)</strong>.

<br/>

-----

<br/>

## Disclaimer

This is unofficial fan content and is not approved/endorsed by © Wizards of the Coast, © Game Freak, © The Pokémon Company, or © Nintendo. Portions of the material may be property of © Wizards of the Coast, © Game Freak, © The Pokémon Company, or © Nintendo. This module is a community-led project designed for use with Foundry Virtual Tabletop.

This software may make use of copyrighted material the use of which has not always been specifically authorized by the copyright owner. This constitutes a "fair use" of any such copyrighted material as provided for in section 107 of the US Copyright Law. In accordance with Title 17 U.S.C. Section 107, the material contained within this module is offered publicly and without profit, to the public users of the internet for comment and nonprofit purposes.

Copyright Disclaimer Under Section 107 of the Copyright Act 1976, allowance is made for "fair use" purposes such as criticism, comment, news reporting, teaching, scholarship, and research. Fair use is a use permitted. No copyright(s) is/are claimed over the intellectual property of the aforementioned companies.

The developers gain no profit from this content, which is distributed for free, so it falls under "Fair Use" guidelines.
