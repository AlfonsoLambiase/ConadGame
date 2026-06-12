import {IndovinaNumeroAssetConf} from "../shared/config/asset-conf.const";

const assetConf = IndovinaNumeroAssetConf;
const img = assetConf.image;

export type IndovinaNumeroStageVariant = {
  imageStage: string;
  question: string;
  correctAnswer: string;
};

export type IndovinaNumeroStageDefinition = {
  id: string;
  backgroundStage: string;
  foregroundStage: string;
  variants: readonly IndovinaNumeroStageVariant[];
  answers: readonly string[];
};

export type IndovinaNumeroStage = IndovinaNumeroStageDefinition & IndovinaNumeroStageVariant;

const pickRandom = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Gruppi stage: background + foreground + varianti (image + domanda + risposta) */
export const INDOVINA_NUMERO_STAGE_DEFINITIONS: readonly IndovinaNumeroStageDefinition[] = [
  {
    id: "stage_0",
    backgroundStage: img.backgroundStage_0,
    foregroundStage: img.foregroundStage_0,
    answers: ["1", "2", "3", "4"],
    variants: [
      {
        imageStage: img.imageStage_scimmia,
        question: "Quante scimmie hai visto?",
        correctAnswer: "2",
      },
      {imageStage: img.imageStage_zebra, question: "Quante zebre hai visto?", correctAnswer: "1"},
      {
        imageStage: img.imageStage_giraffa,
        question: "Quante giraffe hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_leopardo,
        question: "Quanti leopardi hai visto?",
        correctAnswer: "2",
      },
      {
        imageStage: img.imageStage_avvoltoio,
        question: "Quanti avvoltoi hai visto?",
        correctAnswer: "1",
      },
    ],
  },
  {
    id: "stage_1",
    backgroundStage: img.backgroundStage_1,
    foregroundStage: img.foregroundStage_1,
    answers: ["1", "2", "3", "4"],
    variants: [
      {imageStage: img.imageStage_leone, question: "Quanti leoni hai visto?", correctAnswer: "3"},
      {
        imageStage: img.imageStage_giraffa,
        question: "Quante giraffe hai visto?",
        correctAnswer: "2",
      },
      {
        imageStage: img.imageStage_suricato,
        question: "Quanti suricati hai visto?",
        correctAnswer: "1",
      },
    ],
  },
  {
    id: "stage_2",
    backgroundStage: img.backgroundStage_2,
    foregroundStage: img.foregroundStage_2,
    answers: ["1", "2", "3", "4"],
    variants: [
      {
        imageStage: img.imageStage_avvoltoio,
        question: "Quanti avvoltoi hai visto?",
        correctAnswer: "3",
      },
      {imageStage: img.imageStage_tigre, question: "Quante tigri hai visto?", correctAnswer: "2"},
      {
        imageStage: img.imageStage_elefante,
        question: "Quanti elefanti hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_giraffa,
        question: "Quante giraffe hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_scimmia,
        question: "Quante scimmie hai visto?",
        correctAnswer: "1",
      },
    ],
  },
  {
    id: "stage_3",
    backgroundStage: img.backgroundStage_3,
    foregroundStage: img.foregroundStage_3,
    answers: ["1", "2", "3", "4"],
    variants: [
      {
        imageStage: img.imageStage_ippopotamo,
        question: "Quanti ippopotami hai visto?",
        correctAnswer: "1",
      },
      {imageStage: img.imageStage_zebra, question: "Quante zebre hai visto?", correctAnswer: "3"},
      {
        imageStage: img.imageStage_scimmia,
        question: "Quante scimmie hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_suricato,
        question: "Quanti suricati hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_avvoltoio,
        question: "Quanti avvoltoi hai visto?",
        correctAnswer: "2",
      },
    ],
  },
  {
    id: "stage_4",
    backgroundStage: img.backgroundStage_4,
    foregroundStage: img.foregroundStage_4,
    answers: ["1", "2", "3", "4"],
    variants: [
      {
        imageStage: img.imageStage_elefante,
        question: "Quanti elefanti hai visto?",
        correctAnswer: "2",
      },
      {
        imageStage: img.imageStage_giraffa,
        question: "Quante giraffe hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_ippopotamo,
        question: "Quanti ippopotami hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_suricato,
        question: "Quanti suricati hai visto?",
        correctAnswer: "1",
      },
      {
        imageStage: img.imageStage_avvoltoio,
        question: "Quanti avvoltoi hai visto?",
        correctAnswer: "1",
      },
    ],
  },
  {
    id: "stage_5",
    backgroundStage: img.backgroundStage_5,
    foregroundStage: img.foregroundStage_5,
    answers: ["1", "2", "3", "4"],
    variants: [
      {
        imageStage: img.imageStage_giraffa,
        question: "Quante giraffe hai visto?",
        correctAnswer: "2",
      },
      {imageStage: img.imageStage_leone, question: "Quanti leoni hai visto?", correctAnswer: "1"},
      {
        imageStage: img.imageStage_leopardo,
        question: "Quanti leopardi hai visto?",
        correctAnswer: "2",
      },
      {imageStage: img.imageStage_zebra, question: "Quante zebre hai visto?", correctAnswer: "1"},
    ],
  },
] as const;

export const resolveStage = (definition: IndovinaNumeroStageDefinition): IndovinaNumeroStage => {
  const variant = pickRandom(definition.variants);

  return {
    ...definition,
    ...variant,
  };
};

export const getDefaultStage = (): IndovinaNumeroStage =>
  resolveStage(INDOVINA_NUMERO_STAGE_DEFINITIONS[0]);

export const pickRandomStage = (): IndovinaNumeroStage =>
  resolveStage(pickRandom(INDOVINA_NUMERO_STAGE_DEFINITIONS));

export const isStageAnswerCorrect = (stage: IndovinaNumeroStage, selectedIndex: number): boolean =>
  stage.answers[selectedIndex] === stage.correctAnswer;
