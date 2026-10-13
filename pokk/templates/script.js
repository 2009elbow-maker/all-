const maximumPokemon = 1025;
const pokedex = {};
const statMaximum = 180;

window.addEventListener("DOMContentLoaded", loadPokemon);

async function loadPokemon() {
    const pokemonList = document.getElementById("pokemon-list");
    const description = document.getElementById("pokemon-description");
    description.innerText = "Loading Pokémon...";

    let loadedCount = 0;
    const batchSize = 10;

    try {
        const countResponse = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1");
        if (!countResponse.ok) {
            throw new Error("PokéAPI count request returned " + countResponse.status + ".");
        }
        const { count } = await countResponse.json();
        const pokemonCount = Math.min(count, maximumPokemon);

        for (let first = 1; first <= pokemonCount; first += batchSize) {
            const batch = [];
            for (let number = first; number < first + batchSize && number <= pokemonCount; number++) {
                batch.push(loadPokemonEntry(number));
            }

            const entries = await Promise.all(batch);
            entries
                .filter(Boolean)
                .sort((a, b) => a.number - b.number)
                .forEach(({ element }) => pokemonList.append(element));
        }
    } catch (error) {
        console.error("Unable to determine the number of Pokémon.", error);
        description.innerText = "Pokémon data could not be loaded. Check your internet connection and try again.";
        return;
    }

    if (loadedCount === 0) {
        description.innerText = "Pokémon data could not be loaded. Check your internet connection and try again.";
    }

    async function loadPokemonEntry(number) {
        try {
            await getPokemon(number);
            const pokemon = document.createElement("div");
            pokemon.id = number;
            pokemon.innerText = number.toString() + ". " + pokedex[number].name.toUpperCase();
            pokemon.classList.add("pokemon-name");
            pokemon.addEventListener("click", updatePokemon);
            loadedCount++;

            if (number === 1) {
                updatePokemon.call(pokemon);
            }

            return { number, element: pokemon };
        } catch (error) {
            console.error("Unable to load Pokémon " + number + ".", error);
            const pokemon = document.createElement("div");
            pokemon.innerText = number.toString() + ". Unable to load";
            pokemon.classList.add("pokemon-name");
            return { number, element: pokemon };
        }
    }
}

async function getPokemon(num) {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + num);
    if (!response.ok) {
        throw new Error("PokéAPI returned " + response.status + " for Pokémon " + num + ".");
    }
    const pokemon = await response.json();

    const speciesResponse = await fetch(pokemon.species.url);
    if (!speciesResponse.ok) {
        throw new Error("PokéAPI could not load the species description for Pokémon " + num + ".");
    }
    const species = await speciesResponse.json();
    const englishDescription = species.flavor_text_entries.find(
        entry => entry.language.name === "en"
    );
    const description = englishDescription
        ? englishDescription.flavor_text.replace(/\s+/g, " ")
        : "No description available.";

    pokedex[num] = {
        name: pokemon.name,
        img: pokemon.sprites.front_default,
        types: pokemon.types,
        desc: description,
        stats: pokemon.stats
    };
}

function updatePokemon() {
    const pokemon = pokedex[this.id];
    document.getElementById("pokemon-img").src = pokemon.img;

    const typesDiv = document.getElementById("pokemon-types");
    typesDiv.replaceChildren();
    pokemon.types.forEach(({ type }) => {
        const typeElement = document.createElement("span");
        typeElement.innerText = type.name.toUpperCase();
        typeElement.classList.add("type-box", type.name);
        typesDiv.append(typeElement);
    });

    document.getElementById("pokemon-description").innerText = pokemon.desc;
    renderStats(pokemon.stats);
}

function renderStats(stats) {
    const statsList = document.getElementById("stats-list");
    statsList.replaceChildren();

    stats.forEach(({ base_stat: value, stat }, index) => {
        const row = document.createElement("div");
        row.className = "stat-row";

        const label = document.createElement("span");
        label.className = "stat-label";
        label.innerText = formatStatName(stat.name);

        const track = document.createElement("div");
        track.className = "stat-track";

        const fill = document.createElement("div");
        fill.className = "stat-fill stat-color-" + index;
        fill.style.width = Math.min((value / statMaximum) * 100, 100) + "%";

        const valueLabel = document.createElement("span");
        valueLabel.className = "stat-value";
        valueLabel.innerText = value;

        track.append(fill);
        row.append(label, track, valueLabel);
        statsList.append(row);
    });
}

function formatStatName(name) {
    return name
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
