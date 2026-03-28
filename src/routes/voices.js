const express = require('express')
const router = express.Router()
const axios = require('axios')

// GET /api/voices — fetch available ElevenLabs voices
router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    })

    const voices = response.data.voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      category: v.category,
      description: v.labels?.description || '',
      accent: v.labels?.accent || '',
      age: v.labels?.age || '',
      gender: v.labels?.gender || '',
      previewUrl: v.preview_url
    }))

    res.json({ success: true, voices })
  } catch (err) {
    console.error('Voices error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
