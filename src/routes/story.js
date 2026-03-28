const express = require('express')
const router = express.Router()
const axios = require('axios')

const POPUP_IMAGE_PREFIX = `Macro photography of a real physical 3D paper pop-up book lying open, shot from slightly above at eye level. White ILLUSTRATED book pages visible flat — the flat pages show a painted watercolor scene that matches the popup elements. From the center spine, cardstock figures stand UPRIGHT and PERPENDICULAR to the page surface on accordion-fold paper tabs. Multiple layers of die-cut paper create true foreground, midground, and background depth. Hard shadows cast onto the illustrated page from standing paper elements. This is NOT a flat illustration — it is a PHYSICAL paper sculpture being photographed. Scene: `

const POPUP_IMAGE_SUFFIX = `. Technical details: sharp studio lighting, real paper texture visible, paper edges and folds clearly visible, illustrated watercolor background on the open pages, depth of field blur on foreground elements, photorealistic paper craft photography, Hallmark pop-up book quality`

const SYSTEM_PROMPT = `You are a creative director for a children's biblical pop-up book video series. 
Given a story idea, you will:
1. Write an improved, engaging version of the story for children aged 4-10
2. Break it into exactly 5 scenes that can be shown as pop-up book spreads
3. Write a voiceover script that reads naturally in 60-75 seconds total
4. For each scene, write a detailed image generation prompt

Respond ONLY with valid JSON in this exact structure:
{
  "title": "Story title",
  "voiceover": "Full 60-75 second narration script...",
  "scenes": [
    {
      "id": 1,
      "title": "Scene title",
      "duration": 12,
      "voiceover_segment": "The portion of narration for this scene...",
      "image_prompt": "Detailed scene description for paper popup photography..."
    }
  ]
}

For each image_prompt, describe the PHYSICAL 3D paper elements: which figures stand on accordion tabs, what the layered die-cut background looks like, what the illustrated flat pages show, colors and lighting. Do NOT describe flat illustrations — describe physical paper sculptures.`

// POST /api/story/create
router.post('/create', async (req, res) => {
  const { idea, style = 'warm and wonder-filled' } = req.body
  if (!idea) return res.status(400).json({ error: 'Story idea is required' })

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL_ID || 'anthropic/claude-sonnet-4-5',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Story idea: "${idea}"\nTone: ${style}\n\nCreate the full pop-up book story with 5 scenes and voiceover script.` }
        ],
        temperature: 0.8,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://popupstudio.app',
          'X-Title': 'PopUp Studio'
        }
      }
    )

    const content = response.data.choices[0].message.content
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const story = JSON.parse(clean)

    // Inject the popup photography wrapper into each image prompt
    story.scenes = story.scenes.map(scene => ({
      ...scene,
      image_prompt: POPUP_IMAGE_PREFIX + scene.image_prompt + POPUP_IMAGE_SUFFIX
    }))

    res.json({ success: true, story })
  } catch (err) {
    console.error('Story creation error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/story/polish — just improve the writing, don't break into scenes
router.post('/polish', async (req, res) => {
  const { idea } = req.body
  if (!idea) return res.status(400).json({ error: 'Story idea is required' })

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL_ID || 'anthropic/claude-sonnet-4-5',
        messages: [
          {
            role: 'system',
            content: 'You are a children\'s book author. Take the user\'s rough story idea and polish it into a beautifully written 2-3 sentence story concept suitable for a biblical children\'s pop-up book. Keep it warm, wonder-filled, and age-appropriate for children 4-10. Return ONLY the polished text, nothing else.'
          },
          { role: 'user', content: idea }
        ],
        temperature: 0.9,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const polished = response.data.choices[0].message.content.trim()
    res.json({ success: true, polished })
  } catch (err) {
    console.error('Polish error:', err.response?.data || err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
