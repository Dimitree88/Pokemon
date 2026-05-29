# Pokémon Vintage Cards

Progetto per la gestione delle carte Pokémon vintage.

## Stato
Progetto appena avviato — struttura e stack ancora da definire.

## TODO aperti
Lista di lavori rimandati. **Da rivalutare ogni volta che si chiede "cosa manca / cosa
c'è ancora da fare".**
- **Tyrogue (neo2-66) — evoluzione baby**: ha 3 evoluzioni possibili
  (Hitmonlee/Hitmonchan/Hitmontop), quindi `evolvesIntoName` è `null` e le righe
  "Evolves into … / Put …" non sono mostrate. Decidere come gestire le multi-evoluzioni.
- **Unown (Neo Discovery)**: gestione dedicata nel rendering — sia il testo in alto,
  sia i simboli speciali (font/ricreazione "Unown TCG", vedi sezione Tipografia).
- **Evoluzioni da Fossile Misterioso**: i Pokémon fossile evolvono da una carta
  *Trainer* (Mysterious Fossil) → `evolvesFromDex` è `null` (caso atteso). Gestire la
  resa/relazione di questa evoluzione speciale.

## Scopo
Gestire le carte Pokémon dell'era **vintage WOTC** (Wizards of the Coast), ovvero
tutti i set pubblicati **prima di Expedition** (inizio era e-Card).

## Dominio

Ogni carta appartiene a un **supertipo**, uno fra tre: **Pokémon**, **Trainer**,
**Energy**. Il progetto tratta **esclusivamente le carte Pokémon** (Trainer ed
Energy sono fuori scope).

Ogni carta appartiene a un **set**, pubblicato in una certa data. Il progetto
tratta esclusivamente i seguenti set (Legendary Collection e Base Set 2 esclusi):

| Data | Set | Sigla |
|------|-----|-------|
| 1999-01-09 | Base Set | BS |
| 1999-06-16 | Jungle | JU |
| 1999-07-01 | Wizards Black Star Promos | — |
| 1999-10-10 | Fossil | FO |
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
  Il **reverse holo** è anch'esso una finitura modellata **dentro la rarità** (non
  un campo a parte): si registra appendendo `" Reverse Holo"` alla rarità base,
  es. `"Common Reverse Holo"`, `"Uncommon Reverse Holo"`, `"Rare Reverse Holo"`.
  Non è esposto dalla fonte → inserimento **manuale**; reso grafico **non gestito**
  per ora (come gli holo).
- **nome sulla carta**
- **numero Pokédex** del Pokémon.
- **tipo** (energia) — enum: Grass, Fire, Water, Lightning, Psychic, Fighting,
  Colorless, **Darkness**, **Metal** (gli ultimi due introdotti nei set Neo).
- **HP**
- **stage** — Basic, Stage 1, Stage 2, Baby.
- **evolve da** — riferimento tramite **numero Pokédex** del pre-evoluto (non
  l'ID carta, perché un Pokémon può evolvere da carte di set diversi). Vale anche
  per la baby-evoluzione. Assente per i Basic.
- **evolve in** (`evolvesIntoName`) — **nome** dell'evoluzione, usato **solo per i
  baby** (le righe "Evolves into …"). Non ricavabile dai dati (i baby hanno
  `evolvesFrom` null e gli evoluti WOTC sono Basic senza riferimento al baby):
  mappa fissa in `dump.mjs`. `null` altrimenti. **TODO**: *Tyrogue* ha 3 evoluzioni
  possibili (Hitmonlee/Hitmonchan/Hitmontop) → da decidere a mano.
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
  `base3` (Fossil), `base5` (Team Rocket), `gym1`/`gym2`,
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
  filtra solo le carte **Pokémon** (escludendo Base Set 2 e le promo 50–53),
  arricchisce da PokéAPI (specie + peso/altezza convertiti in imperiale) e scrive
  il nostro formato. Rieseguibile (cache PokéAPI in `data/.cache/`, ignorata da
  git). Lancio: `node scripts/dump.mjs`.
- **`data/sets.json`** — metadati dei 12 set.
- **`data/cards/<setId>/<cardId>.json`** — un file per carta. **817 carte** totali.

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
  diverso dal rosso; finitura **reverse holo** (suffisso `" Reverse Holo"` nella
  rarità, vedi entità Carta).

## Rendering (implementazione)

Motore: **HTML/CSS + Playwright** (Chromium). Stack Node, ESM.

- **`src/card.css`** — stile della carta (layout Base). Colori per-tipo via variabili
  CSS (`--accent`, `--tint`, `--frame`) impostate inline su `.card`. **Unica fonte**
  di stile, condivisa da dev server e render PNG.
- **`src/card-template.mjs`** — `buildCardMarkup` / `buildDocument` (HTML). La carta
  è sempre avvolta in `.card-box`.

### Scaling — regola assoluta
La carta si disegna **sempre** a 500×700px con misure fisse in px. Per ridimensionarla
si imposta **un solo fattore** `--card-scale` (default 1) su `.card-box`: la carta
viene scalata geometricamente (`transform: scale`), quindi **tutto** scala in modo
perfettamente proporzionale. **Nessuna misura interna deve mai dipendere dalla
dimensione di output** (così anche un px aggiunto in futuro resta proporzionale).
- Dev server: `?scale=<n>` oppure i pulsanti zoom in sidebar (50/75/100/150/200%, live).
- Render PNG: `npm run render -- <cardId> [scale]` (es. `... base1-4 2` → 2000×2800 a 2×).
- **`scripts/make-assets.mjs`** (`npm run assets`) — genera i 9 simboli energia SVG
  in `assets/energy/` e i 3 simboli rarità (● comune, ◆ non comune, ★ rara) in
  `assets/rarity/` (entrambi dal font EssentiarumTCG), e scarica i simboli set in
  `assets/sets/`.
- **`scripts/render.mjs`** (`npm run render -- <cardId>`) — render PNG headless in
  `out/`. Arte ritagliata dalla scansione (`assets/art/<id>.png`, scaricata da
  pokemontcg.io) via sfondo CSS offset; immagini incorporate come data URI.
- **`scripts/serve.mjs`** (`npm run serve`) — dev server con anteprima live e
  **auto-reload** su modifica di `src/` (SSE). `http://localhost:5173/?card=<id>`.

Stato: solo famiglia layout **Base**; cornice ricreata in CSS (non blank reali);
simboli energia resi col font **EssentiarumTCG** (vedi sotto); font *Cabin*
(sostituto) da Google Fonts. Mancano **Gym** e **Neo**.

### Tipografia (font WOTC) — riferimento

Fonti pokemonaaah.net:
- Articolo *"Know Your Pokémon TCG Fonts"* — quali font, dove, per cosa:
  https://www.pokemonaaah.net/news/2026/04/know-your-pokemon-tcg-fonts/
- Pagina **download + uso dei font custom** (inclusi i font-simboli Essentiarum):
  https://www.pokemonaaah.net/art/fonts/
I font qui sotto riguardano le carte **occidentali** (EN) dell'era in scope
(Base→Neo). I font giapponesi (Shin Go, Midashi Go, ITC Serif Gothic, Revue per i
livelli JP, Gothic MB101, ecc.) **non** ci riguardano.

Le carte vintage usano essenzialmente **due** famiglie: **Gill Sans** e **Futura**.

| Elemento carta | Font |
|---|---|
| Nome carta, nomi Pokémon Power, nomi attacchi | **Gill Sans Condensed Bold** |
| Riga info (specie/lunghezza/peso), "Evolves from", flavor Pokédex **(Base→Gym)** | **Gill Sans Bold Italic** |
| Flavor Pokédex **(solo era Neo)** | **Gill Sans Condensed Bold** |
| Testo attacchi, testo poteri, valori di danno, e "tutto il resto" | **Gill Sans Regular** |
| **HP** | **Futura Heavy** |
| Illustratore, numero carta | **Futura Heavy Italic** (l'articolo cita anche Gill Sans Condensed Bold per questi: lieve ambiguità) |

Note:
- **NON è "Humanist 521"** (errore storico diffuso): è **Gill Sans**. Indizi:
  virgolette e forma della "é".
- Il **livello (Lv.)** sulle carte occidentali ricade in Gill Sans Regular (il
  font *Revue* per i livelli è solo sulle carte **giapponesi**).
- **Simboli energia (font dedicato!)**: i tipi erano resi con i font
  **`PokemonEnergies-Regular`** (era Base→Gym) e **`Poke2Energies-Regular`**
  (era Neo, aggiunge Darkness e Metal). Mai rilasciati ufficialmente, ma esiste la
  ricreazione **"Essentiarum TCG"** (scaricabile da pokemonaaah). → alternativa
  ai nostri SVG fatti a mano per i simboli `{X}`.
- **Unown** (Neo Discovery): nomi e poteri in un font dedicato; ricreazione
  **"Unown TCG"** (pokemonaaah).
- Gill Sans / Futura sono **commerciali**. pokemonaaah offre una *"Complete
  Pokémon TCG Font Collection"* che raccoglie i pacchetti utili.
- Attualmente nel renderer usiamo *Cabin* (Google Fonts) come **sostituto**.

#### Stato font locali (`assets/fonts/`)
È presente l'intera *"Complete Pokémon TCG Font Collection"* di pokemonaaah,
organizzata in sottocartelle per famiglia. **Tutti i font testuali del vintage
sono presenti:**

| Uso (vintage) | File |
|---|---|
| Nomi, poteri, attacchi (e flavor Neo) | `Gill Sans/Gill Sans Condensed Bold.ttf` |
| Info bar, "Evolves from", flavor (Base→Gym) | `Gill Sans/Gill Sans Bold Italic.ttf` |
| Testo attacchi/poteri, danni, resto | `Gill Sans/Gill Sans.ttf` |
| HP | `Futura/Futura Heavy.ttf` |
| Illustratore, numero carta | `Futura/Futura Heavy Italic.ttf` |
| Unown (Neo Discovery) | `UnownTCG.ttf` (+ otf/woff/woff2) |

Altre famiglie presenti ma **non** necessarie al vintage: Gill Sans Nova
(post-2007), Tekton (prototipi), Bauhaus (parola "TRAINER"), Optima/Sanvito/
Frutiger (ere moderne), Shin Go/Midashi Go/Gothic MB101/ITC Serif Gothic/Revue
(carte giapponesi), Pokémon TCG Pocket Fonts.

#### Simboli via font: EssentiarumTCG
I 9 simboli energia (`{X}`) sono generati da **`make-assets.mjs`** usando il
font-simboli **EssentiarumTCG** (da pokemonaaah; licenza Creative Commons **non
commerciale**, ~31kb, v0.96) — non più SVG disegnati a mano. Ogni `assets/energy/<CODE>.svg`
è un SVG con due `<text>` sovrapposti (la `o` = cerchio colorato + la lettera tipo
= icona); il `@font-face` EssentiarumTCG è iniettato dal documento (`src/fonts.mjs`)
così l'SVG inline usa il font sia nel render PNG che nel dev server. Il font contiene
anche **rarità** e tipi-carta (GX/EX/V…); i simboli **set** li scarichiamo da
pokemontcg.io. **Convenzione d'uso (vintage):**
- Icone tipo/energia: stile **"Old" = lettere MAIUSCOLE** (`G R W L P F C D M`,
  tutti e 9 in un solo font, D/M inclusi); minuscole = stile "New", non usato.
- Energia in cerchio: la `o` minuscola (BG Circle, advance 0) + la lettera tipo
  allo stesso punto-penna; la `o` colorata, la lettera in bianco/contrasto.
- Geometria misurata (fs100): `o` ink ~117×116, lettere ~115.7×159 (più alte del
  cerchio) → viewBox quadrato `-30 -125 175 175` per inquadrare tutto senza tagli.
- Rarità: cifre `1`=● comune, `2`=◆ non comune, `3`=★ rara (stile "Old").
- Ispezione/specimen del font: `scripts/inspect-font.mjs`, `scripts/font-specimen.mjs`.

(Nella collezione locale c'è solo `Pokémon TCG Pocket Fonts/Pokesymbol2-regular.otf`,
che è la versione **Pocket**, non EssentiarumTCG.)

## Note
- Lingua del progetto: italiano (codice/documenti); dati carte attualmente EN.
