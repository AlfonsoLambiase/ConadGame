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
  private wordsList: string[] = ["hello" , "apple", "water", "happy", "world"]; // Lista di 5 parole
  private currentWordIndex: number = 0; // Indice della parola corrente
  private targetWord: string = "hello"; // Parola target da riconoscere
  private inputText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text; // Riferimento al testo target
  private micButton!: Phaser.GameObjects.Container;
  private isListening: boolean = false;

  constructor() {
    super({ key: assetConf.scene.gameManager });
  }

  init(data: { gameScene?: Game; targetWord?: string }) {
    if (data.gameScene) {
      this.gameScene = data.gameScene;
    }
    // Inizializza con la prima parola
    this.currentWordIndex = 0;
    this.targetWord = this.wordsList[this.currentWordIndex].toLowerCase();
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

    // Richiedi permesso microfono prima di inizializzare
    this.requestMicrophonePermission().then(() => {
      // Inizializza il riconoscimento vocale e la sintesi
      this.setupSpeechRecognition();
      this.setupSpeechSynthesis();

      // Crea l'interfaccia utente
      this.createVoiceUI();
    }).catch((error) => {
      console.error("Permesso microfono negato o non disponibile:", error);
      // Crea comunque l'UI ma mostra un messaggio di errore
      this.createVoiceUI();
      this.showMicrophoneError();
    });
  }

  private computeLayoutDimensions(): void {
    const config = this.sys.game.config as { width: number; height: number };

    this.gameWidth = Number(config.width);
    this.gameHeight = Number(config.height);

    this.marginTop = this.gameScene.setDynamicValueBasedOnScale(150, 400);
  }

  private async requestMicrophonePermission(): Promise<void> {
    // Verifica se l'API è disponibile
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia non supportato dal browser");
    }

    try {
      // Richiedi permesso per il microfono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Chiudi lo stream immediatamente, serve solo per ottenere il permesso
      stream.getTracks().forEach((track) => track.stop());
      console.log("Permesso microfono concesso");
    } catch (error) {
      console.error("Errore nella richiesta permesso microfono:", error);
      throw error;
    }
  }

  private showMicrophoneError(): void {
    const centerX = this.gameWidth / 2;
    const centerY = this.gameHeight / 2 + this.gameScene.setDynamicValueBasedOnScale(120, 150);
    const errorFontSize = this.gameScene.setDynamicValueBasedOnScale(18, 24);
    const wordWrapWidth = this.gameWidth - this.gameScene.setDynamicValueBasedOnScale(30, 40);

    const errorText = this.add
      .text(centerX, centerY, "Permesso microfono necessario per giocare", {
        fontSize: `${errorFontSize}px`,
        color: "#ff0000",
        fontStyle: "bold",
        fontFamily: "Paytone One",
        align: "center",
        wordWrap: { width: wordWrapWidth },
      })
      .setOrigin(0.5);

    // Disabilita il bottone microfono
    if (this.micButton) {
      this.micButton.setAlpha(0.5);
      this.micButton.removeInteractive();
    }
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

    const targetFontSize = this.gameScene.setDynamicValueBasedOnScale(24, 32);
    const inputFontSize = this.gameScene.setDynamicValueBasedOnScale(28, 36);
    const offsetY = this.gameScene.setDynamicValueBasedOnScale(200, 250);
    const inputOffsetY = this.gameScene.setDynamicValueBasedOnScale(150, 180);

    // Testo che mostra la parola target
    this.targetText = this.add
      .text(
        centerX,
        centerY - offsetY,
        `Parola da pronunciare: ${this.targetWord}`,
        {
          fontSize: `${targetFontSize}px`,
          color: "#ffffff",
          fontFamily: "Paytone One",
        }
      )
      .setOrigin(0.5);

    // Input text (mostra quello che viene riconosciuto)
    this.inputText = this.add
      .text(centerX, centerY - inputOffsetY, "", {
        fontSize: `${inputFontSize}px`,
        color: "#ffff00",
        fontStyle: "bold",
        fontFamily: "Paytone One",
      })
      .setOrigin(0.5);

    // Bottone microfono
    const micOffsetY = this.gameScene.setDynamicValueBasedOnScale(50, 60);
    this.createMicButton(centerX, centerY + micOffsetY);
  }

  private createMicButton(x: number, y: number): void {
    // Immagine microfono dagli assets
    const micImage = this.add.image(0, 0, assetConf.image.mic);
    micImage.setOrigin(0.5);
    micImage.setScale(this.gameScene.setDynamicValueBasedOnScale(0.03, 0.05)); // Scala l'immagine al 30% della dimensione originale

    this.micButton = this.add.container(x, y, [micImage]);
    this.micButton.setSize(micImage.width * 0.3, micImage.height * 0.3);
    this.micButton.setInteractive({ useHandCursor: true });

    // Eventi del bottone
    this.micButton.on("pointerdown", () => {
      this.toggleListening();
    });

    this.micButton.on("pointerover", () => {
      micImage.setTint(0x357abd);
    });

    this.micButton.on("pointerout", () => {
      micImage.clearTint();
      this.updateMicButtonState();
    });
  }

  private toggleListening(): void {
    if (!this.recognition) {
      console.error("Riconoscimento vocale non disponibile");
      this.speak("Microfono non disponibile");
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      // Richiedi nuovamente il permesso se necessario
      this.requestMicrophonePermission()
        .then(() => {
          this.inputText.setText("Ascoltando...");
          this.recognition!.start();
          this.isListening = true;
          this.updateMicButtonState();
        })
        .catch((error) => {
          console.error("Permesso microfono negato:", error);
          this.speak("Permesso microfono necessario");
          this.inputText.setText("Permesso negato");
          this.inputText.setColor("#ff0000");
        });
      return;
    }

    this.updateMicButtonState();
  }

  private updateMicButtonState(): void {
    const micImage = this.micButton.getAt(0) as Phaser.GameObjects.Image;
    if (this.isListening) {
      micImage.setTint(0xe74c3c); // Rosso quando sta ascoltando
    } else {
      micImage.clearTint(); // Colore normale quando non ascolta
    }
  }

  private checkWordMatch(spokenWord: string): void {
    const isCorrect = spokenWord === this.targetWord;

    if (isCorrect) {
      console.log("✓ Parola corretta!");
      this.speak("Bravo!");
      this.inputText.setColor("#00ff00");

      // Incrementa punteggio e passa alla prossima parola
      this.onWordCorrect();
    } else {
      console.log("✗ Parola errata");
      this.speak("Riprova!");
      this.inputText.setColor("#ff0000");

      // Reset dopo 2 secondi
      this.time.delayedCall(2000, () => {
        this.inputText.setText("");
        this.inputText.setColor("#ffff00");
      });
    }
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
    // Incrementa il punteggio tramite UIManager
    if (this.gameScene && this.gameScene.uiManager) {
      this.gameScene.uiManager.updateScore(1);
    }

    // Passa alla prossima parola
    this.currentWordIndex++;

    // Se abbiamo completato tutte le 5 parole, attiva il game over
    if (this.currentWordIndex >= this.wordsList.length) {
      console.log("Tutte le parole completate!");
      this.time.delayedCall(1500, () => {
        this.isGameOver = true;
        this.checkGameOver();
      });
      return;
    }

    // Aggiorna la parola target
    this.targetWord = this.wordsList[this.currentWordIndex].toLowerCase();
    this.targetText.setText(`Parola da pronunciare: ${this.targetWord}`);

    // Reset input text dopo un breve delay
    this.time.delayedCall(2000, () => {
      this.inputText.setText("");
      this.inputText.setColor("#ffff00");
    });
  }

  // Metodo pubblico per cambiare la parola target
  public setTargetWord(word: string): void {
    this.targetWord = word.toLowerCase();

    // Aggiorna il testo se esiste
    if (this.targetText) {
      this.targetText.setText(`Parola da pronunciare: ${this.targetWord}`);
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
