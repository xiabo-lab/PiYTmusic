export type WhatsNewSection = {
  heading?: string;
  /** Bulleted list of changes. */
  items?: string[];
  /**
   * Prose message rendered as a soft note panel instead of bullets.
   * Use for a personal note from the developer rather than a change
   * list. Ignored when `items` is present.
   */
  body?: string;
  /**
   * Short call-to-action rendered as a yellow alert panel below the
   * items or body. Use for a must-read instruction, e.g. signing in
   * again after an update.
   */
  alert?: string;
};

export type WhatsNewEntry = {
  /** Semver string, e.g. "0.2.0", matched against the running app version. */
  version: string;
  /** Display date, pre-formatted so there's no locale work at runtime. */
  date: string;
  /**
   * Bundled hero image served from `/public`, e.g.
   * "/whats-new/0.2.0.jpg". Omit to fall back to the branded gradient
   * banner rendered by the dialog.
   */
  image?: string;
  sections: WhatsNewSection[];
};

/**
 * Curated release notes for the What's New dialog, newest first. The
 * dialog shows the entry whose version matches the running app (or the
 * newest one when opened manually). Add an entry here for every
 * user-facing release; keep the copy free of em/en dashes.
 */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: "0.3.2",
    date: "July 2026",
    sections: [
      {
        heading: "More room for lyrics",
        items: [
          "The side player no longer shows the album picture, so the player and lyrics move up and the lyrics get more space.",
          "The full-screen lyrics scroll more smoothly, especially on a Raspberry Pi driving a large display.",
        ],
      },
    ],
  },
  {
    version: "0.3.1",
    date: "July 2026",
    sections: [
      {
        heading: "Lyrics on small screens",
        items: [
          "The full-screen lyrics view now fits short displays, so it works on a wide, short panel as a dedicated lyrics screen.",
          "Press L at any time to open or close the full-screen lyrics, even when the player controls aren't visible.",
        ],
      },
    ],
  },
  {
    version: "0.3.0",
    date: "July 2026",
    sections: [
      {
        heading: "Full-screen lyrics",
        items: [
          "A new button in the player, just left of the lyrics mic, opens a full-screen karaoke view.",
          "Lyrics fill the top of the screen; the song, progress bar and full playback controls sit below, including the lyrics source, queue and volume. Press Escape or the close button to exit.",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "July 2026",
    sections: [
      {
        heading: "First release",
        items: [
          "A fast YouTube Music client for Windows and the Raspberry Pi 4 and 5.",
          "Lyrics come from YouTube Music first, then Kugou, LRCLIB, NetEase, Musixmatch and QQ Music, so Chinese songs are covered as well as English ones.",
          "Synced lyrics are preferred over plain ones whichever source they come from, and titles written in traditional or simplified Chinese both resolve.",
        ],
      },
    ],
  },
];

/** The entry for a specific version, if one exists. */
export function whatsNewFor(version: string): WhatsNewEntry | undefined {
  return WHATS_NEW.find((e) => e.version === version);
}
