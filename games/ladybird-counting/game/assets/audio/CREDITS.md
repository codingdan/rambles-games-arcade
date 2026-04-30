# Audio Credits

All audio assets are used under free-licence terms compatible with this project.

| File | Source | Creator | License | URL | Attribution |
|---|---|---|---|---|---|
| `voice/one.ogg` | Freesound #573225 "4 Year Old Counting to 10" (extracted: 0.265–0.871 s) | elaineaeris | CC0 | https://freesound.org/people/elaineaeris/sounds/573225/ | None required |
| `voice/two.ogg` | Freesound #573225 "4 Year Old Counting to 10" (extracted: 1.903–2.386 s) | elaineaeris | CC0 | https://freesound.org/people/elaineaeris/sounds/573225/ | None required |
| `voice/three.ogg` | Freesound #573225 "4 Year Old Counting to 10" (extracted: 3.285–3.812 s) | elaineaeris | CC0 | https://freesound.org/people/elaineaeris/sounds/573225/ | None required |
| `voice/four.ogg` | Freesound #573225 "4 Year Old Counting to 10" (extracted: 4.493–4.958 s) | elaineaeris | CC0 | https://freesound.org/people/elaineaeris/sounds/573225/ | None required |
| `voice/five.ogg` | Freesound #573225 "4 Year Old Counting to 10" (extracted: 5.534–5.914 s) | elaineaeris | CC0 | https://freesound.org/people/elaineaeris/sounds/573225/ | None required |
| `sfx/chime.ogg` | Freesound #198416 "ambientBell.wav" (extracted: 0.214–1.064 s, 150 ms fade-out) | Divinux | CC0 | https://freesound.org/people/Divinux/sounds/198416/ | None required |
| `sfx/bonk.ogg` | OpenGameArt "100 CC0 Metal and Wood SFX" — `wood_hit_09.ogg`, peak-normalised to −3 dBFS | rubberduck | CC0 | https://opengameart.org/content/100-cc0-metal-and-wood-sfx | None required |
| `ambient/garden-bed.ogg` | Freesound #573023 "UK Spring/Summer birdsong - loopable #1" (extracted t=30–65 s; 30 s crossfade loop rendered via ffmpeg acrossfade) | richwise | CC0 | https://freesound.org/people/richwise/sounds/573023/ | None required |

## Processing Notes

All voice clips were extracted from Freesound #573225 (single child speaker, CC0), trimmed at the silence boundaries detected by ffmpeg silencedetect, peak-normalised to −3 dBFS, converted to OGG Vorbis ~86 kbps, mono, 44.1 kHz.

The chime was extracted from the initial bell strike of Freesound #198416, peak-normalised, with a 150 ms fade-out applied.

The bonk was sourced from the OpenGameArt CC0 pack (wood_hit_09.ogg, 260 ms), peak-normalised.

The garden ambient was created from a 35-second segment of Freesound #573023 (HQ preview). A crossfade loop was rendered: seconds 0–27 are unchanged; seconds 27–30 are a 3-second crossfade between the segment's tail and head, producing a seamlessly looping 30-second clip.

## Re-render History

**Date:** 2026-04-29 (Phase 1 re-plan)

**Defect corrected:** The original `garden-bed.ogg` had an 11.9 dB RMS mismatch at the loop seam (first-200ms −47.2 dBFS vs last-200ms −35.3 dBFS), caused by the prior crossfade blending to source material at t≈2–3 s rather than t=0 s.

**garden-bed.ogg re-render method (Strategy A — scan + tail-only crossfade):**
A Python/soundfile+numpy script scanned the original 30-second PCM for the loop window with the best matching start/end 200-ms RMS. The selected window was t=0.10 s → t=28.50 s (28.4 s duration), where both endpoints fall in natural quiet gaps (RMS ≈ −48 dBFS, delta = 0.13 dB before crossfade). A 1-second equal-power tail-only crossfade (cosine ramps) was applied at the loop end: the last 1 s fades from the original tail content into the first 1 s of the loop (the uniform-quiet intro). This ensures the last 200 ms is perceptually identical to the first 200 ms. Result: seam delta 0.00 dB, seam discontinuity 0.002 (both within spec). File written via chunked `sf.SoundFile` context manager (4-second blocks) as a workaround for a libsndfile OGG encoder crash on long signals under Windows Python 3.13.

**Peak normalization:** `voice/one.ogg`–`five.ogg` and `sfx/bonk.ogg` were each re-scaled and re-encoded to peak ≈ −3 dBFS (from 0 dBFS). Scale factors applied before OGG re-encode: one×0.733, two×0.717, three×0.709, four×0.714, five×0.692, bonk×0.705. Post-encode peaks (OGG lossy round-trip): one −2.83, two −3.26, three −2.67, four −2.96, five −3.18, bonk −3.01 dBFS — all within the [−3.5, −2.5] dBFS acceptance band. `sfx/chime.ogg` was not touched (was already PASS at −1.6 dBFS).
