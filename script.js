async function fetchData(){
    try {
        const pokemonName = document.getElementById("pokemonName").value.toLowerCase();



        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if(!response.ok){
            throw new Error("could not fetch resource");
        }

        const data = await response.json();
      const pokemonImage = data.sprites.front_default;
        document.getElementById("pokex").src = pokemonImage;
        document.getElementById("pokex").style.display = "block";
        document.getElementById("pokex").style.width = "200px";
        document.getElementById("pokex").style.height = "200px";
        

    }
    catch(error){
        console.error(error);
    }
}