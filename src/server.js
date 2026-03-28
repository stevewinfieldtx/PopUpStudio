require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fse = require('fs-extra')

const storyRouter = require('./routes/story')
const imagesRouter = require('./routes/images')
const audioRouter = require('./routes/audio')
const videoRouter = require('./routes/video')
const voicesRouter = require('./routes/voices')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, '../public')))

// Ensure tmp and output dirs exist
fse.ensureDirSync(path.join(__dirname, '../tmp'))
fse.ensureDirSync(path.join(__dirname, '../output'))

// API routes
app.use('/api/story', storyRouter)
app.use('/api/images', imagesRouter)
app.use('/api/audio', audioRouter)
app.use('/api/video', videoRouter)
app.use('/api/voices', voicesRouter)

// Serve output files
app.use('/output', express.static(path.join(__dirname, '../output')))

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`PopUpStudio running on port ${PORT}`))
