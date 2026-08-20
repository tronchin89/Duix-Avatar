import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import log from '../logger.js'

import fs from 'fs'

function findBinary(name) {
  const commonPaths = [
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`
  ]
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p
  }
  return name
}

function initFFmpeg() {
  if (process.env.NODE_ENV === undefined) {
    process.env.NODE_ENV = 'production'
  }

  let ffmpegPathValue
  let ffprobePathValue

  if (process.platform === 'darwin') {
    ffmpegPathValue = findBinary('ffmpeg')
    ffprobePathValue = findBinary('ffprobe')
  } else if (process.platform === 'win32') {
    ffmpegPathValue = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../../resources/ffmpeg/win-amd64/bin/ffmpeg.exe')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'ffmpeg', 'win-amd64', 'bin', 'ffmpeg.exe')
    ffprobePathValue = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../../resources/ffmpeg/win-amd64/bin/ffprobe.exe')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'ffmpeg', 'win-amd64', 'bin', 'ffprobe.exe')
  } else {
    ffmpegPathValue = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../../resources/ffmpeg/linux-amd64/ffmpeg')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'ffmpeg', 'linux-amd64', 'ffmpeg')
    ffprobePathValue = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../../resources/ffmpeg/linux-amd64/ffprobe')
      : path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'ffmpeg', 'linux-amd64', 'ffprobe')
  }

  log.debug('ENV:', `${process.env.NODE_ENV}-${process.platform}`)
  log.info('FFmpeg path:', ffmpegPathValue)
  if (ffmpegPathValue) {
    ffmpeg.setFfmpegPath(ffmpegPathValue)
  }

  log.info('FFprobe path:', ffprobePathValue)
  if (ffprobePathValue) {
    ffmpeg.setFfprobePath(ffprobePathValue)
  }
}

initFFmpeg()

export function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .save(audioPath)
      .on('end', () => {
        log.info('audio split done')
        resolve(true)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

export async function toH264(videoPath, outputPath) {
  // const hasNvidia = await detectNvidia()
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .save(outputPath)
      .on('end', () => {
        log.info('video convert to h264 done')
        resolve(true)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

function detectNvidia() {
  return new Promise((resolve) => {
    const exec = require('child_process').exec;
    exec('nvidia-smi', (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath).ffprobe((err, data) => {
      if (err) {
        log.error("🚀 ~ ffmpeg ~ err:", err)
        reject(err)
      } else if (data && data.streams && data.streams.length > 0) {
        resolve(data.streams[0].duration) // 单位秒
      } else {
        log.error('No streams found')
        reject(new Error('No streams found'))
      }
    })
  })
}
