import { db } from '../db/database.js'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('사진을 백업 파일로 변환하지 못했어요.'))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(value, mimeType) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' })
}

export async function exportBackup() {
  const [entries, photos] = await Promise.all([db.entries.toArray(), db.photos.toArray()])
  const payload = {
    format: 'life-logbook-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    photos: await Promise.all(photos.map(async ({ blob, ...photo }) => ({
      ...photo,
      mimeType: photo.mimeType || blob.type,
      data: await blobToBase64(blob),
    }))),
  }
  const file = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `life-logbook-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function restoreBackup(file) {
  const payload = JSON.parse(await file.text())
  if (payload?.format !== 'life-logbook-backup' || payload?.version !== 1) {
    throw new Error('LIFE LOGBOOK 백업 파일을 확인해 주세요.')
  }
  if (!Array.isArray(payload.entries) || !Array.isArray(payload.photos)) {
    throw new Error('백업 파일의 기록 또는 사진 데이터가 올바르지 않아요.')
  }

  const entries = payload.entries.map((entry) => {
    if (!entry || typeof entry.date !== 'string' || typeof entry.title !== 'string') {
      throw new Error('백업 파일에 올바르지 않은 기록이 포함되어 있어요.')
    }
    const { id, ...value } = entry
    return value
  })
  const idsByOriginal = new Map(payload.entries.map((entry, index) => [entry.id, index]))
  const photos = payload.photos.map((photo) => {
    const entryIndex = idsByOriginal.get(photo.entryId)
    if (entryIndex === undefined || typeof photo.data !== 'string') {
      throw new Error('기록과 연결되지 않은 사진이 백업 파일에 있어요.')
    }
    return {
      entryIndex,
      blob: base64ToBlob(photo.data, photo.mimeType),
      fileName: photo.fileName || 'photo',
      mimeType: photo.mimeType || 'application/octet-stream',
      createdAt: photo.createdAt || new Date().toISOString(),
    }
  })

  await db.transaction('rw', db.entries, db.photos, db.drafts, async () => {
    await db.photos.clear()
    await db.entries.clear()
    const newIds = await db.entries.bulkAdd(entries, { allKeys: true })
    await db.photos.bulkAdd(photos.map(({ entryIndex, ...photo }) => ({ ...photo, entryId: newIds[entryIndex] })))
    await db.drafts.clear()
  })
}