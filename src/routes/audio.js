const express = require('express')
const router = express.Router()
const axios = require('axios')
const path = require('path')
const fse = require('fs-extra')
const { v4: uuidv4 } = require('uuid')

// POST /api/audio/generate — generate voiceover with ElevenLabs
router.post('/generate', async (req, res) => {
  const { script, voiceId, jobId } = req.body
  if (!script || !voiceId) return res.status(400).json({ error: 'Script and voiceId are required' })

  const id = jobId || uuidv4()
  const outputPath = path.join(__dirname, '../../tmp', `${id}_audio.mp3`)

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    )

    await fse.writeFile(outputPath, response.data)
    res.json({ success: true, audioFile: `${id}_audio.mp3`, jobId: id })
  } catch (err) {
    console.error('Audio generation error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
