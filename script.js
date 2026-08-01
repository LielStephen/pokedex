const state = {
  allPokemon: [],
  filteredPokemon: [],
  renderedCount: 0,
  pageSize: 24,
  team: [],
  cache: new Map(),
  currentPokemon: null,
  isShiny: false,
  soundEnabled: true
}

const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
}

const GENERATIONS = {
  gen1: [1, 151],
  gen2: [152, 251],
  gen3: [252, 386],
  gen4: [387, 493],
  gen5: [494, 649],
  gen6: [650, 721],
  gen7: [722, 809],
  gen8: [810, 905],
  gen9: [906, 1025]
}

const elements = {
  searchInput: document.getElementById('pokemonName'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  suggestionsBox: document.getElementById('suggestionsBox'),
  typeFilter: document.getElementById('typeFilter'),
  genFilter: document.getElementById('genFilter'),
  sortFilter: document.getElementById('sortFilter'),
  randomBtn: document.getElementById('randomBtn'),
  dexGrid: document.getElementById('dexGrid'),
  emptyState: document.getElementById('emptyStateContainer'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  loadMoreContainer: document.getElementById('loadMoreBtnContainer'),
  modal: document.getElementById('pokemonModal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
  soundIcon: document.getElementById('soundIcon'),
  soundLabel: document.getElementById('soundLabel'),
  teamToggleBtn: document.getElementById('teamToggleBtn'),
  teamBadgeCount: document.getElementById('teamBadgeCount'),
  pokedexView: document.getElementById('pokedexView'),
  teamSection: document.getElementById('teamSection'),
  teamGrid: document.getElementById('teamGrid'),
  emptyTeamState: document.getElementById('emptyTeamState'),
  teamCountText: document.getElementById('teamCountText'),
  logoBtn: document.getElementById('logoBtn')
}

document.addEventListener('DOMContentLoaded', () => {
  loadStoredPreferences()
  initApp()
  setupEventListeners()
})

function loadStoredPreferences() {
  const savedTeam = localStorage.getItem('pokedex_team')
  if (savedTeam) {
    try {
      state.team = JSON.parse(savedTeam)
    } catch (e) {
      state.team = []
    }
  }
  updateTeamBadge()

  const savedSound = localStorage.getItem('pokedex_sound')
  if (savedSound !== null) {
    state.soundEnabled = savedSound === 'true'
    updateSoundUI()
  }
}

async function initApp() {
  renderSkeletons()
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
    if (!response.ok) throw new Error('Failed to fetch Pokémon directory')
    
    const data = await response.json()
    state.allPokemon = data.results.map((item, index) => ({
      id: index + 1,
      name: item.name,
      url: item.url
    }))

    state.filteredPokemon = [...state.allPokemon]
    renderNextBatch(true)
  } catch (error) {
    showEmptyState('Network Error', 'Failed to connect to PokeAPI. Please check your internet connection.')
  }
}

function setupEventListeners() {
  let searchTimeout
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase()
    elements.clearSearchBtn.style.display = val ? 'block' : 'none'
    
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      handleAutocomplete(val)
      filterAndRender()
    }, 200)
  })

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = ''
    elements.clearSearchBtn.style.display = 'none'
    elements.suggestionsBox.style.display = 'none'
    filterAndRender()
  })

  elements.typeFilter.addEventListener('change', filterAndRender)
  elements.genFilter.addEventListener('change', filterAndRender)
  elements.sortFilter.addEventListener('change', filterAndRender)

  elements.randomBtn.addEventListener('click', () => {
    playUiSound('click')
    const randomId = Math.floor(Math.random() * state.allPokemon.length) + 1
    openPokemonModal(randomId)
  })

  elements.loadMoreBtn.addEventListener('click', () => {
    playUiSound('click')
    renderNextBatch(false)
  })

  elements.teamToggleBtn.addEventListener('click', () => {
    playUiSound('click')
    const isTeamActive = elements.teamSection.classList.contains('active')
    if (isTeamActive) {
      showDexView()
    } else {
      showTeamView()
    }
  })

  elements.logoBtn.addEventListener('click', () => {
    playUiSound('click')
    elements.searchInput.value = ''
    elements.typeFilter.value = 'all'
    elements.genFilter.value = 'all'
    elements.sortFilter.value = 'id-asc'
    showDexView()
    filterAndRender()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  elements.soundToggleBtn.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled
    localStorage.setItem('pokedex_sound', state.soundEnabled)
    updateSoundUI()
    playUiSound('click')
  })

  elements.modalCloseBtn.addEventListener('click', closeModal)
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) closeModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal()
    if (e.key === '/' && document.activeElement !== elements.searchInput) {
      e.preventDefault()
      elements.searchInput.focus()
    }
  })

  document.getElementById('modalShinyBtn').addEventListener('click', () => {
    state.isShiny = !state.isShiny
    document.getElementById('modalShinyBtn').classList.toggle('active', state.isShiny)
    updateModalArtwork()
  })

  document.getElementById('modalCryBtn').addEventListener('click', () => {
    if (state.currentPokemon) playPokemonCry(state.currentPokemon)
  })

  document.getElementById('modalTeamBtn').addEventListener('click', () => {
    if (state.currentPokemon) {
      toggleTeamMember(state.currentPokemon.id)
      updateModalTeamButton(state.currentPokemon.id)
    }
  })

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      playUiSound('click')
      const targetTab = e.target.getAttribute('data-tab')
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'))
      
      e.target.classList.add('active')
      document.getElementById(targetTab).classList.add('active')
    })
  })
}

function filterAndRender() {
  const query = elements.searchInput.value.trim().toLowerCase()
  const selectedType = elements.typeFilter.value
  const selectedGen = elements.genFilter.value
  const sortOrder = elements.sortFilter.value

  let result = state.allPokemon.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query) || p.id.toString() === query
    if (!matchesQuery) return false

    if (selectedGen !== 'all') {
      const [min, max] = GENERATIONS[selectedGen]
      if (p.id < min || p.id > max) return false
    }

    return true
  })

  if (selectedType !== 'all') {
    result = result.filter(p => {
      const cached = state.cache.get(p.id)
      if (cached) {
        return cached.types.some(t => t.type.name === selectedType)
      }
      return true
    })
  }

  result.sort((a, b) => {
    if (sortOrder === 'id-asc') return a.id - b.id
    if (sortOrder === 'id-desc') return b.id - a.id
    if (sortOrder === 'name-asc') return a.name.localeCompare(b.name)
    if (sortOrder === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })

  state.filteredPokemon = result
  renderNextBatch(true)
}

function handleAutocomplete(query) {
  if (!query || query.length < 2) {
    elements.suggestionsBox.style.display = 'none'
    return
  }

  const matches = state.allPokemon
    .filter(p => p.name.includes(query) || p.id.toString() === query)
    .slice(0, 6)

  if (matches.length === 0) {
    elements.suggestionsBox.style.display = 'none'
    return
  }

  elements.suggestionsBox.innerHTML = matches.map(p => `
    <div class="suggestion-item" onclick="selectSuggestion('${p.name}')">
      <span class="suggestion-name">${formatName(p.name)}</span>
      <span class="suggestion-id">#${formatId(p.id)}</span>
    </div>
  `).join('')

  elements.suggestionsBox.style.display = 'block'
}

function selectSuggestion(name) {
  elements.searchInput.value = name
  elements.suggestionsBox.style.display = 'none'
  filterAndRender()
}

function renderNextBatch(reset = false) {
  if (reset) {
    elements.dexGrid.innerHTML = ''
    state.renderedCount = 0
  }

  const batch = state.filteredPokemon.slice(state.renderedCount, state.renderedCount + state.pageSize)

  if (batch.length === 0 && state.renderedCount === 0) {
    showEmptyState('No Pokémon Found', 'No Pokémon matched your search parameters.')
    elements.loadMoreContainer.style.display = 'none'
    return
  }

  hideEmptyState()

  batch.forEach(item => {
    const cardEl = createCardElement(item)
    elements.dexGrid.appendChild(cardEl)
    loadCardDetails(item.id, cardEl)
  })

  state.renderedCount += batch.length

  if (state.renderedCount >= state.filteredPokemon.length) {
    elements.loadMoreContainer.style.display = 'none'
  } else {
    elements.loadMoreContainer.style.display = 'flex'
  }
}

function createCardElement(item) {
  const card = document.createElement('div')
  card.className = 'pokemon-card'
  card.setAttribute('data-id', item.id)
  
  const isFavorite = state.team.includes(item.id)

  card.innerHTML = `
    <button class="card-favorite-btn ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleTeamMember(${item.id})">
      <i class="${isFavorite ? 'fa-solid' : 'fa-regular'} fa-star"></i>
    </button>
    <span class="card-number">#${formatId(item.id)}</span>
    <div class="card-img-container">
      <div class="card-img-bg"></div>
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.id}.png" 
           alt="${item.name}" 
           class="card-img" 
           loading="lazy"
           onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.id}.png'">
    </div>
    <div class="card-name">${formatName(item.name)}</div>
    <div class="card-types" id="card-types-${item.id}">
      <span class="type-badge bg-normal">Loading</span>
    </div>
  `

  card.addEventListener('click', () => {
    playUiSound('click')
    openPokemonModal(item.id)
  })

  return card
}

async function loadCardDetails(id, cardEl) {
  try {
    const data = await fetchPokemonData(id)
    const typesContainer = cardEl.querySelector(`#card-types-${id}`)
    if (typesContainer) {
      typesContainer.innerHTML = data.types.map(t => 
        `<span class="type-badge bg-${t.type.name}">${t.type.name}</span>`
      ).join('')
    }
  } catch (error) {
  }
}

function renderSkeletons() {
  elements.dexGrid.innerHTML = Array(12).fill(0).map(() => `
    <div class="skeleton-card">
      <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
      <div style="width: 60%; height: 16px; background: rgba(255,255,255,0.05); border-radius: 4px;"></div>
      <div style="width: 40%; height: 20px; background: rgba(255,255,255,0.05); border-radius: 10px;"></div>
    </div>
  `).join('')
}

async function fetchPokemonData(idOrName) {
  const key = idOrName.toString().toLowerCase()
  if (state.cache.has(key)) {
    return state.cache.get(key)
  }

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`)
  if (!response.ok) throw new Error(`Pokémon ${idOrName} not found`)
  
  const data = await response.json()
  state.cache.set(data.id, data)
  state.cache.set(data.name, data)
  return data
}

async function fetchSpeciesData(id) {
  const key = `species_${id}`
  if (state.cache.has(key)) return state.cache.get(key)

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
  if (!response.ok) return null

  const data = await response.json()
  state.cache.set(key, data)
  return data
}

async function openPokemonModal(idOrName) {
  state.isShiny = false
  document.getElementById('modalShinyBtn').classList.remove('active')

  elements.modal.classList.add('active')
  document.body.style.overflow = 'hidden'

  document.getElementById('modalPokemonName').textContent = 'Loading...'
  document.getElementById('modalPokemonId').textContent = '#...'
  document.getElementById('modalArtwork').src = ''
  document.getElementById('modalFlavorText').textContent = 'Fetching Pokédex entry...'

  try {
    const data = await fetchPokemonData(idOrName)
    state.currentPokemon = data

    document.getElementById('modalPokemonName').textContent = formatName(data.name)
    document.getElementById('modalPokemonId').textContent = `#${formatId(data.id)}`
    
    updateModalArtwork()
    updateModalTeamButton(data.id)

    playPokemonCry(data)

    document.getElementById('modalTypes').innerHTML = data.types.map(t => 
      `<span class="type-badge bg-${t.type.name}">${t.type.name}</span>`
    ).join('')

    document.getElementById('modalHeight').textContent = `${(data.height / 10).toFixed(1)} m`
    document.getElementById('modalWeight').textContent = `${(data.weight / 10).toFixed(1)} kg`
    document.getElementById('modalBaseExp').textContent = data.base_experience || 'N/A'

    document.getElementById('modalAbilities').innerHTML = data.abilities.map(a => 
      `<span class="type-badge" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-glass);">
        ${formatName(a.ability.name)} ${a.is_hidden ? '<i class="fa-solid fa-eye-slash" title="Hidden Ability" style="margin-left:4px; font-size:0.7rem;"></i>' : ''}
       </span>`
    ).join('')

    renderBaseStats(data.stats)
    renderTypeMatchups(data.types)

    const speciesData = await fetchSpeciesData(data.id)
    if (speciesData) {
      const genus = speciesData.genera.find(g => g.language.name === 'en')
      document.getElementById('modalCategory').textContent = genus ? genus.genus : 'Pokémon'

      const flavorEntry = speciesData.flavor_text_entries.find(f => f.language.name === 'en')
      if (flavorEntry) {
        document.getElementById('modalFlavorText').textContent = flavorEntry.flavor_text.replace(/[\f\n\r]/g, ' ')
      }

      if (speciesData.evolution_chain?.url) {
        loadEvolutionChain(speciesData.evolution_chain.url)
      } else {
        document.getElementById('modalEvoTree').innerHTML = '<p style="color:var(--text-dim)">No evolution data available.</p>'
      }
    }

  } catch (error) {
    document.getElementById('modalPokemonName').textContent = 'Error Loading Data'
  }
}

function updateModalArtwork() {
  if (!state.currentPokemon) return
  const p = state.currentPokemon
  const artwork = state.isShiny 
    ? (p.sprites.other?.['official-artwork']?.front_shiny || p.sprites.front_shiny)
    : (p.sprites.other?.['official-artwork']?.front_default || p.sprites.front_default)

  document.getElementById('modalArtwork').src = artwork
}

function renderBaseStats(stats) {
  const container = document.getElementById('modalStatsContainer')
  const statNames = {
    'hp': 'HP',
    'attack': 'ATK',
    'defense': 'DEF',
    'special-attack': 'Sp. ATK',
    'special-defense': 'Sp. DEF',
    'speed': 'SPD'
  }

  const statColors = {
    'hp': '#ff5959',
    'attack': '#f5ac78',
    'defense': '#fae078',
    'special-attack': '#9db7f5',
    'special-defense': '#a7db8d',
    'speed': '#fa92b2'
  }

  let totalStat = 0

  let html = stats.map(s => {
    totalStat += s.base_stat
    const maxStat = 255
    const percentage = Math.min(100, Math.round((s.base_stat / maxStat) * 100))
    const label = statNames[s.stat.name] || s.stat.name.toUpperCase()
    const color = statColors[s.stat.name] || 'var(--primary-red)'

    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-val">${s.base_stat}</span>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
        </div>
      </div>
    `
  }).join('')

  html += `
    <div class="stat-row" style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 10px;">
      <span class="stat-label" style="color: #ffffff;">TOTAL</span>
      <span class="stat-val" style="color: var(--accent-cyan); font-size: 1.1rem;">${totalStat}</span>
      <div></div>
    </div>
  `

  container.innerHTML = html
}

function renderTypeMatchups(pokemonTypes) {
  const container = document.getElementById('modalMatchups')
  const multipliers = {}

  const typesList = Object.keys(TYPE_CHART)
  typesList.forEach(t => multipliers[t] = 1.0)

  pokemonTypes.forEach(tObj => {
    const typeName = tObj.type.name
    const chart = TYPE_CHART[typeName] || {}
    Object.keys(chart).forEach(attackerType => {
      multipliers[attackerType] *= chart[attackerType]
    })
  })

  const HTML = Object.entries(multipliers)
    .filter(([_, mult]) => mult !== 1.0)
    .map(([type, mult]) => {
      let multClass = 'mult-super'
      if (mult < 1.0 && mult > 0) multClass = 'mult-not'
      if (mult === 0) multClass = 'mult-immune'

      return `
        <div class="matchup-item">
          <span class="type-badge bg-${type}">${type}</span>
          <span class="matchup-multiplier ${multClass}">${mult}x</span>
        </div>
      `
    }).join('')

  container.innerHTML = HTML || '<p style="color: var(--text-muted); font-size: 0.9rem;">Takes normal damage from all standard types.</p>'
}

async function loadEvolutionChain(url) {
  const container = document.getElementById('modalEvoTree')
  container.innerHTML = '<p style="color: var(--text-dim);">Loading evolution chain...</p>'

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch evolution chain')
    const data = await response.json()

    const chainNodes = []
    let current = data.chain

    while (current) {
      const speciesName = current.species.name
      const parts = current.species.url.split('/').filter(Boolean)
      const evoId = parseInt(parts[parts.length - 1])
      
      chainNodes.push({ id: evoId, name: speciesName })
      current = current.evolves_to[0]
    }

    container.innerHTML = chainNodes.map((node, index) => `
      ${index > 0 ? '<div class="evo-arrow"><i class="fa-solid fa-chevron-right"></i></div>' : ''}
      <div class="evo-node" onclick="openPokemonModal(${node.id})">
        <img class="evo-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${node.id}.png" alt="${node.name}">
        <span class="evo-name">${formatName(node.name)}</span>
      </div>
    `).join('')

  } catch (error) {
    container.innerHTML = '<p style="color: var(--text-dim)">Could not load evolution chain.</p>'
  }
}

function closeModal() {
  elements.modal.classList.remove('active')
  document.body.style.overflow = 'auto'
  state.currentPokemon = null
}

function toggleTeamMember(id) {
  const index = state.team.indexOf(id)
  if (index > -1) {
    state.team.splice(index, 1)
  } else {
    if (state.team.length >= 6) {
      alert('Your team is full! You can only store up to 6 Pokémon in your team.')
      return
    }
    state.team.push(id)
  }

  localStorage.setItem('pokedex_team', JSON.stringify(state.team))
  updateTeamBadge()

  const cardStar = document.querySelector(`.pokemon-card[data-id="${id}"] .card-favorite-btn`)
  if (cardStar) {
    const isFav = state.team.includes(id)
    cardStar.classList.toggle('active', isFav)
    cardStar.querySelector('i').className = `${isFav ? 'fa-solid' : 'fa-regular'} fa-star`
  }

  if (elements.teamSection.classList.contains('active')) {
    renderTeamSection()
  }
}

function updateTeamBadge() {
  elements.teamBadgeCount.textContent = state.team.length
  elements.teamCountText.textContent = `${state.team.length} / 6 Selected`
}

function updateModalTeamButton(id) {
  const isTeam = state.team.includes(id)
  const icon = document.getElementById('modalTeamIcon')
  const label = document.getElementById('modalTeamLabel')
  
  icon.className = `${isTeam ? 'fa-solid' : 'fa-regular'} fa-star`
  label.textContent = isTeam ? 'In Team' : 'Add to Team'
}

function showTeamView() {
  elements.pokedexView.style.display = 'none'
  elements.teamSection.classList.add('active')
  elements.teamToggleBtn.classList.add('active')
  renderTeamSection()
}

function showDexView() {
  elements.pokedexView.style.display = 'block'
  elements.teamSection.classList.remove('active')
  elements.teamToggleBtn.classList.remove('active')
}

function renderTeamSection() {
  elements.teamGrid.innerHTML = ''
  if (state.team.length === 0) {
    elements.emptyTeamState.style.display = 'block'
    return
  }

  elements.emptyTeamState.style.display = 'none'

  state.team.forEach(id => {
    const name = state.allPokemon.find(p => p.id === id)?.name || `pokemon-${id}`
    const cardEl = createCardElement({ id, name })
    elements.teamGrid.appendChild(cardEl)
    loadCardDetails(id, cardEl)
  })
}

function playPokemonCry(pokemon) {
  if (!state.soundEnabled) return
  const cryUrl = pokemon.cries?.latest || pokemon.cries?.legacy
  if (cryUrl) {
    const audio = new Audio(cryUrl)
    audio.volume = 0.4
    audio.play().catch(e => {})
  }
}

function playUiSound(type) {
  if (!state.soundEnabled) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch (e) {}
}

function updateSoundUI() {
  elements.soundIcon.className = state.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'
  elements.soundLabel.textContent = state.soundEnabled ? 'Sound ON' : 'Sound OFF'
}

function showEmptyState(title, desc) {
  document.getElementById('emptyStateTitle').textContent = title
  document.getElementById('emptyStateDesc').textContent = desc
  elements.emptyState.style.display = 'block'
  elements.dexGrid.style.display = 'none'
}

function hideEmptyState() {
  elements.emptyState.style.display = 'none'
  elements.dexGrid.style.display = 'grid'
}

function formatName(str) {
  if (!str) return ''
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatId(id) {
  return id.toString().padStart(3, '0')
}