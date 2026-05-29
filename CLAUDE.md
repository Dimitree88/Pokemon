# Pokémon Vintage Cards

Progetto per la gestione delle carte Pokémon vintage.

## Stato
Progetto appena avviato — struttura e stack ancora da definire.

## Scopo
Gestire le carte Pokémon dell'era **vintage WOTC** (Wizards of the Coast), ovvero
tutti i set pubblicati **prima di Expedition** (inizio era e-Card).

## Dominio

Ogni carta appartiene a un **supertipo**, uno fra tre: **Pokémon**, **Trainer**,
**Energy**. Il progetto tratta **esclusivamente le carte Pokémon** (Trainer ed
Energy sono fuori scope).

Ogni carta appartiene a un **set**, pubblicato in una certa data. Il progetto
tratta esclusivamente i seguenti set (Legendary Collection escluso per ora):

| Data | Set | Sigla |
|------|-----|-------|
| 1999-01-09 | Base Set | BS |
| 1999-06-16 | Jungle | JU |
| 1999-07-01 | Wizards Black Star Promos | — |
| 1999-10-10 | Fossil | FO |
| 2000-02-24 | Base Set 2 | B2 |
| 2000-04-24 | Team Rocket | RO |
| 2000-07-21 | Miscellaneous | — |
| 2000-08-14 | Gym Heroes | G1 |
| 2000-10-16 | Gym Challenge | G2 |
| 2000-12-16 | Neo Genesis | N1 |
| 2001-06-01 | Neo Discovery | N2 |
| 2001-07-31 | Southern Islands | SI |
| 2001-09-21 | Neo Revelation | N3 |
| 2002-02-28 | Neo Destiny | N4 |

### Entità: Set
- **nome**
- **sigla**
- **data di pubblicazione**
- **totale carte stampato** — *opzionale*; denominatore della dicitura "numero/totale"
  (es. `102` in `4/102`). Assente per Black Star Promos e Miscellaneous.
- **testo di copyright** — riga in basso sulla carta (varia per set/anno).
- **famiglia di layout** — era grafica che determina cornice e impaginazione:
  `Base` (= Jungle/Fossil/Base2), `Gym`, `Neo`. La carta la eredita dal set; la
  **variante** (es. dark) può sovrascrivere la resa. (Il simbolo del set è un
  asset indirizzato per convenzione dalla sigla, non un campo — vedi sotto.)

### Entità: Carta Pokémon
Campi modellati (solo carte di supertipo **Pokémon**):

- **ID** — chiave generata da noi come `sigla_set + numero` (es. `BS-4`). Non
  esiste un ID stampato universale; la coppia (set, numero) è la chiave naturale.
- **set di appartenenza** — riferimento alla entità Set.
- **numero nel set** — stringa (non intero: alcune promo usano numerazioni particolari).
- **rarità** — include la distinzione di finitura, es. *Rara* vs *Rara Holo*
  (NB: non trattiamo varianti di tiratura/collezionismo come 1st Ed / Shadowless).
- **nome sulla carta**
- **numero Pokédex** del Pokémon.
- **tipo** (energia) — enum: Grass, Fire, Water, Lightning, Psychic, Fighting,
  Colorless, **Darkness**, **Metal** (gli ultimi due introdotti nei set Neo).
- **HP**
- **stage** — Basic, Stage 1, Stage 2, Baby.
- **evolve da** — riferimento tramite **numero Pokédex** del pre-evoluto (non
  l'ID carta, perché un Pokémon può evolvere da carte di set diversi). Vale anche
  per la baby-evoluzione. Assente per i Basic.
- **descrizione breve** — specie/categoria (es. *"Lizard Pokémon"*).
- **descrizione completa** — flavor text.
- **peso** — testo (unità imperiali come stampato).
- **altezza** — testo (unità imperiali come stampato).
- **livello** — eventualmente assente.
- **illustratore**
- **debolezza** — eventualmente assente; di solito uno o più elementi (modello
  generico, con eventuale valore numerico).
- **resistenza** — eventualmente assente; uno o più elementi + eventuale valore
  numerico (modello generico).
- **costo di ritirata** — intero 0–4 (nell'era WOTC è sempre energia Incolore).
- **info baby** — testo che spiega la regola dei baby Pokémon (solo se Baby).
- **allenatore** — eventuale proprietario (es. *Brock*, *Misty*, *Giovanni*),
  tipico dei set Gym.
- **variante** — eventuale variante speciale separata dall'allenatore:
  *dark*, *light*, *shining*, *altro*. Può coesistere con l'allenatore.

### Entità: Attacco
Una carta Pokémon ha 0+ attacchi. Campi:
- **costo** — lista di simboli energia (es. 2 Fire + 1 Colorless).
- **nome**
- **danno** — numero con eventuale **modificatore** (`+`, `×`, `−`) oppure assente
  (attacchi di solo effetto).
- **testo effetto** — opzionale.

### Entità: Potere (Pokémon Power)
Nell'era WOTC il potere è **sempre** "Pokémon Power" (la distinzione
Poké-Power / Poké-Body è posteriore, fuori scope). Campi:
- **nome**
- **testo effetto**
- **colore** — *opzionale*, default **rosso**; si salva solo se diverso dal rosso.

### Simboli energia inline (placeholder)
Il testo di attacchi e poteri può contenere riferimenti a energie. Vanno salvati
come **placeholder** sostituibili in fase di rendering, usando gli stessi codici
energia del costo. Convenzione: token `{X}` dove X è il codice energia:

`{G}` Grass · `{R}` Fire · `{W}` Water · `{L}` Lightning · `{P}` Psychic ·
`{F}` Fighting · `{C}` Colorless · `{D}` Darkness · `{M}` Metal

Esempio: *"Scarta 1 energia `{R}` da questo Pokémon."*

## Rendering grafico

Lo scopo include la **renderizzazione grafica** della carta a partire dai dati
modellati. Principi:

### Asset indirizzati per convenzione (non salvati come campi)
- **Artwork della carta** — indirizzato dall'**ID carta** (es. `BS-4.<ext>`).
- **Miniatura pre-evoluzione** — immagine **dedicata** per il riquadro evoluzione
  (mostrato quando la carta evolve da un'altra), per convenzione es. `BS-4-evo.<ext>`.
- **Simbolo del set** — indirizzato dalla **sigla del set**.

### Asset globali del renderer (non dati di carta/set)
- simboli energia (`{G} {R} {W} {L} {P} {F} {C} {D} {M}`) per costo, debolezza,
  resistenza, ritirata e placeholder inline;
- simboli di rarità (● comune, ◆ non comune, ★ rara);
- template di cornice per ogni combinazione *tipo × famiglia layout × variante*
  (più aspetto Baby);
- font dell'epoca.

### Derivati (non si salvano)
- colore cornice e simbolo del tipo (da **tipo**);
- simbolo di rarità ed effetto holo (da **rarità**);
- barra inferiore debolezza/resistenza/ritirata (dai campi relativi);
- aspetto e box dei Baby (da **stage = Baby**).

## Fonti dati

Per popolare il modello attingiamo a fonti community strutturate.

- **Primaria — pokemontcg.io** (REST API + dump GitHub `PokemonTCG/pokemon-tcg-data`).
  Copre tutti i set in scope. ID set: `base1` (Base), `base2` (Jungle),
  `base3` (Fossil), `base4` (Base Set 2), `base5` (Team Rocket), `gym1`/`gym2`,
  `neo1..4`, `basep` (Black Star Promos), `si1` (Southern Islands).
  Verificata sul campo (`base1-4` Charizard, `neo1-20` Cleffa): copertura ~90%.
  - Corrispondenze chiave: `id` = nostro **ID**; `set.ptcgoCode` = **sigla**;
    `set.printedTotal` = **totale carte**; `set.images.symbol` = **simbolo set**;
    `convertedRetreatCost` = **costo di ritirata** (intero); `abilities[].type`
    `= "Pokémon Power"` = **potere**; `rules[]` = **info baby**.
- **Complemento — TCGdex** (`tcgdex.dev`): multilingua (italiano) + immagini.
- **PokéAPI** (`pokeapi.co`): SOLO per **specie/categoria** (`genera`) e per
  ricavare **peso/altezza** (convertiti in unità imperiali come sulla carta).
  Non usarlo per altri dati di gioco (non coincidono col TCG).

### Trasformazioni richieste
- `evolvesFrom`/`evolvesTo` (per **nome**) → normalizzare al **numero Pokédex**.
- riferimenti energia nei testi (es. "Fire Energy") → placeholder `{X}` (`{R}`).
- **allenatore** e **variante** (dark/light/shining) → parsing dal **nome**.

### Buchi da colmare a parte
- **descrizione breve (specie)** → PokéAPI `genera`.
- **colore potere** → inserimento manuale nei casi diversi dal rosso (default).

### Fuori scope nei dati sorgente (da ignorare)
Prezzi (`tcgplayer`/`cardmarket`), `legalities`, `series` e simili — non rilevanti.

## Dati locali

I dati sono dumpati in locale (decisione DB rimandata).

- **`scripts/dump.mjs`** (Node, nessuna dipendenza) — scarica da pokemontcg.io,
  filtra solo le carte **Pokémon**, arricchisce da PokéAPI (specie + peso/altezza
  convertiti in imperiale) e scrive il nostro formato. Rieseguibile (cache PokéAPI
  in `data/.cache/`, ignorata da git). Lancio: `node scripts/dump.mjs`.
- **`data/sets.json`** — metadati dei 13 set.
- **`data/cards/<setId>/<cardId>.json`** — un file per carta. **921 carte** totali.

### Stato lingue
- **Solo inglese (EN)** per ora. I campi testuali sono già strutturati come
  oggetti per-lingua (`{ "en": ... }`) per consentire il backfill italiano futuro
  senza modifiche di formato. TCGdex ha l'italiano **solo per il Base Set**.

### Note sul formato carta
- `damage` è un oggetto `{ raw, value, modifier }` (es. `"50×"` → `{value:50, modifier:"×"}`).
- `owner` e `variant` (dark/light/shining) sono estratti dal nome (possono coesistere).
- `evolvesFromDex` = numero Pokédex del pre-evoluto; `null` quando si evolve da una
  carta **Trainer** (es. *Mysterious Fossil* per i Pokémon fossile) — caso atteso.
- **Energia**: nei campi strutturati (`type`, `types`, `cost`, `weaknesses[].type`,
  `resistances[].type`) si usa il **codice nudo** (`G R W L P F C D M`); nel testo
  libero si usa `{X}` **solo dove va mostrato il simbolo**. Mappa: `G`=Grass,
  `R`=Fire, `W`=Water, `L`=Lightning, `P`=Psychic, `F`=Fighting, `C`=Colorless,
  `D`=Darkness, `M`=Metal.
- **Testi tokenizzati**: nel testo di attacchi e poteri ogni nome-tipo è già
  convertito nel simbolo `{X}` (es. *"into {R} Energy"*, *"your {W} Pokémon"*,
  *"type is still {C}."*). La parola generica *"Energy"* senza tipo resta invariata.
  Unica eccezione esclusa: il nome proprio *"Lightning Rod"* (marcatore, non simbolo).
- **Da completare a mano**: `copyright` dei set (null); `colore` dei poteri
  diverso dal rosso.

## Note
- Lingua del progetto: italiano (codice/documenti); dati carte attualmente EN.
