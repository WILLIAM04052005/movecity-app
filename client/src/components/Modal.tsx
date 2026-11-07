import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  titre: string;
  children: ReactNode;
  onClose?: () => void;
}

/** Boîte de dialogue accessible : focus à l'ouverture, Échap pour fermer. */
export function Modal({ titre, children, onClose }: ModalProps) {
  const boite = useRef<HTMLDivElement>(null);
  const fermer = useRef(onClose);

  useEffect(() => {
    fermer.current = onClose;
  }, [onClose]);

  useEffect(() => {
    boite.current?.querySelector<HTMLElement>('button')?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer.current?.();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, []);

  return (
    <div className="modal-fond">
      <div ref={boite} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titre">
        <h2 id="modal-titre">{titre}</h2>
        {children}
      </div>
    </div>
  );
}
