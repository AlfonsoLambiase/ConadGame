export type IndovinaNumeroStage = {
  id: string;
  backgroundStage: string;
  foregroundStage: string;
  imageStage: string;
  question: string;
  answers: readonly string[];
  correctAnswer: string;
};

/** Gruppi stage: background + foreground + image + domanda + risposte button */
export const INDOVINA_NUMERO_STAGES: readonly IndovinaNumeroStage[] = [
  {
    id: "stage_0",
    backgroundStage: "backgroundStage_0",
    foregroundStage: "foregroundStage_0",
    imageStage: "imageStage_0",
    question: "Quante zebre hai visto?",
    answers: ["1", "2", "3", "4"],
    correctAnswer: "4",
  },
  {
    id: "stage_1",
    backgroundStage: "backgroundStage_0",
    foregroundStage: "foregroundStage_0",
    imageStage: "imageStage_1",
    question: "Quanti leoni hai visto?",
    answers: ["1", "2", "3", "4"],
    correctAnswer: "1",
  },
  {
    id: "stage_2",
    backgroundStage: "backgroundStage_0",
    foregroundStage: "foregroundStage_0",
    imageStage: "imageStage_2",
    question: "Quante giraffe hai visto?",
    answers: ["1", "2", "3", "4"],
    correctAnswer: "1",
  },
] as const;

export const getDefaultStage = (): IndovinaNumeroStage => INDOVINA_NUMERO_STAGES[0];

export const pickRandomStage = (): IndovinaNumeroStage =>
  INDOVINA_NUMERO_STAGES[Math.floor(Math.random() * INDOVINA_NUMERO_STAGES.length)];

export const isStageAnswerCorrect = (stage: IndovinaNumeroStage, selectedIndex: number): boolean =>
  stage.answers[selectedIndex] === stage.correctAnswer;
