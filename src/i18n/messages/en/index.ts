/**
 * Il dizionario inglese: la fonte di verità. Ogni altra lingua ha la stessa
 * forma, controllata dal compilatore — una chiave mancante o in più in una
 * traduzione non compila.
 *
 * Un file per sezione dell'app, così chi lavora su una schermata tocca solo
 * il suo.
 */
import type { Paths, Widen } from "../../types";
import { account } from "./account";
import { auth } from "./auth";
import { avatar } from "./avatar";
import { common } from "./common";
import { edit } from "./edit";
import { errors } from "./errors";
import { game } from "./game";
import { home } from "./home";
import { host } from "./host";
import { overlay } from "./overlay";
import { play } from "./play";
import { settings } from "./settings";
import { shell } from "./shell";
import { shortcuts } from "./shortcuts";
import { sound } from "./sound";
import { studio } from "./studio";

export const en = {
  common,
  shell,
  home,
  auth,
  account,
  studio,
  edit,
  host,
  play,
  overlay,
  settings,
  shortcuts,
  sound,
  avatar,
  game,
  errors,
};

export type Messages = Widen<typeof en>;
export type MessageKey = Paths<typeof en>;

export default en;
