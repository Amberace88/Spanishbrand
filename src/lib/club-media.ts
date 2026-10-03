/**
 * Club hero film (Grok). Drop the files into /public/club and rebuild — next.config.ts
 * detects them at build time. Until then the hero shows the animated CSS/SVG background.
 *
 *   public/club/club-loop.mp4     H.264, 1920x1080 (16:9), 6–10 s seamless loop, no audio, ≤ 2.5 MB
 *   public/club/club-loop.webm    optional VP9/AV1 version, ≤ 2 MB
 *   public/club/club-poster.webp  first frame of the loop, 1920x1080, ≤ 180 KB
 */
export const CLUB_MEDIA = {
  mp4: process.env.CLUB_LOOP_MP4 ? "/club/club-loop.mp4" : null,
  webm: process.env.CLUB_LOOP_WEBM ? "/club/club-loop.webm" : null,
  poster: process.env.CLUB_POSTER ? "/club/club-poster.webp" : null,
} as const;
