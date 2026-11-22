import React from 'react'

const MAX_FILE_SIZE = 12 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function prepareImage(file) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('JPG, PNG, WebP, GIF 이미지 파일만 추가할 수 있어요.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('사진 한 장은 12MB 이하로 선택해 주세요.')
  }
  if (file.type === 'image/gif') {
    return { blob: file, fileName: file.name, mimeType: file.type }
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 처리할 수 없어요.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
    if (!blob) throw new Error('이미지를 압축할 수 없어요.')
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return { blob, fileName: `${baseName}.webp`, mimeType: blob.type }
  } catch (error) {
    if (file.size <= MAX_FILE_SIZE) return { blob: file, fileName: file.name, mimeType: file.type }
    throw error
  }
}

export function useObjectUrl(blob) {
  const [url, setUrl] = React.useState('')

  React.useEffect(() => {
    if (!blob) {
      setUrl('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}