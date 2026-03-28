const express = require('express')
const router = express.Router()
const ffmpeg = require('fluent-ffmpeg')
const axios = require('axios')
const path = require('path')
const fse = require('fs-extra')
const { v4: uuidv4 } = require('uuid')

// Download image from URL to local tmp file
async function downloadImage(url, dest) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
  await fse.writeFile(dest, response.data)
}

// POST /api/video/render
router.post('/render', async (req, res) => {
  const { jobId, images, scenes, audioFile, title } = req.body
  // images: [{ sceneId, imageURL }]
  // scenes: [{ id, duration }]

  if (!images || !audioFile) return res.status(400).json({ error: 'images and audioFile are required' })

  const id = jobId || uuidv4()
  const tmpDir = path.join(__dirname, '../../tmp', id)
  const outputFile = path.join(__dirname, '../../output', `${id}.mp4`)
  const audioPath = path.join(__dirname, '../../tmp', audioFile)

  await fse.ensureDir(tmpDir)

  try {
    // 1. Download all scene images
    console.log(`[${id}] Downloading ${images.length} images...`)
    const localImages = []
    for (let i = 0; i < images.length; i++) {
      const imgPath = path.join(tmpDir, `scene_${i + 1}.png`)
      await downloadImage(images[i].imageURL, imgPath)
      localImages.push({ path: imgPath, duration: scenes[i]?.duration || 12 })
    }

    // 2. Build FFmpeg concat filter with page-turn transitions
    // Each scene: hold for (duration - 1.5)s, then 1.5s page-turn dissolve
    const TRANSITION_DURATION = 1.5
    const WIDTH = 1344
    const HEIGHT = 768

    // Create concat list with transitions using xfade
    // We'll build a complex filter chain
    const totalDuration = localImages.reduce((sum, img) => sum + img.duration, 0)

    console.log(`[${id}] Building video with ${totalDuration}s total duration...`)

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg()

      // Add all image inputs
      localImages.forEach(img => {
        cmd = cmd.input(img.path).inputOptions(['-loop 1'])
      })

      // Add audio
      cmd = cmd.input(audioPath)

      // Build xfade filter chain for page-turn transitions
      const filterParts = []
      const numScenes = localImages.length

      // Scale each image to consistent size
      localImages.forEach((img, i) => {
        filterParts.push(`[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`)
      })

      // Chain xfade transitions between scenes
      let lastOutput = 'v0'
      let timeOffset = 0
      for (let i = 0; i < numScenes - 1; i++) {
        const offset = timeOffset + localImages[i].duration - TRANSITION_DURATION
        timeOffset += localImages[i].duration - TRANSITION_DURATION
        const nextOutput = i === numScenes - 2 ? 'vout' : `xf${i}`
        filterParts.push(`[${lastOutput}][v${i + 1}]xfade=transition=squeezeh:duration=${TRANSITION_DURATION}:offset=${offset}[${nextOutput}]`)
        lastOutput = nextOutput
      }

      const complexFilter = filterParts.join('; ')

      cmd
        .complexFilter(complexFilter)
        .outputOptions([
          '-map [vout]',
          `-map ${numScenes}:a`,
          '-c:v libx264',
          '-preset fast',
          '-crf 22',
          '-c:a aac',
          '-b:a 192k',
          `-t ${totalDuration}`,
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ])
        .output(outputFile)
        .on('start', cmd => console.log(`[${id}] FFmpeg started`))
        .on('progress', p => console.log(`[${id}] Progress: ${Math.round(p.percent || 0)}%`))
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    // Cleanup tmp scene images
    await fse.remove(tmpDir)

    const filename = `${id}.mp4`
    res.json({
      success: true,
      videoUrl: `/output/${filename}`,
      filename,
      jobId: id
    })

  } catch (err) {
    console.error(`[${id}] Render error:`, err.message)
    await fse.remove(tmpDir).catch(() => {})
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
