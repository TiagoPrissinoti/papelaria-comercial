export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}
