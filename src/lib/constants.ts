/** Vaste inhoud van de KansenKamer (geen voorbeeldgegevens). */
import type { AssessmentQuestion, SessionRoundDef } from "./types";

/** Stellingen van de realiteitstoets (incl. de missievraag van Haags Verhaal). */
export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  { id: "behoefte", label: "Er is een herkenbare behoefte" },
  { id: "uniek", label: "Het Haags Verhaal voegt iets unieks toe" },
  { id: "missie", label: "Het concept past bij de missie" },
  { id: "uitvoering", label: "Uitvoering lijkt mogelijk met mensen en partners" },
  {
    id: "verbinding",
    label: "Het draagt bij aan ontmoeting, verbinding of verhalen die anders niet gehoord worden",
    help: "Hoe draagt dit idee bij aan ontmoeting, verbinding of het zichtbaar maken van verhalen die anders niet gehoord worden? Zo blijven commerciële kansen verbonden met de maatschappelijke missie.",
  },
];

/**
 * De zes rondes van de werksessie. Ze volgen de zes stappen van de KansenKamer (src/lib/steps.ts);
 * per ronde tonen deelnemers de uitleg van Haags Verhaal uit `steps` (intro, vragen, waarom).
 * Ronde 6 is de stemronde; stemmen kan op de bijdragen uit ronde 3 en 4.
 */
export const SESSION_ROUNDS: SessionRoundDef[] = [
  {
    number: 1,
    title: "Onze kracht",
    minutes: 10,
    assignment: "Wat kan het Haags Verhaal wat anderen niet zomaar kunnen? Noem een sterk punt.",
    inputLabel: "Een sterk punt van het Haags Verhaal",
    addLabel: "Voeg nog een sterk punt toe",
    steps: [1],
  },
  {
    number: 2,
    title: "Doelgroepen en behoeften",
    minutes: 15,
    assignment: "Voor wie zouden we iets kunnen betekenen, en wat zoeken, missen of willen zij? Noem een doelgroep en een of meer behoeften.",
    inputLabel: "Doelgroep en behoeften",
    addLabel: "Voeg nog een doelgroep toe",
    structured: "doelgroep",
    minAnswers: 5,
    steps: [2, 3],
  },
  {
    number: 3,
    title: "Nieuwe ideeën",
    minutes: 25,
    assignment: "Wat zou het Haags Verhaal kunnen aanbieden? Beschrijf je idee: voor wie, wat er gebeurt en waarom het interessant is. Eén idee per bijdrage.",
    inputLabel: "Jouw idee",
    addLabel: "Voeg nog een idee toe",
    linkToRound: 2,
    steps: [4],
  },
  {
    number: 4,
    title: "Aanvullen en combineren",
    minutes: 15,
    assignment: "Een goed idee wordt vaak beter wanneer anderen meedenken. Welk idee kun je aanvullen of combineren tot iets sterkers?",
    inputLabel: "Jouw aanvulling of combinatie",
    addLabel: "Voeg nog een aanvulling toe",
    explanation: {
      questions: [
        "Zie jij een nieuwe doelgroep voor een idee?",
        "Ken je een interessante partner die kan helpen?",
        "Welke ideeën versterken elkaar als je ze combineert?",
        "Is er een andere toepassing die het idee waardevoller maakt?",
      ],
      why: [
        "Een goed idee wordt vaak beter wanneer anderen meedenken. Door aan te vullen en te combineren ontstaan voorstellen die sterker zijn dan de losse ideeën.",
      ],
    },
  },
  {
    number: 5,
    title: "Kansen en bedreigingen",
    minutes: 15,
    assignment: "Wat maakt je ideeën kansrijk, en wat kan ze lastig maken? Voeg per idee een kans, bedreiging of vraag toe.",
    inputLabel: "Kans, bedreiging of vraag",
    addLabel: "Voeg nog een kans of bedreiging toe",
    structured: "kans",
    linkToRound: 3,
    steps: [5],
  },
  {
    number: 6,
    title: "Selecteren en onderzoeken",
    minutes: 10,
    assignment: "Welke ideeën verdienen een volgende stap? Stem op de ideeën met de meeste potentie. Je hebt drie stemmen.",
    inputLabel: "Vervolgstap (optioneel)",
    voting: true,
    steps: [6],
  },
];
