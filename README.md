# Oilfield A–Z Reviewer

An interactive reviewer of oilfield terms from A to Z, covering all 20 disciplines of the SLB Energy Glossary. It's built for petroleum engineering students preparing for exams and board reviews.

▶ **Open it:** https://kendrewflor.github.io/oilfield-az-reviewer/

![Dashboard with study stats, activity chart and discipline progress](docs/screenshot.png)

## What's inside

- **Glossary A–Z.** 4,457 unique terms, each with one definition, filterable by all 20 disciplines (Drilling Fluids, Geophysics, Geology, Formation Evaluation, Drilling, Well Completions, Well Workover and Intervention, Enhanced Oil Recovery, Production Testing, Well Testing, Reservoir Characterization, Production Logging, Production Facilities, Production, Shale Gas, Digital, Perforating, Oil and Gas Business, Heavy Oil and General Terms). You can search, jump to a letter, star terms, mark them mastered, add your own notes, hear a term read aloud, follow "see also" links to related terms, cover the definitions to test yourself, jump to a random term or print the filtered list. Every term links to its official SLB entry.
- **Flashcards.** Cards flip in 3D, and you can swipe or use the keyboard. Leitner spaced repetition (boxes 1–5) brings back the cards you miss and spaces out the ones you know. There are decks for due, new, starred, not-mastered and missed-in-quiz cards, and for any discipline or letter.
- **Acronyms and symbols.** 262 abbreviations and symbols pulled from the definitions, searchable by name or discipline, each linked to its term.
- **Practice questions.** There are five modes:
  - **Name the term:** read a definition and pick the matching term.
  - **Pick the definition:** see a term and choose its definition.
  - **Acronyms:** see an abbreviation and pick what it stands for.
  - **Concept questions:** 100 questions, five per discipline, each with an explanation.
  - **Exam drill:** 20 mixed questions against a 15-minute clock.
- **Study notes and cheat sheets.** One page per discipline with key ideas, the equations to memorize and a tip. Each one prints to PDF.
- **Projects and exam exercises.** There are 19 worked problems (kill sheets, Archie, OOIP, Vogel, Horner, decline, NPV with a cash-flow diagram and more) that you can check yourself and open step by step, plus 7 coursework-style mini projects with checklists.
- **Tools.** A unit converter for 10 oilfield quantities (pressure, depth, liquid and gas volume, rate, mud weight, permeability, viscosity, mass, temperature) that shows every unit at once; 8 field calculators (hydrostatic pressure, gradient, kill mud weight, ECD, API gravity, volumetric OOIP, annular capacity, Archie S<sub>w</sub>); and a searchable sheet of every equation from the cheat sheets.
- **Useful resources.** Free references collected in one place: dictionaries, papers and standards, courses, well control, data and societies.
- **Dashboard.** Shows your terms studied and mastered, day streak, a daily review goal, quiz accuracy, a 14-day activity chart, progress per discipline, a mastery map by letter and a list of every feature.
- **Keyboard shortcuts.** Press <kbd>?</kbd> anywhere: <kbd>/</kbd> searches, <kbd>R</kbd> opens a random term, <kbd>Space</kbd> and the arrow keys run flashcards, <kbd>1</kbd>–<kbd>4</kbd> and <kbd>Enter</kbd> answer quizzes.

It looks like a study notebook rather than an app: graph paper, index cards with handwritten definitions, typewriter equations, sticky notes, highlighter marks and handwritten notes, with a chalkboard dark mode. There are effects too: a pencil-sketch seismic section that ripples under the cursor, oil "gusher" bursts for right answers, a rubber-stamp "MASTERED", swipe-to-grade cards and a drill-bit depth gauge while you scroll the glossary. Turn them off with the Effects switch; they are also off when your system asks for reduced motion.

## About the definitions

The SLB Energy Glossary is copyrighted, so this repository does **not** copy its text. Every definition here is an original summary written for study. Each term has an **"Official SLB definition ↗"** link to its page on [glossary.slb.com](https://glossary.slb.com/), where you can read the exact wording. Every discipline has at least as many terms here as the SLB glossary lists for it. The term list was compiled independently, so a few names may differ from SLB's; if a link opens SLB's "not found" page, search for the term on their site. Discipline names follow the glossary's categories. This project is independent and is not affiliated with or endorsed by SLB.

## Your data

Progress is stored only in your browser (local storage). Use **Export progress** in the footer to save it as a file and **Import** to load it on another device. There are no accounts, analytics or cookies. Read-aloud uses your browser's built-in speech; some browsers use an online voice, which sends the spoken text to that browser's speech service.

## Run it locally

```sh
python3 -m http.server     # in the repo folder, then open http://localhost:8000
```

Opening `index.html` directly from disk won't load the data files (browsers block that), so use a local server.

## Checks

```sh
python3 tools/security_scan.py                    # security checks
python3 tools/check_data.py                       # every term, question and exercise is well-formed
python3 -m unittest discover -s tests/python -v   # data tests and recomputed exercise answers
node --test tests/js/lib.test.mjs                 # sanitizer, links, spaced repetition, quizzes, acronyms, units, calculators
```

## Security

No dependencies. The fonts are served from the repo itself (`fonts/`: Andika, Patrick Hand, Special Elite, Permanent Marker and Kalam, under the SIL Open Font License or Apache 2.0). It has a strict Content-Security-Policy, the only network request is for its own `data/*.json`, every data string passes through a tag allowlist, and every GitHub Action is pinned to a commit SHA. See [SECURITY.md](SECURITY.md) and [docs/AI_TOOLING.md](docs/AI_TOOLING.md).

## License

MIT © 2026 Kendrew Flor S. Arrabe. The fonts keep their own licences ([fonts/licenses/](fonts/licenses/)).
