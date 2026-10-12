# Recording and transcribing interviews

Every interview is recorded with OBS into `recordings/` and transcribed into `transcripts/`; `/debrief` grades the transcript. Both stay in the workspace.

## OBS setup (once)

1. Install OBS (`brew install --cask obs` on macOS). On first start grant screen recording and microphone permissions.
2. One scene with three sources: **Display Capture** (the whole screen, or the window of the call app), **Audio Input Capture** (your microphone), **Audio Output Capture** (system audio, so the interviewer's voice is in the file; on macOS this needs OBS 30 or later or a loopback device).
3. Settings, Output: recording path `recordings/` inside the workspace, format mkv or mov, quality "High", 30 fps. Settings, Video: base and output resolution equal to your display.
4. Keep the display capture at position 0,0 and scale 1,1. A black recording with audio usually means the capture item is scaled to zero or positioned off-canvas, not a permissions problem.
5. Ten-second test: record, stop, play. Both voices audible, screen visible.

## Transcription with stable-ts

Install once:

```bash
brew install ffmpeg
pip install -U stable-ts
```

Per recording:

```bash
# 1. audio out of the video
ffmpeg -i "recordings/<file>" -vn -ac 1 -ar 16000 -c:a pcm_s16le "transcripts/<company>-<date>.wav"

# 2. transcript with segment timestamps (medium is fast; large-v3 for noisy audio)
stable-ts "transcripts/<company>-<date>.wav" --model medium --language en --word_level False \
  --output "transcripts/<company>-<date>.srt" --output_format srt

# 3. plain text for reading, no timestamps, exact repeats dropped
sed -E '/^[0-9]+$/d; /-->/d; /^$/d' "transcripts/<company>-<date>.srt" | awk '!seen[$0]++' > "transcripts/<company>-<date>.txt"

# 4. silences over five seconds: the gap between one segment's end and the next one's start
awk -F' --> ' '/-->/ { split($1, a, /[:,]/); s = a[1]*3600 + a[2]*60 + a[3] + a[4]/1000; if (e != "" && s - e > 5) printf "%s to %s: %.1f s\n", end, $1, s - e; split($2, b, /[:,]/); e = b[1]*3600 + b[2]*60 + b[3] + b[4]/1000; end = $2 }' "transcripts/<company>-<date>.srt"
```

Set `--language` to the call's language. Without `--word_level False`, stable-ts writes one entry per word with the whole line repeated and highlighted, which step 3 cannot reduce to plain text.

The `.txt` is for reading the content; timestamps come from the `.srt`.
