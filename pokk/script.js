const maximumPokemon = 1025;
const pokedex = {};

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
    let url = "https://pokeapi.co/api/v2/pokemon/" + num.toString();

    let res = await fetch(url);
    if (!res.ok) {
        throw new Error("PokéAPI returned " + res.status + " for Pokémon " + num + ".");
    }
    let pokemon = await res.json();

    let pokemonName = pokemon["name"];
    let pokemonType = pokemon["types"];
    let pokemonImg = pokemon["sprites"]["front_default"];

    res = await fetch(pokemon["species"]["url"]);
    if (!res.ok) {
        throw new Error("PokéAPI could not load the species description for Pokémon " + num + ".");
    }
    let pokemonDesc = await res.json();
    const englishDescription = pokemonDesc["flavor_text_entries"].find(
        entry => entry["language"]["name"] === "en"
    );
    pokemonDesc = englishDescription ? englishDescription["flavor_text"].replace(/\s+/g, " ") : "No description available.";

    pokedex[num] = {"name" : pokemonName, "img" : pokemonImg, "types" : pokemonType, "desc" : pokemonDesc};
}

function updatePokemon(){
    document.getElementById("pokemon-img").src = pokedex[this.id]["img"];

    const typesDiv = document.getElementById("pokemon-types");
    while (typesDiv.firstChild) {
        typesDiv.firstChild.remove();
    }

    const types = pokedex[this.id]["types"];
    for (let i = 0; i < types.length; i++) {
        const type = document.createElement("span");
        type.innerText = types[i]["type"]["name"].toUpperCase();
        type.classList.add("type-box");
        type.classList.add(types[i]["type"]["name"]);
        typesDiv.append(type);
    }

    document.getElementById("pokemon-description").innerText = pokedex[this.id]["desc"];
}
