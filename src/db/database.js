import Dexie from 'dexie'

export const db = new Dexie('LifeLogbookDB')

db.version(1).stores({
  entries: '++id, date, createdAt, updatedAt',
  photos: '++id, entryId, createdAt',
  drafts: 'id, updatedAt',
})

export async function saveEntry(entry, photos, retainedPhotoIds) {
  return db.transaction('rw', db.entries, db.photos, async () => {
    const now = new Date().toISOString()
    const payload = {
      date: entry.date,
      title: entry.title.trim(),
      content: entry.content.trim(),
      mood: entry.mood,
      tags: entry.tags,
      updatedAt: now,
    }

    let entryId = entry.id
    if (entryId) {
      await db.entries.update(entryId, payload)
    } else {
      entryId = await db.entries.add({ ...payload, createdAt: now })
    }

    const currentPhotos = await db.photos.where('entryId').equals(entryId).toArray()
    const retained = new Set(retainedPhotoIds)
    const removedIds = currentPhotos.filter((photo) => !retained.has(photo.id)).map((photo) => photo.id)
    if (removedIds.length) await db.photos.bulkDelete(removedIds)

    const newPhotos = photos.map((photo) => ({
      entryId,
      blob: photo.blob,
      fileName: photo.fileName,
      mimeType: photo.mimeType,
      createdAt: now,
    }))
    if (newPhotos.length) await db.photos.bulkAdd(newPhotos)
    return entryId
  })
}

export async function deleteEntry(entryId) {
  return db.transaction('rw', db.entries, db.photos, async () => {
    await db.photos.where('entryId').equals(entryId).delete()
    await db.entries.delete(entryId)
  })
}