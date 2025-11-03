import Phaser from "phaser";
 
export const GameEvents = {
  PAUSE_GAME: "PAUSE_GAME",
  RESUME_GAME: "RESUME_GAME",
  GAME_OVER: "GAME_OVER",
};
 
export const GlobalEvents = new Phaser.Events.EventEmitter();
 