/**
 * Teksten van de begeleide route in zes stappen (aangeleverd door Haags Verhaal).
 * Pas teksten hier aan; de schermen /welkom, /hoe-werkt-het, /stappen/[n] en /stappen/bedankt lezen ze hieruit.
 */

export const WELCOME = {
  title: "Samen bouwen aan de toekomst van het Haags Verhaal",
  paragraphs: [
    "Den Haag zit vol bijzondere mensen, gemeenschappen en verhalen. Verhalen die ons helpen elkaar beter te begrijpen en die laten zien hoe veelzijdig onze stad is.",
    "Het Haags Verhaal brengt mensen samen die elkaar anders misschien nooit zouden ontmoeten. Dat doen we met verhalenbijeenkomsten, gesprekken, kunst, evenementen en bijzondere samenwerkingen.",
  ],
  question: "Maar wat kunnen we nog meer betekenen voor Den Haag?",
  paragraphs2: [
    "We willen nieuwe doelgroepen bereiken, verrassende activiteiten ontwikkelen en onderzoeken hoe we onze kennis, ons netwerk en onze manier van werken op nieuwe manieren kunnen inzetten.",
    "Daarbij zoeken we ook naar mogelijkheden om samen te werken met organisaties, bedrijven en andere partners. Zo willen we onze maatschappelijke betekenis vergroten én een stevigere basis creëren voor de toekomst.",
    "Daarom verzamelen we ideeën. Niet alleen van onszelf, maar juist ook van mensen die met een frisse blik naar het Haags Verhaal kijken.",
  ],
  highlight: "Jouw ideeën kunnen het begin zijn van iets bijzonders.",
  paragraphs3: [
    "Je hoeft geen compleet plan te hebben. Een doelgroep, een behoefte, een onverwachte combinatie of een eerste ingeving is al waardevol.",
    "Samen ontdekken we welke ideeën de moeite waard zijn om verder te onderzoeken.",
  ],
  button: "Ik denk mee",
};

export const HOW_IT_WORKS = {
  title: "Hoe werkt de KansenKamer?",
  lead: "In zes stappen gaan we op zoek naar nieuwe mogelijkheden voor het Haags Verhaal.",
  paragraphs: [
    "We beginnen bij wat ons bijzonder maakt. Daarna kijken we voor wie we iets kunnen betekenen, welke behoeften er zijn en welk nieuw aanbod daarbij past.",
    "Vervolgens onderzoeken we welke kansen en obstakels we zien. Tot slot kiezen we ideeën die we verder willen uitwerken.",
  ],
  highlight: "Het gaat niet om zoveel mogelijk perfecte plannen, maar om zoveel mogelijk waardevolle inzichten.",
  paragraphs2: [
    "Je kunt je eigen ideeën toevoegen, reageren op ideeën van anderen en later verdergaan waar je gebleven bent.",
    "Alles wat we verzamelen, helpt om samen richting te geven aan de toekomst van het Haags Verhaal.",
  ],
  button: "Begin bij stap 1",
};

export interface StepText {
  number: number;
  /** Naam van de stap (stappenbalk, overzicht) */
  short: string;
  /** Kernvraag in het overzicht van de zes stappen */
  headline: string;
  /** Korte omschrijving in het overzicht van de zes stappen */
  summary: string;
  /** Doel van de stap */
  goal: string;
  title: string;
  question: string;
  intro: string[];
  /** Optionele opsomming in de intro (stap 6: de vier aandachtspunten) */
  criteria?: string[];
  questions?: string[];
  why: string[];
  assignment: string;
  assignmentNote?: string;
  button: string;
}

/** De zes stappen. Naam, kernvraag, omschrijving en doel: “De 6 stappen van de KansenKamer – Haags Verhaal”. */
export const STEPS: StepText[] = [
  {
    number: 1,
    short: "Onze kracht",
    headline: "Wat maakt het Haags Verhaal bijzonder?",
    summary:
      "We onderzoeken waar het Haags Verhaal goed in is. Denk aan onze kennis van de stad, ons netwerk, het verbinden van verschillende gemeenschappen en het vertellen van verhalen die anders niet gehoord worden.",
    goal: "Ontdekken welke kwaliteiten we kunnen inzetten voor nieuwe activiteiten en samenwerkingen.",
    title: "De kracht van het Haags Verhaal",
    question: "Wat kunnen wij wat anderen niet zomaar kunnen?",
    intro: [
      "Het Haags Verhaal heeft iets bijzonders opgebouwd. We kennen uiteenlopende gemeenschappen, weten mensen met elkaar in contact te brengen en maken verhalen zichtbaar die anders misschien verborgen blijven.",
      "Maar onze kracht zit mogelijk ook in andere dingen: ons netwerk, onze creativiteit, onze ervaring met evenementen, ons vermogen om vertrouwen te winnen of de manier waarop we verschillende werelden samenbrengen.",
      "We beginnen daarom bij onze sterke punten.",
    ],
    questions: [
      "Waarin onderscheidt het Haags Verhaal zich van andere organisaties?",
      "Waar zijn we echt goed in?",
      "Welke kennis, contacten of mogelijkheden hebben we die waardevol zijn voor anderen?",
      "Waar krijgen we positieve reacties op?",
    ],
    why: [
      "Nieuwe activiteiten hebben de meeste kans van slagen wanneer ze voortbouwen op wat het Haags Verhaal al bijzonder maakt. We zoeken niet zomaar nieuwe dingen om te doen, maar mogelijkheden waarin onze eigen kracht het verschil maakt.",
    ],
    assignment: "Voeg minimaal drie sterke punten toe.",
    button: "Voeg een sterk punt toe",
  },
  {
    number: 2,
    short: "Doelgroepen",
    headline: "Voor wie kunnen we iets betekenen?",
    summary:
      "We kijken verder dan de mensen die we nu al bereiken. Welke bedrijven, scholen, bewonersgroepen, maatschappelijke organisaties of andere partijen zouden belangstelling kunnen hebben voor wat wij doen?",
    goal: "Nieuwe doelgroepen ontdekken die we kunnen bereiken of waarvoor we activiteiten kunnen ontwikkelen.",
    title: "Ontdek nieuwe doelgroepen",
    question: "Wie zouden we met het Haags Verhaal nog meer kunnen bereiken?",
    intro: [
      "We brengen nu al veel verschillende mensen en gemeenschappen samen. Maar misschien zijn er groepen of organisaties die nog niet weten wat het Haags Verhaal voor hen kan betekenen.",
      "Denk bijvoorbeeld aan bedrijven, scholen, woningcorporaties, maatschappelijke organisaties, internationale medewerkers, culturele instellingen of bewonersgroepen.",
      "Kijk vooral verder dan de mensen die we nu al bereiken.",
    ],
    questions: [
      "Welke mensen of organisaties zouden belangstelling kunnen hebben voor onze activiteiten?",
      "Wie kan profiteren van onze kennis van Den Haag en haar gemeenschappen?",
      "Welke organisaties zoeken manieren om mensen met elkaar te verbinden?",
      "Wie zou ons kunnen inschakelen om een activiteit, ontmoeting of programma te organiseren?",
    ],
    why: [
      "Door nieuwe doelgroepen te ontdekken, ontstaan nieuwe mogelijkheden voor activiteiten, samenwerkingen en opdrachten. Sommige doelgroepen willen zelf deelnemen, terwijl andere organisaties juist activiteiten voor hun medewerkers, klanten of achterban willen organiseren.",
    ],
    assignment: "Voeg doelgroepen toe die volgens jou interessant kunnen zijn.",
    button: "Voeg een doelgroep toe",
  },
  {
    number: 3,
    short: "Behoeften",
    headline: "Wat zoeken deze doelgroepen?",
    summary:
      "We onderzoeken welke wensen, uitdagingen of behoeften deze doelgroepen hebben. Waarbij kunnen we helpen? Wat willen ze bereiken? En wat missen ze misschien?",
    goal: "Begrijpen waar daadwerkelijk behoefte aan kan zijn, voordat we activiteiten bedenken.",
    title: "Ontdek de behoefte",
    question: "Wat zoeken, missen of willen deze mensen en organisaties?",
    intro: [
      "Een goed idee begint niet altijd bij een activiteit. Vaak begint het bij een behoefte.",
      "Een bedrijf wil bijvoorbeeld medewerkers meer met elkaar verbinden. Een school wil leerlingen laten kennismaken met verschillende leefwerelden. Een woningcorporatie zoekt manieren om bewoners met elkaar in gesprek te brengen.",
      "Het Haags Verhaal kan mogelijk een rol spelen bij zulke vraagstukken.",
    ],
    questions: [
      "Wat wil deze doelgroep bereiken?",
      "Waar loopt deze doelgroep tegenaan?",
      "Welke behoefte sluit aan bij de kennis en ervaring van het Haags Verhaal?",
      "Waarom zou deze doelgroep onze hulp of samenwerking interessant vinden?",
    ],
    why: [
      "We willen activiteiten ontwikkelen waar daadwerkelijk behoefte aan is. Door eerst te begrijpen wat mensen en organisaties zoeken, kunnen we aanbod bedenken dat waarde toevoegt.",
      "Je hoeft nog niet zeker te weten of een behoefte echt bestaat. We verzamelen eerst mogelijke behoeften en onderzoeken die later.",
    ],
    assignment: "Kies een doelgroep en beschrijf één of meer behoeften.",
    button: "Voeg een behoefte toe",
  },
  {
    number: 4,
    short: "Nieuwe ideeën",
    headline: "Wat kunnen we aanbieden?",
    summary:
      "We combineren onze sterke punten met de behoeften van doelgroepen. Zo bedenken we nieuwe activiteiten, programma's, diensten en samenwerkingen die passen bij het Haags Verhaal.",
    goal: "Zoveel mogelijk interessante ideeën verzamelen, zonder ze direct te beoordelen.",
    title: "Van behoefte naar idee",
    question: "Wat zou het Haags Verhaal kunnen aanbieden?",
    intro: [
      "Nu gaan we ideeën bedenken.",
      "We weten waar het Haags Verhaal sterk in is, welke doelgroepen interessant kunnen zijn en welke behoeften zij mogelijk hebben.",
      "Hoe kunnen we deze inzichten combineren tot nieuwe activiteiten, diensten of samenwerkingen?",
      "Denk bijvoorbeeld aan een bijzondere teamdag voor bedrijven, een programma voor nieuwe inwoners, een verhalenwandeling, een ontmoeting tussen verschillende gemeenschappen of een activiteit waarin kunst en verhalen samenkomen.",
      "Maar denk vooral ook aan ideeën die we nog nooit hebben uitgevoerd.",
    ],
    questions: [
      "Welke activiteit zou aansluiten bij de gekozen doelgroep?",
      "Hoe kunnen we mensen op een verrassende manier samenbrengen?",
      "Welke kennis of ervaring van het Haags Verhaal kunnen we anders inzetten?",
      "Welke nieuwe samenwerkingen kunnen interessante programma's opleveren?",
      "Welke activiteiten zouden organisaties bij ons kunnen aanvragen?",
    ],
    why: [
      "We willen ontdekken hoe het Haags Verhaal nieuwe maatschappelijke waarde kan creëren en tegelijkertijd mogelijkheden kan ontwikkelen voor samenwerkingen en inkomsten.",
      "Dat kunnen eenmalige activiteiten zijn, maar ook programma's die vaker uitgevoerd kunnen worden.",
    ],
    assignment: "Beschrijf je idee. Vertel voor wie het bedoeld is, wat er gebeurt en waarom het interessant zou zijn.",
    assignmentNote: "Een idee hoeft nog niet volledig uitgewerkt te zijn.",
    button: "Voeg een idee toe",
  },
  {
    number: 5,
    short: "Kansen en bedreigingen",
    headline: "Wat maakt een idee kansrijk?",
    summary:
      "We bekijken welke ontwikkelingen, contacten en samenwerkingen een idee kunnen versterken. Tegelijk onderzoeken we welke obstakels er zijn, zoals beperkte capaciteit, concurrentie of afhankelijkheid van partners.",
    goal: "Ontdekken wat nodig is om een idee succesvol te ontwikkelen.",
    title: "Onderzoek de mogelijkheden",
    question: "Wat maakt een idee kansrijk en wat kan het lastig maken?",
    intro: [
      "Een aantrekkelijk idee is niet automatisch een uitvoerbaar idee.",
      "Misschien zijn er organisaties die graag willen samenwerken. Misschien sluit het aan bij een maatschappelijke ontwikkeling of kunnen we gebruikmaken van ons bestaande netwerk.",
      "Maar er kunnen ook obstakels zijn. Denk aan beperkte capaciteit, ontbrekende kennis, afhankelijkheid van partners of een doelgroep waarvan we de belangstelling nog niet kennen.",
      "We brengen daarom zowel de kansen als de bedreigingen in beeld.",
    ],
    questions: [
      "Welke ontwikkelingen of samenwerkingen maken dit idee interessant?",
      "Welke contacten of partners kunnen ons helpen?",
      "Wat zou de uitvoering lastig kunnen maken?",
      "Welke andere organisaties bieden al iets vergelijkbaars aan?",
      "Wat moeten we eerst uitzoeken voordat we verdergaan?",
    ],
    why: [
      "We willen onze energie richten op ideeën die niet alleen inspirerend zijn, maar ook een realistische kans hebben om uitgevoerd te worden.",
      "Een bedreiging betekent niet dat een idee moet afvallen. Het kan ook een aandachtspunt zijn dat we samen kunnen oplossen.",
    ],
    assignment: "Voeg per idee kansen, bedreigingen of vragen toe.",
    button: "Voeg een kans of bedreiging toe",
  },
  {
    number: 6,
    short: "Selecteren en onderzoeken",
    headline: "Welke ideeën verdienen een volgende stap?",
    summary:
      "We beoordelen ideeën op vier punten: de behoefte van de doelgroep, de unieke bijdrage van het Haags Verhaal, de aansluiting op onze missie en de uitvoerbaarheid.",
    goal: "De meest veelbelovende ideeën kiezen en bepalen hoe we deze in de praktijk gaan toetsen.",
    title: "Van idee naar werkelijkheid",
    question: "Welke ideeën verdienen een volgende stap?",
    intro: [
      "We hebben onze sterke punten onderzocht, doelgroepen en behoeften verzameld en nieuwe activiteiten bedacht.",
      "Nu kijken we welke ideeën we verder willen ontwikkelen.",
      "Daarbij letten we op vier dingen:",
    ],
    criteria: [
      "Is er een herkenbare behoefte bij de doelgroep?",
      "Kan het Haags Verhaal hier iets bijzonders toevoegen?",
      "Past het idee bij onze missie om mensen en gemeenschappen te verbinden?",
      "Lijkt het mogelijk om het idee samen met onze mensen en partners uit te voeren?",
    ],
    why: [
      "We willen voorkomen dat waardevolle ideeën op de plank blijven liggen. Daarom kiezen we een aantal mogelijkheden waarmee we concreet aan de slag kunnen.",
      "Dat kan beginnen met een gesprek met een mogelijke opdrachtgever, een kennismaking met een partner of een kleine proefactiviteit.",
    ],
    assignment: "Selecteer de ideeën die volgens jou de meeste potentie hebben en geef aan wat de eerste vervolgstap zou kunnen zijn.",
    button: "Bekijk en beoordeel de ideeën",
  },
];

/** Tekst na de intro van stap 6, vóór 'Waarom vragen we dit?' */
export const STEP6_NOTE =
  "We hoeven nog niet alle antwoorden te hebben. Soms is juist het ontbreken van informatie een goede reden om een idee verder te onderzoeken.";

export const THANKS = {
  title: "Bedankt voor het meedenken!",
  lead: "Samen geven we nieuwe ideeën de ruimte.",
  paragraphs: [
    "Met jouw bijdrage helpen we het Haags Verhaal om nieuwe mogelijkheden te ontdekken.",
    "We bekijken de verzamelde ideeën, zoeken naar interessante combinaties en onderzoeken welke voorstellen we verder kunnen ontwikkelen.",
    "Niet ieder idee zal worden uitgevoerd. Maar ook een kleine suggestie kan leiden tot een nieuw inzicht, een bijzondere samenwerking of een activiteit die we anders nooit hadden bedacht.",
    "En het mooie is: dit proces stopt hier niet.",
    "De KansenKamer blijft beschikbaar. Je kunt later terugkomen, nieuwe ideeën toevoegen en voortbouwen op de bijdragen van anderen.",
  ],
  closing: "Want de toekomst van het Haags Verhaal maken we samen.",
  buttons: { ideas: "Bekijk alle ideeën", newIdea: "Voeg nog een idee toe", overview: "Terug naar het overzicht" },
};

/** Korte teksten op vaste momenten */
export const MICROCOPY = {
  doubt: {
    title: "Twijfel je of je idee goed genoeg is?",
    text: "Geen zorgen als je idee nog niet helemaal is uitgewerkt. We zoeken juist ook eerste gedachten, onverwachte invalshoeken en verrassende combinaties. Andere deelnemers kunnen helpen om jouw idee verder te brengen.",
  },
  addOn: {
    text: "Een goed idee wordt vaak beter wanneer anderen meedenken. Zie jij een nieuwe doelgroep, een interessante partner of een andere toepassing? Voeg jouw suggestie toe.",
  },
  selected: {
    title: "Geselecteerd voor verder onderzoek",
    text: "Dit idee is geselecteerd om verder te onderzoeken. Dat betekent nog niet dat we het gaan uitvoeren. We bekijken eerst of er voldoende belangstelling is, wat ervoor nodig is en welke partners mogelijk kunnen helpen.",
  },
};

export const INSIGHT_LABELS = { kans: "Kans", bedreiging: "Bedreiging", vraag: "Vraag" } as const;
