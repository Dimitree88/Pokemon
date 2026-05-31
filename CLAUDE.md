# Pokémon Vintage Cards

Progetto per la gestione delle carte Pokémon vintage.

## Stato
App **Next.js** (App Router) + **TypeScript** + **Tailwind**, deploy su **Vercel**.
La carta è un componente React (`lib/card-render.tsx`) stilizzato da `app/card.css`
(invariato). In roadmap: editor di set, deck builder, gioco con le carte, effetti grafici.

## TODO aperti
Lista di lavori rimandati. **Da rivalutare ogni volta che si chiede "cosa manca / cosa
c'è ancora da fare".**
- **Tyrogue (neo2-66) — evoluzione baby**: ha 3 evoluzioni possibili
  (Hitmonlee/Hitmonchan/Hitmontop), quindi `evolvesIntoName` è `null` e le righe
  "Evolves into … / Put …" non sono mostrate. Decidere come gestire le multi-evoluzioni.
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
- **colore** — *opzionale*, default **rosso**; si salva solo se diverso dal rosso. Nel
  rendering diventa la classe `power--<color>` sul `.power` e imposta `--power-color`
  (tag, nome e glifo Unown lo ereditano). Il valore esatto del colore è definito **una
  sola volta** in `app/card.css` (es. `.power--purple { --power-color: … }`), non nei JSON.
  Gli **Unown** hanno il potere **viola** (`color: "purple"`).

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
- **Sfondo per-tipo** — texture di fondo della carta, indirizzata dal **codice tipo**
  (`public/backgrounds/<code>.png`, 674×949). È il **livello più dietro** ed è la
  **source of truth del rapporto d'aspetto** (0.7102): l'area sfondo è 674×949 (coordinate
  native) e il bordo giallo (`--border` 24px) è **aggiunto attorno** (esterno, non la
  ritaglia) → carta intera 722×997. Solo i 9 tipi in scope (no Fairy/Dragon).
- **Elementi di layout (cornice/barre)** — PNG già a scala nativa, serviti da
  `public/elements/` e usati in **px nativi 1:1**. Famiglia Base: `base_frame` (cornice
  foto, su `.art`), `base_middle` (barra gold specie, su `.species`), `base_bottombar`
  (box descrizione/LV/# in basso, su `.flavor`), `base_evolbar` (badge pre-evoluzione in
  alto a sx, **solo Stage 1/2**, con miniatura `/art/<id>-evo.png`).

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
- **Da completare a mano**: `copyright` dei set (null); `colore` dei poteri diverso dal
  rosso (gli Unown sono già a `"purple"`); finitura **reverse holo** (suffisso
  `" Reverse Holo"` nella rarità, vedi entità Carta).
- **Unown** (`Unown [X]`, tutti Basic/Neo): casi speciali nel rendering —
  (1) regola del mazzo in cima, a destra, font regolare; (2) accanto al nome, prima di
  `[X]`, il **glifo della lettera** in font `UnownTCG`; (3) nel potere, prima di `[Parola]`,
  la **parola tra parentesi** (es. *Anger*) resa in `UnownTCG`, col colore del potere (viola).

## Rendering (implementazione)

Stack: **Next.js** (App Router, Turbopack) + **TypeScript** + **Tailwind v4**. Deploy
su **Vercel** (auto-rilevamento Next: nessun `vercel.json`). `npm run dev` / `build` / `start`.

Struttura app:
- **`app/layout.tsx`** — shell: importa `globals.css` (Tailwind + `@font-face`) e
  `app/card.css`; monta `<Sidebar>` (resta montato tra le navigazioni → niente reload
  del menu) + `<main>` (sfondo scuro via Tailwind).
- **`app/page.tsx`** — redirect alla primissima carta. **`app/card/[id]/page.tsx`** —
  pagina carta (server component) che rende `<Card>`; 404 se l'id non esiste.
- **`components/Sidebar.tsx`** (`"use client"`) — menu: set collassabili, ricerca
  (nome/numero/tipo), slider zoom (50–200%, step 5), espandi/collassa tutti. Naviga
  con `<Link href="/card/<id>">` (client-side, layout persistente). **Zoom iniziale**:
  senza valore salvato in sessione, si adatta all'altezza della finestra così la carta
  entra intera in verticale con un margine (per vedere lo sfondo scuro); poi il valore
  scelto persiste in `sessionStorage`.
- **`lib/card-render.tsx`** — il componente **`<Card>`** (server). Classi CSS definite in
  `app/card.css`. **`lib/data.ts`** (set/indice/carta via fs, cache), **`lib/symbols.ts`**
  (SVG **rarità** via fs; gli energy sono PNG statici), **`lib/card-utils.ts`** (puro: `TYPE_KEYWORDS`, `rarityTier`
  — usabile anche client), **`lib/types.ts`** (tipi del modello).
- **`app/card.css`** — **unica fonte** di stile della carta. Colori per-tipo via variabili
  CSS (`--accent`, `--tint`, `--frame`) inline su `.card`.

### Famiglie di layout (Base / Gym / Neo)
Tre ere grafiche, dal campo `layoutFamily` del set: **Base** (Base, Jungle, Fossil, Team
Rocket), **Gym** (Gym Heroes/Challenge), **Neo** (i 4 Neo + **Southern Islands**).
Risoluzione per carta: **`card.layoutFamily ?? set.layoutFamily`**. I **promo** (`basep`)
appartengono a ere diverse → usano l'**override per-carta** `card.layoutFamily`, assegnato
per numero in `dump.mjs` (`promoFamily`): **#19 = Gym**, **dal #29 in poi = Neo**, gli altri **Base**.
Condividono ~80% (stessa anatomia e stessi dati). Architettura: **un solo template
generico** (`<Card>`) con variazioni localizzate, scelte in base al *tipo* di differenza:
- **Solo estetica** (cornice, proporzioni, font, colori, posizioni) → classe
  **`layout-{family}`** sul `.card` (`layout-base|gym|neo`) + override in `app/card.css`
  (es. `.layout-neo .flavor { … }`). Nessun branch in JS.
- **Strutturale/contenuto** (elementi presenti solo in alcune famiglie, o dati diversi) →
  **pochi branch espliciti** nel componente (o piccoli sotto-componenti). Es. Neo:
  etichetta stage sul riquadro foto, miniatura pre-evoluzione; Gym: proprietario, sfondo.

Regola: *aspetto → CSS per famiglia; elemento/dato diverso → branch esplicito.*

Differenze già **nei dati** (non in CSS): le carte **Gym non hanno flavor/descrizione
estesa** (0 su 187; Base e Neo 100%). Il componente mostra `.flavor` solo se presente,
quindi per le Gym non compare da sé — **non serve nasconderlo via CSS** (sarebbe ridondante
e maschererebbe eventuali errori di dato). È una proprietà del *contenuto*, non dello *stile*.

Stato: implementato **Base**; per **Neo** finora solo l'etichetta stage sul riquadro
(+ baby, che però è trasversale allo *stage*, non alla famiglia). **Gym** non ancora
differenziato. Da arricchire quando si introdurranno nuovi elementi grafici.
- **`next.config.mjs`** — `outputFileTracingIncludes` per includere `data/`, `assets/rarity/`
  (SVG rarità via fs) e `public/sets/` (dove si verifica l'esistenza dei simboli set) nel
  bundle serverless (letti via fs a runtime).

Asset statici (serviti da Vercel da `public/`): font in **`public/fonts/`** (le 6 copie
web-safe, vedi Tipografia), simboli set in **`public/sets/`**. L'arte (`/art/<id>.png`)
non è presente → cornice vuota (atteso).

### Scaling — regola assoluta
Il sistema di coordinate interno è alla **risoluzione NATIVA** dello sfondo: l'area sfondo
è **674×949** (source of truth del rapporto, 0.7102); il **bordo giallo** (`--border` 24px)
è esterno allo sfondo → carta intera **722×997**. Gli **elementi PNG** (`public/elements/`)
sono già a scala nativa → si usano in **px nativi 1:1** (nessun fattore di resize). Per
ridimensionarla si imposta **un solo fattore** `--card-scale` (default 1): lo slider zoom lo
imposta su `<html>` e `.card-box` lo eredita, scalando geometricamente (`transform: scale`)
**tutto**. A **zoom 100%** (`--card-scale` 1) sfondo ed elementi sono resi a **grandezza
nativa** (nessun resize). **Nessuna misura interna deve mai dipendere dalla dimensione di
output.**

Stato: solo famiglia layout **Base**; cornice ricreata in CSS (non blank reali);
sfondo per-tipo da **PNG** (`public/backgrounds/<code>.png`, livello più dietro, source of
truth del rapporto, coordinate native 674×949, bordo esterno → carta 722×997) + elementi di
layout Base (`public/elements/`, px nativi 1:1); simboli tipo/energia resi da **PNG statici**
(`public/energy/<code>.png`).
Mancano **Gym** e **Neo**.

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
  ricreazione **"Essentiarum TCG"** (scaricabile da pokemonaaah). → oggi i simboli
  `{X}` sono PNG pre-generati (`public/energy/`), non più SVG inline.
- **Unown** (Neo Discovery): nomi e poteri in un font dedicato; ricreazione
  **"Unown TCG"** (pokemonaaah).
- Gill Sans / Futura sono **commerciali**. pokemonaaah offre una *"Complete
  Pokémon TCG Font Collection"* che raccoglie i pacchetti utili.

#### Font locali — due cartelle
- **`public/fonts/`** — SOLO i font usati, con **nomi web-safe** (niente spazi/parentesi).
  Serviti staticamente e dichiarati come `@font-face` in `app/globals.css`; `app/card.css`
  li referenzia per famiglia:

  | Uso (vintage) | Famiglia (`@font-face`) | File (`public/fonts/`) |
  |---|---|---|
  | Nomi, poteri, attacchi (e flavor Neo) | `GillSansCB` | `GillSansCondensedBold.ttf` |
  | Info bar, "Evolves from", flavor (Base→Gym) | `GillSansBI` | `GillSansBoldItalic.ttf` |
  | Testo attacchi/poteri, danni, resto | `GillSans` | `GillSans.ttf` |
  | HP | `Futura` | `FuturaHeavy.ttf` |
  | Illustratore, numero carta | `FuturaI` | `FuturaHeavyItalic.ttf` |
  | Simboli energia/rarità | `EssentiarumTCG` | `EssentiarumTCG.ttf` |
  | Glifo lettera Unown (accanto al nome) | `UnownTCG` | `UnownTCG.ttf` |

- **`assets/fonts-all/`** — l'intera *"Complete Pokémon TCG Font Collection"* di
  pokemonaaah (sottocartelle per famiglia, nomi originali con spazi/parentesi).
  **Esclusa dal deploy** via `.vercelignore` (solo archivio/riferimento). Contiene le
  famiglie non usate dal vintage:
  Gill Sans Nova (post-2007), Tekton, Bauhaus, Optima/Sanvito/Frutiger,
  Shin Go/Midashi Go/Gothic MB101/ITC Serif Gothic/Revue (JP), Pokémon TCG Pocket.

#### Simboli energia (PNG) e rarità (SVG via EssentiarumTCG)
- **Energia/tipo** — i 9 simboli (`{X}`) sono **PNG pre-generati a parte** e serviti
  staticamente da **`public/energy/<code>.png`** (`C D F G L M P R W`; indirizzati per
  convenzione dal codice, come i simboli set e l'arte). Resi con `<img>` nella carta
  (`lib/card-render.tsx`, `EnergyIcon`) e nel menu (`components/Sidebar.tsx`); **non**
  letti via fs e **non** inline. Fairy/Dragon (`FA`/`DR`) sono **fuori scope** (tipi
  post-WOTC): i relativi PNG restano in `assets/energy/` solo come archivio.
- **Rarità** — restano SVG inline generati da **`make-assets.mjs`** col font-simboli
  **EssentiarumTCG** (da pokemonaaah; licenza Creative Commons **non commerciale**,
  ~31kb, v0.96): cifre `1`=● comune, `2`=◆ non comune, `3`=★ rara (stile "Old").
  Letti via fs da `assets/rarity/` (`lib/symbols.ts`) e iniettati inline, col
  `@font-face` EssentiarumTCG dichiarato in `app/globals.css`.
- **Set** — PNG scaricati da pokemontcg.io (`make-assets.mjs`).
- Ispezione del font: `scripts/inspect-font.mjs`.

(Nella collezione locale c'è solo `Pokémon TCG Pocket Fonts/Pokesymbol2-regular.otf`,
che è la versione **Pocket**, non EssentiarumTCG.)

## Convenzioni di lavoro
- **Sviluppo con hot reload**: usare **`npm run dev`** (Next Fast Refresh) — le modifiche a
  `app/`, `lib/`, `components/`, CSS si aggiornano da sole nel browser, **senza riavviare**.
  `npm run start` (= `next start`) serve solo a testare la **build di produzione** e **non**
  ha hot reload (richiede `npm run build` + restart): non usarlo per iterare.
- **Verifiche visive**: le fa **l'utente**. L'assistente applica le modifiche (con eventuale
  check non-visivo: build/typecheck o ispezione del markup) e non esegue screenshot/anteprime
  a ogni cambiamento.

## Note
- Lingua del progetto: italiano (codice/documenti); dati carte attualmente EN.
