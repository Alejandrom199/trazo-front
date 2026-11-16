import { faArrowUpRightFromSquare, faLinkSlash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { nodeName, readLinkedDiagramId, type DiagramNode } from '@/core/model';
import type { NodeKind } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { Field, inputClass } from '@/ui/explanation/formFields';
import { createLinkedDiagram, linkNodeToDiagram, unlinkNode } from './diagramLinkActions';
import { openSavedDiagram } from './projectActions';
import { useProjectDiagrams } from './useProjectDiagrams';

type DiagramLink = NonNullable<NodeKind['diagramLink']>;

const actionClass = 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium';

/**
 * Enlace de un nodo (p. ej. una acción de subproceso) con el diagrama del
 * proyecto que lo detalla. Al elegirlo, el nodo toma el nombre del diagrama.
 * Solo se ofrecen diagramas de los tipos que admite el artefacto.
 */
export function DiagramLinkField({ node, link }: { node: DiagramNode; link: DiagramLink }) {
  const project = useProjectStore((state) => state.project);
  const currentId = useDiagramStore((state) => state.diagram?.id);
  const diagrams = useProjectDiagrams();

  if (!project) {
    return (
      <Field label={link.caption} hint="Crea un proyecto (Archivo › Proyecto) para enlazar el subproceso con otro diagrama.">
        <p className="text-xs text-ink-400">Sin proyecto abierto.</p>
      </Field>
    );
  }

  const linkedId = readLinkedDiagramId(node);
  const candidates = diagrams.filter((diagram) => diagram.id !== currentId && link.diagramTypes.includes(diagram.diagramType));
  const linked = candidates.find((diagram) => diagram.id === linkedId);
  const renamed = linked && linked.name.trim() !== nodeName(node, '').trim();

  function choose(diagramId: string) {
    const diagram = candidates.find((candidate) => candidate.id === diagramId);
    if (diagram) linkNodeToDiagram(node.id, diagram);
    else unlinkNode(node.id);
  }

  return (
    <Field
      label={link.caption}
      hint={linkedId && !linked ? 'El diagrama enlazado ya no está en el proyecto: elige otro o crea uno nuevo.' : 'Al elegirlo, el paso toma el nombre del diagrama.'}
    >
      <select value={linked ? linked.id : ''} onChange={(event) => choose(event.target.value)} className={inputClass}>
        <option value="">Sin enlazar</option>
        {candidates.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.name}</option>)}
      </select>
      <div className="mt-2 flex flex-wrap gap-2">
        {linked ? (
          <>
            <button type="button" onClick={() => openSavedDiagram(linked.id)} className={`${actionClass} bg-accent-soft text-accent hover:bg-accent hover:text-white`}>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" /> Abrir subproceso
            </button>
            {renamed && (
              <button type="button" onClick={() => linkNodeToDiagram(node.id, linked)} title={`El diagrama se llama «${linked.name}»`} className={`${actionClass} text-ink-600 hover:bg-raised hover:text-ink-900`}>
                Usar el nombre «{linked.name}»
              </button>
            )}
            <button type="button" onClick={() => unlinkNode(node.id)} className={`${actionClass} text-ink-400 hover:bg-raised hover:text-ink-900`}>
              <FontAwesomeIcon icon={faLinkSlash} className="text-[10px]" /> Desvincular
            </button>
          </>
        ) : (
          <button type="button" onClick={() => createLinkedDiagram(node.id, nodeName(node, 'Subproceso'), link.diagramTypes[0]!, true)} className={`${actionClass} bg-accent-soft text-accent hover:bg-accent hover:text-white`}>
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Crear «{nodeName(node, 'Subproceso')}»
          </button>
        )}
      </div>
    </Field>
  );
}
