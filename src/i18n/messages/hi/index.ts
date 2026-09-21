import type { Messages } from "../en/index";
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

const hi: Messages = {
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

export default hi;
