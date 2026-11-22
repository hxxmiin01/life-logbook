import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownWideNarrow, ArrowUpWideNarrow, BookOpen, CalendarDays, Camera,
  Check, ChevronLeft, ChevronRight, CircleAlert, Clock3, Download, FileUp,
  Heart, Image as ImageIcon, Images, LayoutDashboard, LoaderCircle, LockKeyhole,
  NotebookPen, Plus, Search, Sparkles, Tag, Trash2, X,
} from 'lucide-react'
import { db, deleteEntry } from './db/database.js'
import EntryEditor from './components/EntryEditor.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import PhotoImage from './components/PhotoImage.jsx'
import { entryYear, formatDate, moodFor, sortEntries, todayString } from './utils/format.js'
import { exportBackup, restoreBackup } from './utils/backup.js'

const NAV_ITEMS = [
  { id: 'home', label: '홈', icon: LayoutDashboard },
  { id: 'timeline', label: '나의 타임라인', icon: BookOpen },
  { id: 'gallery', label: '사진 갤러리', icon: Images },
]

function EntryCard({ entry, photos = [], onOpen, compact = false }) {
  const cover = photos[0]
  const mood = moodFor(entry.mood)
  return (
    <button className={`entry-card ${compact ? 'entry-card-compact' : ''} ${cover ? 'has-cover' : 'no-cover'}`} onClick={() => onOpen(entry)}>
      {cover && <div className="entry-cover"><PhotoImage blob={cover.blob} alt={cover.fileName} /></div>}
      <div className="entry-card-copy">
        <div className="entry-card-meta"><span>{formatDate(entry.date, 'M월 d일 · EEEE')}</span>{mood && <span className="mood-inline">{mood.emoji} {mood.label}</span>}</div>
        <h3>{entry.title}</h3>
        {entry.content && <p className="entry-excerpt">{entry.content}</p>}
        {entry.tags?.length > 0 && <div className="tag-list card-tags">{entry.tags.slice(0, 3).map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}{entry.tags.length > 3 && <span className="tag-chip">+{entry.tags.length - 3}</span>}</div>}
      </div>
      {!compact && <ChevronRight className="entry-chevron" size={17} />}
    </button>
  )
}

function EmptyState({ icon: Icon = NotebookPen, title, copy, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} strokeWidth={1.5} /></span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  )
}

function Header({ page, onCreate, onExport }) {
  const titles = { home: '오늘의 기록장', timeline: '나의 타임라인', gallery: '사진 갤러리' }
  return (
    <header className="page-header">
      <div><p className="eyebrow">LIFE, IN YOUR OWN WORDS</p><h1>{titles[page]}</h1></div>
      <div className="header-actions">
        <button className="button button-quiet header-export" onClick={onExport} title="백업 파일 내려받기"><Download size={16} /><span>백업</span></button>
        <button className="button button-primary" onClick={onCreate}><Plus size={17} /><span>새 기록</span></button>
      </div>
    </header>
  )
}

function Dashboard({ entries, photos, onCreate, onOpen, onNavigate }) {
  const recent = sortEntries(entries).slice(0, 3)
  const photoCount = photos.length
  const cover = recent.map((entry) => photos.find((photo) => photo.entryId === entry.id)).find(Boolean)

  return (
    <>
      <section className="welcome-panel">
        <div className="welcome-copy">
          <p className="welcome-date"><CalendarDays size={15} /> {formatDate(todayString(), 'yyyy년 M월 d일 EEEE')}</p>
          <h2>오늘의 하루를<br /><em>기록해 보세요.</em></h2>
          <p className="welcome-subtitle">사소한 순간도, 시간이 지나면<br className="desktop-break" /> 당신만의 이야기가 됩니다.</p>
          <button className="button button-dark" onClick={onCreate}><NotebookPen size={16} /> 오늘의 페이지 쓰기</button>
        </div>
        <div className={`welcome-art ${cover ? 'has-photo' : ''}`}>
          {cover ? <PhotoImage blob={cover.blob} alt="최근 기록에 담긴 순간" /> : <>
            <div className="art-stamp"><span>VOL.</span><strong>{String(entries.length + 1).padStart(2, '0')}</strong></div>
            <div className="art-scribble">a life<br />well kept</div>
            <div className="art-rule" />
            <span className="art-caption">YOUR PERSONAL ARCHIVE</span>
          </>}
          <span className="art-index">{cover ? 'RECENT MEMORY' : 'EST. TODAY'}</span>
        </div>
      </section>

      <section className="stats-row" aria-label="기록 통계">
        <div className="stat-item"><span className="stat-icon"><BookOpen size={17} /></span><div><strong>{entries.length}</strong><span>모아둔 하루</span></div></div>
        <div className="stat-item"><span className="stat-icon"><Camera size={17} /></span><div><strong>{photoCount}</strong><span>간직한 사진</span></div></div>
        <div className="stat-item stat-note"><span className="stat-icon"><Heart size={17} /></span><div><strong>{entries.length ? '나만의 속도로' : '첫 페이지를'}</strong><span>{entries.length ? '천천히 쌓아가는 중' : '기다리고 있어요'}</span></div></div>
      </section>

      <section className="recent-section">
        <div className="section-heading"><div><p className="eyebrow">LITTLE BY LITTLE</p><h2>최근에 남긴 순간</h2></div>{entries.length > 0 && <button className="text-button" onClick={() => onNavigate('timeline')}>모두 보기 <ChevronRight size={15} /></button>}</div>
        {recent.length > 0 ? <div className="recent-list">{recent.map((entry) => <EntryCard key={entry.id} entry={entry} photos={photos.filter((photo) => photo.entryId === entry.id)} onOpen={onOpen} compact />)}</div> : <EmptyState title="아직 기록이 없어요." copy="오늘의 첫 번째 순간을 남겨보세요." icon={Sparkles} action={<button className="button button-outline" onClick={onCreate}><Plus size={16} /> 첫 기록 쓰기</button>} />}
      </section>
    </>
  )
}

function Timeline({ entries, photos, onOpen }) {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [tag, setTag] = useState('all')
  const [direction, setDirection] = useState('desc')
  const years = [...new Set(entries.map(entryYear).filter(Boolean))].sort().reverse()
  const tags = [...new Set(entries.flatMap((entry) => entry.tags || []))].sort((a, b) => a.localeCompare(b, 'ko'))
  const filtered = sortEntries(entries.filter((entry) => {
    const needle = query.trim().toLocaleLowerCase('ko')
    const matchesQuery = !needle || [entry.title, entry.content, ...(entry.tags || [])].some((value) => value?.toLocaleLowerCase('ko').includes(needle))
    return matchesQuery && (year === 'all' || entryYear(entry) === year) && (tag === 'all' || entry.tags?.includes(tag))
  }), direction)
  const groups = filtered.reduce((result, entry) => {
    const key = entryYear(entry) || '날짜 없음'
    result[key] ||= []
    result[key].push(entry)
    return result
  }, {})

  return (
    <>
      <section className="page-intro"><p>기억은 쌓이고, 이야기는 이어집니다.</p><span>{entries.length}개의 페이지</span></section>
      <div className="filter-bar">
        <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="기록과 태그 검색" aria-label="기록 검색" />{query && <button className="bare-icon" onClick={() => setQuery('')} aria-label="검색 지우기"><X size={15} /></button>}</label>
        <div className="filter-controls">
          <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="연도 필터"><option value="all">모든 연도</option>{years.map((item) => <option key={item} value={item}>{item}년</option>)}</select>
          <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="태그 필터"><option value="all">모든 태그</option>{tags.map((item) => <option key={item} value={item}>#{item}</option>)}</select>
          <button className="sort-button" onClick={() => setDirection((current) => current === 'desc' ? 'asc' : 'desc')} title={direction === 'desc' ? '오래된 순으로 보기' : '최신 순으로 보기'}>{direction === 'desc' ? <ArrowDownWideNarrow size={16} /> : <ArrowUpWideNarrow size={16} />}<span>{direction === 'desc' ? '최신순' : '오래된순'}</span></button>
        </div>
      </div>
      {filtered.length ? <div className="timeline-groups">{Object.entries(groups).map(([groupYear, yearEntries]) => <section className="year-group" key={groupYear}><h2 className="year-heading"><span>{groupYear}</span><i />{yearEntries.length}개의 기록</h2><div className="timeline-list">{yearEntries.map((entry) => <EntryCard key={entry.id} entry={entry} photos={photos.filter((photo) => photo.entryId === entry.id)} onOpen={onOpen} />)}</div></section>)}</div> : <EmptyState title={entries.length ? '검색 결과가 없어요.' : '아직 쌓인 페이지가 없어요.'} copy={entries.length ? '다른 단어나 필터로 다시 찾아보세요.' : '첫 기록이 이곳에서 시간의 순서로 이어집니다.'} icon={Search} />}
    </>
  )
}

function Gallery({ entries, photos, onOpenEntry, onViewPhoto }) {
  const [year, setYear] = useState('all')
  const years = [...new Set(entries.map(entryYear).filter(Boolean))].sort().reverse()
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]))
  const filtered = photos.filter((photo) => year === 'all' || entryYear(entryMap.get(photo.entryId) || {}) === year)
  return (
    <>
      <section className="page-intro"><p>사진 한 장에 머물러 있는 시간들.</p><span>{filtered.length}장의 사진</span></section>
      <div className="gallery-toolbar"><span><Images size={16} /> 기록 속 사진을 모았어요</span><select value={year} onChange={(event) => setYear(event.target.value)} aria-label="갤러리 연도 필터"><option value="all">모든 연도</option>{years.map((item) => <option key={item} value={item}>{item}년</option>)}</select></div>
      {filtered.length ? <div className="photo-grid">{filtered.map((photo) => {
        const entry = entryMap.get(photo.entryId)
        return <button className="gallery-photo" key={photo.id} onClick={() => onViewPhoto(photo, entry)}><PhotoImage blob={photo.blob} alt={photo.fileName} /><span className="gallery-photo-caption"><strong>{entry?.title || '제목 없는 기록'}</strong><small>{entry ? formatDate(entry.date, 'yyyy. M. d.') : ''}</small></span></button>
      })}</div> : <EmptyState icon={ImageIcon} title={entries.length ? '이 연도에는 사진이 없어요.' : '아직 사진이 없어요.'} copy="기록에 사진을 더하면 이곳에 모여요." />}
      {filtered.length > 0 && <div className="gallery-hidden-links" aria-label="사진이 연결된 기록">{filtered.map((photo) => { const entry = entryMap.get(photo.entryId); return entry && <button key={`entry-${photo.id}`} onClick={() => onOpenEntry(entry)}>{entry.title}</button> })}</div>}
    </>
  )
}

function DetailDialog({ entry, photos, onClose, onEdit, onDelete, onViewPhoto }) {
  const mood = moodFor(entry.mood)
  return (
    <div className="overlay detail-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="detail-header"><span className="eyebrow">A PAGE FROM YOUR LIFE</span><div className="detail-actions"><button className="icon-button" aria-label="기록 수정" title="수정" onClick={onEdit}><NotebookPen size={17} /></button><button className="icon-button danger-hover" aria-label="기록 삭제" title="삭제" onClick={onDelete}><Trash2 size={17} /></button><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={19} /></button></div></header>
        <p className="detail-date">{formatDate(entry.date)}</p><h2 id="detail-title">{entry.title}</h2>
        {mood && <p className="detail-mood"><span>{mood.emoji}</span> 오늘은 {mood.label} 기분</p>}
        {entry.content && <p className="detail-content">{entry.content}</p>}
        {entry.tags?.length > 0 && <div className="tag-list detail-tags">{entry.tags.map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}</div>}
        {photos.length > 0 && <div className="detail-photos">{photos.map((photo) => <button key={photo.id} onClick={() => onViewPhoto(photo)}><PhotoImage blob={photo.blob} alt={photo.fileName} /></button>)}</div>}
        <footer className="detail-footer"><span>이 기기에 저장됨</span><span>마지막 수정 {formatDate(entry.updatedAt || entry.createdAt, 'yyyy. M. d.')}</span></footer>
      </article>
    </div>
  )
}

function PhotoViewer({ photo, entry, onClose, onOpenEntry, onPrevious, onNext, hasPrevious, hasNext }) {
  return (
    <div className="overlay viewer-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="사진 크게 보기">
        <button className="icon-button viewer-close" aria-label="닫기" onClick={onClose}><X size={21} /></button>
        {hasPrevious && <button className="icon-button viewer-arrow viewer-prev" aria-label="이전 사진" onClick={onPrevious}><ChevronLeft size={24} /></button>}
        <PhotoImage blob={photo.blob} alt={photo.fileName} />
        {hasNext && <button className="icon-button viewer-arrow viewer-next" aria-label="다음 사진" onClick={onNext}><ChevronRight size={24} /></button>}
        <div className="viewer-caption"><span>{entry ? `${formatDate(entry.date, 'yyyy년 M월 d일')} · ${entry.title}` : photo.fileName}</span>{entry && <button className="text-button" onClick={onOpenEntry}>원본 기록 보기 <ChevronRight size={14} /></button>}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('home')
  const [entries, setEntries] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState(false)
  const [editor, setEditor] = useState(null)
  const [editorPhotos, setEditorPhotos] = useState([])
  const [detail, setDetail] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [toast, setToast] = useState(null)
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const restoreInput = useRef(null)
  const toastTimer = useRef(null)

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3600)
  }, [])

  const refresh = useCallback(async () => {
    setStorageError(false)
    try {
      const [nextEntries, nextPhotos] = await Promise.all([
        db.entries.orderBy('date').reverse().toArray(),
        db.photos.toArray(),
      ])
      setEntries(nextEntries)
      setPhotos(nextPhotos)
    } catch {
      setStorageError(true)
      notify('브라우저 저장소를 읽지 못했어요. 사이트 저장 권한을 확인해 주세요.', 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('life-logbook-theme') || 'paper'
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setViewer(null)
        setConfirm(null)
        setEditor(null)
        setDetail(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const photoCounts = useMemo(() => {
    const counts = new Map()
    photos.forEach((photo) => counts.set(photo.entryId, (counts.get(photo.entryId) || 0) + 1))
    return counts
  }, [photos])

  function openEditor(entry = null, entryPhotos = []) {
    setEditorPhotos(entryPhotos)
    setEditor(entry || {})
    setDetail(null)
  }

  function openDetail(entry) {
    setDetail({ entry, photos: photos.filter((photo) => photo.entryId === entry.id) })
  }

  async function handleSaved() {
    setEditor(null)
    await refresh()
  }

  async function handleDelete() {
    if (!detail?.entry) return
    try {
      await deleteEntry(detail.entry.id)
      setConfirm(null)
      setDetail(null)
      await refresh()
      notify('기록과 연결된 사진을 모두 삭제했어요.')
    } catch {
      notify('기록을 삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.', 'error')
    }
  }

  async function handleExport() {
    try {
      await exportBackup()
      notify('기록과 사진을 백업 파일로 내보냈어요.')
    } catch {
      notify('백업 파일을 만들지 못했어요. 저장 공간을 확인해 주세요.', 'error')
    }
  }

  async function handleRestore() {
    if (!restoreFile) return
    setRestoring(true)
    try {
      await restoreBackup(restoreFile)
      setConfirm(null)
      setRestoreFile(null)
      await refresh()
      notify('백업의 기록과 사진을 복원했어요.')
    } catch (error) {
      notify(error.message || '백업 파일을 복원하지 못했어요.', 'error')
    } finally {
      setRestoring(false)
    }
  }

  function openViewer(photo, entry, collection = photos) {
    const index = collection.findIndex((item) => item.id === photo.id)
    setViewer({ photo, entry, collection, index: Math.max(index, 0) })
  }

  function moveViewer(delta) {
    if (!viewer) return
    const index = viewer.index + delta
    const photo = viewer.collection[index]
    if (!photo) return
    const entry = entries.find((item) => item.id === photo.entryId)
    setViewer((current) => ({ ...current, photo, entry, index }))
  }

  const currentPage = NAV_ITEMS.find((item) => item.id === page)

  return (
    <div className="app-shell min-h-screen">
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => setPage('home')} aria-label="LIFE LOGBOOK 홈으로">
          <span className="brand-mark"><BookOpen size={19} strokeWidth={1.7} /></span>
          <span className="brand-name">LIFE<br />LOGBOOK</span>
        </button>
        <p className="brand-caption">Every day is a page<br />of your life.</p>
        <nav className="side-nav" aria-label="주요 메뉴">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'is-active' : ''}`} onClick={() => setPage(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'timeline' && entries.length > 0 && <small>{entries.length}</small>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-count"><span>모아둔 기록</span><strong>{String(entries.length).padStart(2, '0')} <small>페이지</small></strong></div>
          <div className="local-note"><LockKeyhole size={15} /><div><strong>This device only</strong><span>기록은 이 기기에만 저장돼요.</span></div></div>
          <button className="sidebar-restore" onClick={() => restoreInput.current?.click()}><FileUp size={15} /> 백업에서 복원</button>
          <input ref={restoreInput} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { setRestoreFile(file); setConfirm('restore') } event.target.value = '' }} />
          <p className="storage-caveat">브라우저 데이터를 삭제하면 기록도 사라질 수 있어요. 정기적으로 백업해 주세요.</p>
        </div>
      </aside>

      <main className="main-area">
        <div className="mobile-topbar"><button className="mobile-brand" onClick={() => setPage('home')}><BookOpen size={18} /> LIFE LOGBOOK</button><button className="icon-button" aria-label="새 기록" onClick={() => openEditor()}><Plus size={20} /></button></div>
        <div className="content-wrap">
          <Header page={page} onCreate={() => openEditor()} onExport={handleExport} />
          {storageError && <div className="storage-error"><CircleAlert size={17} /> 저장소를 열 수 없어요. 브라우저의 사이트 데이터 권한을 확인해 주세요.</div>}
          {loading ? <div className="loading-state"><LoaderCircle className="spin" size={23} /><span>기록장을 펼치는 중...</span></div> : page === 'home' ? <Dashboard entries={entries} photos={photos} onCreate={() => openEditor()} onOpen={openDetail} onNavigate={setPage} /> : page === 'timeline' ? <Timeline entries={entries} photos={photos} onOpen={openDetail} /> : <Gallery entries={entries} photos={photos} onOpenEntry={openDetail} onViewPhoto={(photo, entry) => openViewer(photo, entry)} />}
          <footer className="page-footer"><span>MADE OF YOUR DAYS</span><span>{currentPage?.label} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span></footer>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="모바일 메뉴">{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'is-active' : ''} onClick={() => setPage(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>

      {editor && <EntryEditor entry={editor.id ? editor : null} photos={editorPhotos} onClose={() => setEditor(null)} onSaved={handleSaved} notify={notify} />}
      {detail && <DetailDialog entry={detail.entry} photos={detail.photos} onClose={() => setDetail(null)} onEdit={() => openEditor(detail.entry, detail.photos)} onDelete={() => setConfirm('delete')} onViewPhoto={(photo) => openViewer(photo, detail.entry, detail.photos)} />}
      {confirm === 'delete' && <ConfirmDialog title="이 기록을 삭제할까요?" message="기록과 함께 첨부한 사진도 모두 삭제돼요. 이 작업은 되돌릴 수 없어요." onClose={() => setConfirm(null)} onConfirm={handleDelete} />}
      {confirm === 'restore' && <ConfirmDialog title="백업을 복원할까요?" message={`${restoreFile?.name || '선택한 백업'}의 내용으로 현재 기록과 사진을 모두 바꿉니다. 복원 전 현재 기록을 백업해 두세요.`} confirmLabel={restoring ? '복원 중...' : '복원하고 덮어쓰기'} onClose={() => { setConfirm(null); setRestoreFile(null) }} onConfirm={handleRestore} destructive={false} />}
      {viewer && <PhotoViewer photo={viewer.photo} entry={viewer.entry} onClose={() => setViewer(null)} onPrevious={() => moveViewer(-1)} onNext={() => moveViewer(1)} hasPrevious={viewer.index > 0} hasNext={viewer.index < viewer.collection.length - 1} onOpenEntry={() => { const entry = viewer.entry; setViewer(null); if (entry) openDetail(entry) }} />}
      {toast && <div className={`toast toast-${toast.type}`} role="status"><span>{toast.type === 'error' ? <CircleAlert size={17} /> : <Check size={17} />}</span>{toast.message}<button className="bare-icon" onClick={() => setToast(null)} aria-label="알림 닫기"><X size={15} /></button></div>}
    </div>
  )
}