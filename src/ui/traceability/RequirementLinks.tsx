import { faBullseye, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState } from 'react';
import type { DiagramProject } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { useUiStore } from '@/ui/uiStore';

const selectClass = 'min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent';

/**
 * Requisitos que cumple un elemento (o el diagrama completo, con `elementId`
 * null), desde el inspector: verlos, abrirlos en la pantalla de requisitos,
 * quitarlos y vincular otro, existente o nuevo, sin salir del diagrama.
 */
export function RequirementLinks({ project, diagramId, elementId, title }: { project: DiagramProject; diagramId: string; elementId: string | null; title: string }) {
  const [chosen, setChosen] = useState('');
  const links = useMemo(
    () => project.requirementLinks.filter((link) => link.diagramId === diagramId && link.elementId === elementId),
    [project.requirementLinks, diagramId, elementId],
  );
  const linkedIds = new Set(links.map((link) => link.requirementId));
  const available = project.requirements.filter((requirement) => !linkedIds.has(requirement.id) && requirement.status !== 'descartado');
  const store = () => useProjectStore.getState();
  const openRequirement = (id: string) => useUiStore.getState().setRequirementsOpen(true, id);

  function link() {
    if (chosen === 'new') {
      const id = store().addRequirement('funcional');
      if (id) {
        store().linkRequirement(id, diagramId, elementId);
        openRequirement(id);
      }
    } else if (chosen) {
      store().linkRequirement(chosen, diagramId, elementId);
    }
    setChosen('');
  }

  return (
    <section className="border-t border-line p-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-ink-900">
        <FontAwesomeIcon icon={faBullseye} className="text-[11px] text-accent" /> {title}
      </h3>
      {links.length === 0 ? (
        <p className="mt-2 text-xs text-ink-400">No cumple ningún requisito todavía.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {links.map((item) => {
            const requirement = project.requirements.find((candidate) => candidate.id === item.requirementId);
            if (!requirement) return null;
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                <button type="button" onClick={() => openRequirement(requirement.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">{requirement.code}</span>
                  <span className="truncate text-sm text-ink-900 hover:text-accent">{requirement.title}</span>
                </button>
                <button type="button" onClick={() => store().unlinkRequirement(item.id)} aria-label={`Quitar ${requirement.code}`} className="flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
                  <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <select aria-label="Requisito para vincular" value={chosen} onChange={(event) => setChosen(event.target.value)} className={selectClass}>
          <option value="">Vincular un requisito…</option>
          {available.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.code} · {requirement.title}</option>)}
          <option value="new">+ Nuevo requisito funcional</option>
        </select>
        <button type="button" disabled={!chosen} onClick={link} aria-label="Vincular" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-40">
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>
    </section>
  );
}
