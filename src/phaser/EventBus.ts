import { PhaserEvents } from "@/lib/phaser-events";
import { Events } from "phaser";

export const EventBus = new Events.EventEmitter();

const redirectToRoot = () => {
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};

export const PhaserFlow = {
  EXIT_GAME() {
    redirectToRoot();
  },

  END_GAME() {
    redirectToRoot();
  },
};

// LISTENER GLOBALI
EventBus.on(PhaserEvents.EXIT_GAME, redirectToRoot);
EventBus.on(PhaserEvents.END_GAME, redirectToRoot);