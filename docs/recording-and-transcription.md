# Recording and transcribing interviews

I record every interview and run the transcript through `/debrief`. The recording is for my own analysis: it is how I find silences, missed questions and the facts I half-heard. It stays in the workspace.

## OBS setup (once)

1. Install OBS (`brew install --cask obs` on macOS). On first start grant screen recording and microphone permissions.
2. One scene with three sources: **Display Capture** (the whole screen, or the window of the call app), **Audio Input Capture** (your microphone), **Audio Output Capture** (system audio, so the interviewer's voice is in the file; on macOS this needs OBS 30 or later or a loopback device).
3. Settings, Output: recording path `recordings/` inside the clone, format mkv or mov, quality "High", 30 fps. Settings, Video: base and output resolution equal to your display.
4. Keep the display capture at position 0,0 and scale 1,1. A black recording with audio usually means the capture item is scaled to zero or positioned off-canvas, not a permissions problem.
5. Ten-second test: record, stop, play. Both voices audible, screen visible. Do this before every interview, not only once.

Start recording before joining the call. The first minute of a late start is silence and cannot be recovered.

## Transcription with stable-ts

Install once:

```bash
brew install ffmpeg
pip install -U stable-ts
```

Per recording:

```bash
# 1. audio out of the video
ffmpeg -i "recordings/<file>.mov" -vn -ac 1 -ar 16000 -c:a pcm_s16le "transcripts/<company>-<date>.wav"

# 2. transcript with timestamps (medium is fast; large-v3 for noisy audio)
stable-ts "transcripts/<company>-<date>.wav" --model medium --language en \
  --output "transcripts/<company>-<date>.srt" --output_format srt

# 3. plain text for reading
sed -E '/^[0-9]+$/d; /-->/d; /^$/d' "transcripts/<company>-<date>.srt" | awk '!seen[$0]++' > "transcripts/<company>-<date>.txt"
```

Set `--language` to the call's language. Word-level output repeats lines; the `awk` step removes exact duplicates. If the first minutes are silence, note it in the debrief: the call started before the recording.

Then: `/debrief <company>`.
