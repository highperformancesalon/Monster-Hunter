# Monster Hunter Prototype

A simple playable browser prototype built with HTML, JavaScript, and Phaser.js.

## Features

- Top-down forest arena map
- Player movement with WASD
- Elemental Hunter player character
- Selectable hotbar abilities and items
- Thornshell monsters that spawn in waves and move toward the base
- Fortress base with health
- Player, monster, and base health systems
- Basic combat, damage, game over, and restart loop

## Controls

- `WASD` - Move
- `1` - Fire
- `2` - Grass
- `3` - Water
- `4` - Ice
- `5` - Potion
- `6` - Bomb
- `Space` - Use selected ability forward
- Mouse click on the map - Use selected ability toward the clicked point
- Mouse click on hotbar - Select ability or item
- `R` - Restart after game over

## Run Locally

This project is a static web game. You only need a local web server.

From the project folder, run:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

## Project Structure

```text
index.html        Main HTML entry point
src/main.js       Phaser game logic
src/styles.css    Page styling
assets/           Game art assets
```

## Notes

Phaser is loaded from a CDN in `index.html`, so an internet connection is needed the first time the page loads.
