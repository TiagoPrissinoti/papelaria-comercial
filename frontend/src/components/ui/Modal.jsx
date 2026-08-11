export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;

  function handleOverlayPointerDown(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onPointerDown={handleOverlayPointerDown}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}
