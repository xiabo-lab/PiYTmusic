import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Loader2Icon,
  Maximize2Icon,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlaybackStore, currentTrack } from "@/lib/store/playback";
import { useKaraokeStore } from "@/lib/store/karaoke";
import { LyricsBody, useLyricsView } from "@/components/layout/lyrics-view";
import {
  ProgressSlider,
  formatTime,
  repeatLabel,
} from "@/components/layout/player-bar";
import { cn } from "@/lib/utils";

// Plain-vite dev in a browser has no Tauri backend; `getCurrentWindow()`
// throws there. Same guard the title bar uses.
const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Full-screen "karaoke" lyrics overlay.
 *
 * Opened from the player bar (the button left of the lyrics-source mic).
 * Lyrics fill the top of the screen; the track name, progress bar and
 * transport controls sit centered in the lower band. No cover art — this
 * is for reading along, deliberately text-only.
 *
 * Mounted once at the app-shell root so it can cover the whole window,
 * including the custom title bar. While open it also asks the OS window
 * to go fullscreen (best-effort), so on the Pi it fills the display
 * rather than just the app window; the previous fullscreen state is
 * restored on close.
 */
export function KaraokeView() {
  const open = useKaraokeStore((s) => s.open);
  const setOpen = useKaraokeStore((s) => s.setOpen);

  // Escape closes, matching every other overlay in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Drive real OS fullscreen while open, restoring the prior state after.
  useEffect(() => {
    if (!open || !IS_TAURI) return;
    let cancelled = false;
    let prev = false;
    const win = getCurrentWindow();
    void win
      .isFullscreen()
      .then((was) => {
        prev = was;
        if (!cancelled) return win.setFullscreen(true);
      })
      .catch(() => {
        /* compositor refused fullscreen — the overlay still fills the window */
      });
    return () => {
      cancelled = true;
      // Only undo our own change; if the user was already fullscreen,
      // leave them there.
      if (!prev) void win.setFullscreen(false).catch(() => {});
    };
  }, [open]);

  if (!open) return null;
  return <KaraokeStage onClose={() => setOpen(false)} />;
}

/**
 * The player-bar button that opens the overlay. Sits immediately left of
 * the lyrics-source mic. Disabled with no track, since there'd be no
 * lyrics to show.
 */
export function KaraokeButton({ className }: { className?: string }) {
  const setOpen = useKaraokeStore((s) => s.setOpen);
  const hasTrack = usePlaybackStore((s) => s.index >= 0);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Full-screen lyrics"
          disabled={!hasTrack}
          onClick={() => setOpen(true)}
          className={className}
        >
          <Maximize2Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Full-screen lyrics</TooltipContent>
    </Tooltip>
  );
}

function KaraokeStage({ onClose }: { onClose: () => void }) {
  const { playing, status, position, duration, shuffle, repeat } =
    usePlaybackStore(
      useShallow((s) => ({
        playing: s.playing,
        status: s.status,
        position: s.position,
        duration: s.duration,
        shuffle: s.shuffle,
        repeat: s.repeat,
      })),
    );
  const track = usePlaybackStore(currentTrack);
  const toggle = usePlaybackStore((s) => s.toggle);
  const next = usePlaybackStore((s) => s.next);
  const prev = usePlaybackStore((s) => s.prev);
  const seek = usePlaybackStore((s) => s.seek);
  const setShuffle = usePlaybackStore((s) => s.setShuffle);
  const cycleRepeat = usePlaybackStore((s) => s.cycleRepeat);

  const [scrub, setScrub] = useState<number | null>(null);
  const lyricsState = useLyricsView(track);

  const hasTrack = !!track;
  const loading = status === "loading" && playing;
  const artist =
    track?.artists?.map((a) => a.name).join(", ") ?? track?.subtitle ?? "";

  return (
    <TooltipProvider delayDuration={600}>
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] text-foreground">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Exit full screen"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground"
        >
          <XIcon />
        </Button>

        {/* Lyrics — upper portion. flex-[3] gives them ~60% of the
            height; the column scrolls internally and keeps the active
            line centered. */}
        <div className="flex min-h-0 flex-[3] flex-col items-center pt-[7vh]">
          <div className="flex h-full min-h-0 w-full max-w-4xl flex-col">
            <LyricsBody state={lyricsState} display="stage" />
          </div>
        </div>

        {/* Controls — centered in the lower band (~40% of the height). */}
        <div className="flex flex-[2] shrink-0 items-center justify-center px-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
            <div className="flex flex-col items-center text-center">
              <span className="text-2xl font-semibold sm:text-3xl">
                {track?.title ?? "Nothing playing"}
              </span>
              {artist ? (
                <span className="mt-1.5 text-lg text-muted-foreground">
                  {artist}
                </span>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-2">
              <ProgressSlider
                position={position}
                duration={duration}
                scrub={scrub}
                setScrub={setScrub}
                seek={seek}
                disabled={!hasTrack || duration <= 0}
              />
              <div className="flex justify-between text-sm tabular-nums text-muted-foreground">
                <span>{formatTime(scrub ?? position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Shuffle"
                aria-pressed={shuffle}
                onClick={() => setShuffle(!shuffle)}
                className={cn("size-11", shuffle && "text-brand")}
              >
                <ShuffleIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous"
                onClick={prev}
                disabled={!hasTrack}
                className="size-11"
              >
                <SkipBackIcon className="fill-current" />
              </Button>
              <Button
                size="icon"
                aria-label={playing ? "Pause" : "Play"}
                onClick={toggle}
                disabled={!hasTrack}
                className="size-16 rounded-full bg-brand text-white hover:bg-brand/90"
              >
                {loading ? (
                  <Loader2Icon className="animate-spin" />
                ) : playing ? (
                  <PauseIcon className="size-7 fill-current" />
                ) : (
                  <PlayIcon className="size-7 fill-current" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next"
                onClick={next}
                disabled={!hasTrack}
                className="size-11"
              >
                <SkipForwardIcon className="fill-current" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={repeatLabel(repeat)}
                    aria-pressed={repeat !== "off"}
                    onClick={cycleRepeat}
                    className={cn("size-11", repeat !== "off" && "text-brand")}
                  >
                    {repeat === "one" ? <Repeat1Icon /> : <RepeatIcon />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{repeatLabel(repeat)}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
