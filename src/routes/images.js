const express = require('express')
const router = express.Router()
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

// POST /api/images/generate — generate all scene images in parallel
router.post('/generate', async (req, res) => {
  const { scenes, model = 'runware:100@1', width = 1344, height = 768 } = req.body
  if (!scenes || !scenes.length) return res.status(400).json({ error: 'Scenes are required' })

  try {
    const tasks = scenes.map(scene => ({
      taskType: 'imageInference',
      taskUUID: uuidv4(),
      model,
      positivePrompt: scene.image_prompt,
      negativePrompt: 'flat illustration, 2D painting, digital art, cartoon, anime, blurry, dark, modern setting, ugly, distorted, watermark, text overlay, no depth',
      width,
      height,
      numberResults: 1,
      steps: model.includes('schnell') ? 4 : 30,
      CFGScale: 5,
      outputType: ['URL'],
      outputFormat: 'PNG'
    }))

    const response = await axios.post(
      'https://api.runware.ai/v1',
      tasks,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWARE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    )

    const results = response.data?.data || []

    // Map results back to scene IDs by task UUID order
    const images = tasks.map((task, i) => {
      const result = results.find(r => r.taskUUID === task.taskUUID) || results[i]
      return {
        sceneId: scenes[i].id,
        imageURL: result?.imageURL || null,
        error: result?.error || null
      }
    })

    res.json({ success: true, images })
  } catch (err) {
    console.error('Image generation error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
