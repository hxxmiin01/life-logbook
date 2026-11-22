import { useObjectUrl } from '../utils/images.js'

export default function PhotoImage({ blob, alt = '', className = '' }) {
  const src = useObjectUrl(blob)
  return src ? <img src={src} alt={alt} className={className} loading="lazy" /> : null
}