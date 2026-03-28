# PopUp Studio

AI-powered biblical pop-up book video generator. Type a story idea, get a full 60-75 second video with 3D paper pop-up imagery, narration, and page-turn transitions.

## Stack
- **Backend**: Node.js + Express on Railway
- **Story AI**: OpenRouter (Claude Sonnet)
- **Images**: Runware + FLUX.1
- **Voice**: ElevenLabs
- **Video**: FFmpeg

## Environment Variables (Railway)

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL_ID` | e.g. `anthropic/claude-sonnet-4-5` |
| `RUNWARE_API_KEY` | Runware API key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `PORT` | Auto-set by Railway |

## Local Dev

```
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

Open http://localhost:3000

## Pipeline

1. User types story idea → optionally polishes with AI
2. OpenRouter breaks into 5 scenes + voiceover script
3. Runware generates all 5 images in parallel
4. ElevenLabs generates voiceover audio
5. FFmpeg stitches images + audio → MP4 with page-turn transitions
