import {createContext, useContext, type ReactNode} from "react";

export type GameSponsor = {
  id?: number;
  urlLogo?: string;
};

export type GameContextValue = {
  game?: {
    sponsor?: GameSponsor;
  };
};

const GameContext = createContext<GameContextValue>({});

export function GameProvider({
  children,
  value = {},
}: {
  children: ReactNode;
  value?: GameContextValue;
}) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  return useContext(GameContext);
}
