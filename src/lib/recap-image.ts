import type { Recap } from "@/lib/recap";

/**
 * L'immagine da mandare nel gruppo dopo la partita.
 *
 * Disegnata su una tela e non fotografando la pagina: niente librerie, e
 * soprattutto niente caratteri o colori che a volte vengono e a volte no.
 * Formato 1200x675, cioè quello che le chat mostrano intero senza tagliare.
 */
export function drawRecap(
  canvas: HTMLCanvasElement,
  data: {
    title: string;
    teams: { name: string; score: number; colour: string }[];
    lines: string[];
    footer: string;
  },
): void {
  const W = 1200;
  const H = 675;
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) return;

  g.fillStyle = "#140c17";
  g.fillRect(0, 0, W, H);

  // Due aloni molto larghi: danno profondità senza disegnare niente.
  for (const [x, y, r, colour] of [
    [W * 0.2, H * 0.1, W * 0.5, "rgba(226,182,255,0.18)"],
    [W * 0.85, H * 0.9, W * 0.55, "rgba(255,206,120,0.16)"],
  ] as [number, number, number, string][]) {
    const glow = g.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, colour);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
  }

  g.textAlign = "center";
  g.fillStyle = "#f1e7f4";
  g.font = "700 38px system-ui, sans-serif";
  g.fillText(data.title, W / 2, 96);

  // I punteggi, fianco a fianco.
  const slot = W / (data.teams.length + 1);
  data.teams.forEach((team, i) => {
    const x = slot * (i + 1);
    g.fillStyle = team.colour;
    g.font = "800 28px system-ui, sans-serif";
    g.fillText(team.name.toUpperCase(), x, 190);
    g.fillStyle = "#ffffff";
    g.font = "900 110px system-ui, sans-serif";
    g.fillText(String(team.score), x, 300);
  });

  g.font = "500 30px system-ui, sans-serif";
  g.fillStyle = "rgba(241,231,244,0.88)";
  data.lines.slice(0, 4).forEach((line, i) => {
    g.fillText(line, W / 2, 390 + i * 54);
  });

  g.font = "600 24px system-ui, sans-serif";
  g.fillStyle = "rgba(241,231,244,0.55)";
  g.fillText(data.footer, W / 2, H - 46);
}

/** Le righe del riepilogo, già scritte nella lingua di chi guarda. */
export function recapLines(
  recap: Recap,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string[] {
  const lines: string[] = [];
  if (recap.fastestFinger) {
    lines.push(
      t("host.recap.fastest", {
        name: recap.fastestFinger.name,
        count: recap.fastestFinger.firsts,
      }),
    );
  }
  if (recap.topScorer) {
    lines.push(
      t("host.recap.topScorer", { name: recap.topScorer.name, count: recap.topScorer.correct }),
    );
  }
  if (recap.hardestCategory) {
    lines.push(
      t("host.recap.hardest", {
        category: recap.hardestCategory.title,
        count: recap.hardestCategory.wrong,
      }),
    );
  }
  lines.push(t("host.recap.totals", { buzzes: recap.totalBuzzes, tiles: recap.tilesPlayed }));
  return lines;
}
