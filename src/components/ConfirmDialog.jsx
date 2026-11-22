import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ title, message, confirmLabel = '삭제하기', onConfirm, onClose, destructive = true }) {
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <button className="icon-button dialog-close" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        <span className={`dialog-symbol ${destructive ? 'is-danger' : ''}`}><AlertTriangle size={21} /></span>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="button button-quiet" onClick={onClose}>취소</button>
          <button className={`button ${destructive ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}