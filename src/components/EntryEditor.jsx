import { useEffect, useState } from 'react'
import { CalendarDays, Check, ImagePlus, LoaderCircle, Plus, Tag, Trash2, X } from 'lucide-react'
import { db, saveEntry } from '../db/database.js'
import { todayString } from '../utils/format.js'
import { prepareImage } from '../utils/images.js'
import MoodSelector from './MoodSelector.jsx'
import PhotoImage from './PhotoImage.jsx'

const DRAFT_ID = 'active'

export default function EntryEditor({ entry, photos = [], onClose, onSaved, notify }) {
  const [form, setForm] = useState({ date: todayString(), title: '', content: '', mood: '', tags: [] })
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newPhotos, setNewPhotos] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const draft = await db.drafts.get(DRAFT_ID)
        if (!active) return
        if (draft && draft.entryId === (entry?.id ?? null)) {
          setForm(draft.form)
          setExistingPhotos(draft.existingPhotos || [])
          setNewPhotos(draft.newPhotos || [])
        } else {
          setForm(entry ? {
            date: entry.date,
            title: entry.title,
            content: entry.content,
            mood: entry.mood || '',
            tags: entry.tags || [],
          } : { date: todayString(), title: '', content: '', mood: '', tags: [] })
          setExistingPhotos(photos)
          setNewPhotos([])
        }
      } catch {
        notify('임시 저장 내용을 불러오지 못했어요.', 'error')
      } finally {
        if (active) setLoadingDraft(false)
      }
    }
    initialize()
    return () => { active = false }
  }, [entry, photos, notify])

  useEffect(() => {
    if (loadingDraft) return undefined
    const timeout = window.setTimeout(() => {
      db.drafts.put({
        id: DRAFT_ID,
        entryId: entry?.id ?? null,
        form,
        existingPhotos,
        newPhotos,
        updatedAt: new Date().toISOString(),
      }).catch(() => notify('임시 저장에 실패했어요. 저장 버튼을 눌러 기록을 보관해 주세요.', 'error'))
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [entry?.id, existingPhotos, form, loadingDraft, newPhotos, notify])

  async function addFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    try {
      const prepared = []
      for (const file of files) prepared.push(await prepareImage(file))
      setNewPhotos((current) => [...current, ...prepared])
    } catch (error) {
      notify(error.message || '사진을 불러오지 못했어요.', 'error')
    }
  }

  function addTag(event) {
    event.preventDefault()
    const value = tagInput.trim().replace(/^#/, '')
    if (value && !form.tags.includes(value)) setForm((current) => ({ ...current, tags: [...current.tags, value] }))
    setTagInput('')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!form.title.trim()) {
      notify('기록의 제목을 적어주세요.', 'error')
      return
    }
    setSaving(true)
    try {
      const id = await saveEntry(
        { ...form, id: entry?.id },
        newPhotos,
        existingPhotos.map((photo) => photo.id),
      )
      await db.drafts.delete(DRAFT_ID)
      notify(entry ? '기록을 수정했어요.' : '오늘의 기록을 저장했어요.', 'success')
      onSaved(id)
    } catch {
      notify('저장 공간이 부족하거나 브라우저 저장이 차단됐어요. 사진 용량을 줄인 뒤 다시 시도해 주세요.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay editor-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor-header">
          <div>
            <p className="eyebrow">A PAGE OF YOUR LIFE</p>
            <h2 id="editor-title">{entry ? '기록을 다듬어요' : '오늘을 한 페이지에'}</h2>
          </div>
          <button className="icon-button" aria-label="작성 닫기" onClick={onClose}><X size={20} /></button>
        </header>
        {loadingDraft ? <div className="editor-loading"><LoaderCircle className="spin" size={22} /> 작성 내용을 불러오는 중</div> : (
          <form className="editor-form" onSubmit={handleSave}>
            <label className="field-label" htmlFor="entry-date"><CalendarDays size={16} /> 날짜</label>
            <input id="entry-date" className="text-input date-input" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />

            <label className="field-label" htmlFor="entry-title">제목</label>
            <input id="entry-title" className="text-input title-input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="이 하루를 뭐라고 부를까요?" maxLength={100} required autoFocus />

            <label className="field-label" htmlFor="entry-content">오늘의 이야기</label>
            <textarea id="entry-content" className="text-input content-input" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="기억하고 싶은 장면과 마음을 천천히 적어보세요." rows={8} />

            <div className="form-section">
              <span className="field-label">오늘의 기분</span>
              <MoodSelector value={form.mood} onChange={(mood) => setForm((current) => ({ ...current, mood }))} />
            </div>

            <div className="form-section">
              <span className="field-label"><Tag size={15} /> 태그</span>
              <div className="tag-entry">
                <input className="text-input" value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="예: 여행, 가족, 작은 행복" maxLength={24} />
                <button className="icon-button tag-add" type="button" aria-label="태그 추가" onClick={addTag}><Plus size={18} /></button>
              </div>
              {form.tags.length > 0 && <div className="tag-list">{form.tags.map((tag) => <button key={tag} type="button" className="tag-chip removable" onClick={() => setForm((current) => ({ ...current, tags: current.tags.filter((item) => item !== tag) }))}>#{tag}<X size={12} /></button>)}</div>}
            </div>

            <div className="form-section">
              <span className="field-label">사진 <span className="field-hint">최대 12MB · JPG, PNG, WebP, GIF</span></span>
              <div className={`drop-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
                <input id="entry-photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
                <label className="upload-button" htmlFor="entry-photos"><ImagePlus size={18} /> 사진을 선택하거나 여기로 끌어놓으세요</label>
              </div>
              {(existingPhotos.length > 0 || newPhotos.length > 0) && <div className="editor-photo-grid">
                {existingPhotos.map((photo) => <div className="editor-photo" key={`old-${photo.id}`}><PhotoImage blob={photo.blob} alt={photo.fileName} /><button type="button" aria-label={`${photo.fileName} 삭제`} onClick={() => setExistingPhotos((current) => current.filter((item) => item.id !== photo.id))}><Trash2 size={15} /></button></div>)}
                {newPhotos.map((photo, index) => <div className="editor-photo" key={`new-${photo.fileName}-${index}`}><PhotoImage blob={photo.blob} alt={photo.fileName} /><button type="button" aria-label={`${photo.fileName} 삭제`} onClick={() => setNewPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}
              </div>}
            </div>
            <div className="editor-footer">
              <span className="draft-note"><Check size={14} /> 작성 내용은 이 기기에 임시 저장돼요</span>
              <div className="editor-actions"><button type="button" className="button button-quiet" onClick={onClose}>닫기</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{saving ? '저장 중' : '기록 저장'}</button></div>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}