import React, { useState } from 'react';
import { X } from 'lucide-react';
interface Props { open: boolean; suggestedName: string; onClose: () => void; onSave: (name: string) => void }
export const SaveScenarioModal: React.FC<Props> = ({ open, suggestedName, onClose, onSave }) => {
  const [name, setName] = useState(suggestedName);
  React.useEffect(() => setName(suggestedName), [suggestedName, open]);
  if (!open) return null;
  return <div className="modal modal-open"><div className="modal-box"><button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" onClick={onClose}><X size={17}/></button><h3 className="font-semibold text-lg">Save scenario</h3><p className="text-sm text-base-content/60 pb-4">Give this layout and simulation run a recognizable name.</p><input autoFocus className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}/><div className="modal-action"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Save scenario</button></div></div><button className="modal-backdrop" onClick={onClose}>close</button></div>;
};
