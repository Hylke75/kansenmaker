/** Vaste inhoud van De Kansenmaker (geen voorbeeldgegevens). */
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

/** De zes rondes van de werksessie (90 minuten). Namen: aanname, te vergelijken met het werkboek. */
export const SESSION_ROUNDS: SessionRoundDef[] = [
  {
    number: 1,
    title: "Kennismaken en doel",
    minutes: 10,
    assignment: "Stel je kort voor. Wat hoop je dat deze sessie oplevert?",
    inputLabel: "Wat hoop je dat deze sessie oplevert?",
  },
  {
    number: 2,
    title: "Doelgroepen en behoeften",
    minutes: 15,
    assignment: "Voor wie zouden we iets nieuws kunnen betekenen? Noem een doelgroep en wat zij nodig hebben.",
    inputLabel: "Doelgroep en behoefte",
  },
  {
    number: 3,
    title: "Nieuwe ideeën",
    minutes: 25,
    assignment: "Bedenk zoveel mogelijk ideeën voor activiteiten, diensten of samenwerkingen. Eén idee per bijdrage.",
    inputLabel: "Jouw idee",
  },
  {
    number: 4,
    title: "Aanvullen en combineren",
    minutes: 15,
    assignment: "Lees de ideeën van anderen. Welke kun je aanvullen of combineren tot iets sterkers?",
    inputLabel: "Jouw aanvulling of combinatie",
  },
  {
    number: 5,
    title: "Kansen en risico’s",
    minutes: 15,
    assignment: "Kies een idee. Wat maakt het kansrijk, en wat kan het tegenhouden?",
    inputLabel: "Kans of risico",
  },
  {
    number: 6,
    title: "Kiezen en vervolgstappen",
    minutes: 10,
    assignment: "Stem op de ideeën die we verder moeten uitwerken. Je hebt drie stemmen.",
    inputLabel: "Vervolgstap (optioneel)",
    voting: true,
  },
];
