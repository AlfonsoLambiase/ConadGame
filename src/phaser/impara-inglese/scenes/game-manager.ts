/* eslint-disable @typescript-eslint/no-unused-vars */

import Phaser from "phaser";

import { AudioManager } from "../components/audioManager";
import { ImparaIngleseAssetConf } from "../shared/config/asset-conf.const";

import { Game } from "./game";

const assetConf = ImparaIngleseAssetConf;

// Interfacce per SpeechRecognition API
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export class GameManager extends Phaser.Scene {
  audioManager!: AudioManager;

  private gameWidth!: number;
  private gameHeight!: number;

  private marginTop = 200;

  public canShoot: boolean = true;
  public isGameOver: boolean = false;

  gameScene!: Game;
  speedBall: number = 800;
  timeAddNewRow: number = 20000;

  // Proprietà per il riconoscimento vocale
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private targetWord: string = "hello"; // Parola target da riconoscere
  private inputText!: Phaser.GameObjects.Text;
  private micButton!: Phaser.GameObjects.Container;
  private isListening: boolean = false;

  constructor() {
    super({ key: assetConf.scene.gameManager });
  }

  init(data: { gameScene?: Game; targetWord?: string }) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
    if (data.targetWord) {
      this.targetWord = data.targetWord.toLowerCase();
    }
  }

  create() {
    console.log("Start Scene GameManager");
    this.computeLayoutDimensions();

    this.time.delayedCall(50, () => {
      this.canShoot = true;
      this.isGameOver = false;
    });

    // Inizializza il riconoscimento vocale e la sintesi
    this.setupSpeechRecognition();
    this.setupSpeechSynthesis();

    // Crea l'interfaccia utente
    this.createVoiceUI();
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as { width: number; height: number };

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
  }

  private setupSpeechRecognition(): void {
    // Verifica compatibilità browser
    const windowWithSR = window as WindowWithSpeechRecognition;
    const SpeechRecognition =
      windowWithSR.SpeechRecognition ||
      windowWithSR.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition non supportato dal browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = "en-US"; // Imposta la lingua (inglese)
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    // Evento quando il riconoscimento riceve risultati
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Parola riconosciuta:", transcript);

      this.inputText.setText(transcript);
      this.checkWordMatch(transcript);
    };

    // Evento di errore
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Errore riconoscimento vocale:", event.error);
      this.isListening = false;
      this.updateMicButtonState();

      if (event.error === "no-speech") {
        this.speak("Non ho sentito nulla. Riprova!");
      }
    };

    // Evento quando il riconoscimento termina
    this.recognition.onend = () => {
      this.isListening = false;
      this.updateMicButtonState();
    };
  }

  private setupSpeechSynthesis(): void {
    this.synthesis = window.speechSynthesis;

    if (!this.synthesis) {
      console.error("Speech Synthesis non supportato dal browser");
    }
  }

  private createVoiceUI(): void {
    const centerX = this.gameWidth / 2;
    const centerY = this.gameHeight / 2;

    // Testo che mostra la parola target
    const targetText = this.add
      .text(
        centerX,
        centerY - 100,
        `Parola da pronunciare: ${this.targetWord}`,
        {
          fontSize: "32px",
          color: "#ffffff",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5);

    // Input text (mostra quello che viene riconosciuto)
    this.inputText = this.add
      .text(centerX, centerY - 30, "", {
        fontSize: "36px",
        color: "#ffff00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Bottone microfono
    this.createMicButton(centerX, centerY + 60);
  }

  private createMicButton(x: number, y: number): void {
    // Cerchio del bottone
    const circle = this.add.circle(0, 0, 40, 0x4a90e2);

    // Icona microfono (semplificata)
    const micBody = this.add.rectangle(0, -5, 15, 25, 0xffffff);
    const micBase = this.add.rectangle(0, 15, 25, 8, 0xffffff);

    this.micButton = this.add.container(x, y, [circle, micBody, micBase]);
    this.micButton.setSize(80, 80);
    this.micButton.setInteractive({ useHandCursor: true });

    // Eventi del bottone
    this.micButton.on("pointerdown", () => {
      this.toggleListening();
    });

    this.micButton.on("pointerover", () => {
      circle.setFillStyle(0x357abd);
    });

    this.micButton.on("pointerout", () => {
      circle.setFillStyle(this.isListening ? 0xe74c3c : 0x4a90e2);
    });
  }

  private toggleListening(): void {
    if (!this.recognition) {
      console.error("Riconoscimento vocale non disponibile");
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.inputText.setText("Ascoltando...");
      this.recognition.start();
      this.isListening = true;
    }

    this.updateMicButtonState();
  }

  private updateMicButtonState(): void {
    const circle = this.micButton.getAt(0) as Phaser.GameObjects.Arc;
    circle.setFillStyle(this.isListening ? 0xe74c3c : 0x4a90e2);
  }

  private checkWordMatch(spokenWord: string): void {
    const isCorrect = spokenWord === this.targetWord;

    if (isCorrect) {
      console.log("✓ Parola corretta!");
      this.speak("Bravo!");
      this.inputText.setColor("#00ff00");

      // Opzionale: trigger evento di successo
      this.onWordCorrect();
    } else {
      console.log("✗ Parola errata");
      this.speak("Riprova!");
      this.inputText.setColor("#ff0000");
    }

    // Reset dopo 2 secondi
    this.time.delayedCall(2000, () => {
      this.inputText.setText("");
      this.inputText.setColor("#ffff00");
    });
  }

  private speak(text: string): void {
    if (!this.synthesis) {
      console.error("Speech Synthesis non disponibile");
      return;
    }

    // Ferma eventuali sintesi in corso
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT"; // Risposta in italiano
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.synthesis.speak(utterance);
  }

  private onWordCorrect(): void {
    // Qui puoi aggiungere logica per quando la parola è corretta
    // Ad esempio: incrementare punteggio, passare alla prossima parola, etc.
    console.log("Evento: parola corretta riconosciuta");
  }

  // Metodo pubblico per cambiare la parola target
  public setTargetWord(word: string): void {
    this.targetWord = word.toLowerCase();

    // Aggiorna il testo se esiste
    const targetTextObj = this.children.list.find(
      (child) =>
        child instanceof Phaser.GameObjects.Text &&
        (child as Phaser.GameObjects.Text).text.includes(
          "Parola da pronunciare"
        )
    ) as Phaser.GameObjects.Text;

    if (targetTextObj) {
      targetTextObj.setText(`Parola da pronunciare: ${this.targetWord}`);
    }
  }

  checkGameOver() {
    if (this.isGameOver) {
      console.log(`GAME OVER:`);

      this.canShoot = false;

      // Ferma il riconoscimento vocale se attivo
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }

      this.scene.pause();
      this.gameScene.gameOver();
    }
  }

  // Cleanup quando la scena viene distrutta
  shutdown(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}
