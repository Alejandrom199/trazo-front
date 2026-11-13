import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState, type ReactNode } from 'react';
import { nodeName, type ArtifactDefinition, type Diagram, type DiagramEdge, type DiagramNode } from '@/core/model';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { Panel } from '@/ui/layout/Panel';
import { useUiStore } from '@/ui/uiStore';
import { ArtifactExplanation } from './ArtifactExplanation';
import { resolveExplanationTarget, targetKey, type ExplanationTarget } from './explanationTarget';

/**
 * Panel derecho. Muestra la ficha del elemento seleccionado y permite navegar
 * a los artefactos relacionados (con "volver").
 *
 * No se abre solo: al seleccionar algo aparece el botón "Ver explicación".
 * (Para aprender un diagrama completo está la página Aprender.)
 */
export function ExplanationPanel({ embedded = false, alwaysOpen = false }: { embedded?: boolean; alwaysOpen?: boolean }) {
  const module = useActiveModule();
  const pinnedExplanation = useUiStore((state) => state.pinnedExplanation);
  const setPinnedExplanation = useUiStore((state) => state.setPinnedExplanation);
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);

  const target = useMemo(() => resolveExplanationTarget(diagram, selection), [diagram, selection]);
  const key = targetKey(target);

  // Ambos estados recuerdan para qué selección se crearon: al seleccionar otra cosa
  // quedan obsoletos solos, sin necesidad de un efecto que los limpie.
  const [trail, setTrail] = useState<{ key: string; types: string[] }>({ key, types: [] });
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  const definitionsByType = useMemo(
    () => new Map((module?.artifacts ?? []).map((artifact) => [artifact.type, artifact])),
    [module],
  );

  if (!module || !diagram) return null;

  const browsed = trail.key === key ? trail.types : [];
  const isOpen = alwaysOpen || openedFor === key;

  if (!isOpen) {
    if (target.kind === 'none') return null;
    return (
      <button
        type="button"
        onClick={() => setOpenedFor(key)}
        className="rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-medium text-ink-600 shadow-panel hover:text-accent"
      >
        Ver explicación
      </button>
    );
  }

  const openRelated = (type: string) => setTrail({ key, types: [...browsed, type] });
  const goBack = () => setTrail({ key, types: browsed.slice(0, -1) });
  const browsedType = browsed.at(-1);
  const browsedDefinition = browsedType ? definitionsByType.get(browsedType) : undefined;

  const content = (
    <>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        {browsed.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className="-ml-1.5 flex size-11 items-center justify-center rounded-md text-ink-400 hover:bg-canvas hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Explicación</h2>
        {!embedded && (
          <button
            type="button"
            onClick={() => setOpenedFor(null)}
            aria-label="Cerrar explicación"
            className="ml-auto flex size-11 items-center justify-center rounded-md text-ink-400 hover:bg-canvas hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        )}
      </header>

      {/* La key reinicia el scroll al cambiar de ficha: cada explicación empieza por arriba. */}
      <div key={`${key}/${browsed.join('/')}`} className="flex-1 overflow-y-auto">
        {browsedDefinition ? (
          <ArtifactExplanation
            key={browsedDefinition.type}
            definition={browsedDefinition}
            definitionsByType={definitionsByType}
            onOpenRelated={openRelated}
          />
        ) : pinnedExplanation && target.kind === 'none' && definitionsByType.get(pinnedExplanation) ? (
          <ArtifactExplanation
            key={pinnedExplanation}
            definition={definitionsByType.get(pinnedExplanation)!}
            definitionsByType={definitionsByType}
            onOpenRelated={(type) => {
              setPinnedExplanation(null);
              openRelated(type);
            }}
          />
        ) : (
          <TargetExplanation
            target={target}
            diagram={diagram}
            definitionsByType={definitionsByType}
            onOpenRelated={openRelated}
          />
        )}
      </div>
    </>
  );
  if (embedded) return <div className="flex h-full w-full flex-col overflow-hidden">{content}</div>;
  return <Panel className="flex max-h-full w-full flex-col overflow-hidden md:w-80">{content}</Panel>;
}

interface TargetExplanationProps {
  target: ExplanationTarget;
  diagram: Diagram;
  definitionsByType: Map<string, ArtifactDefinition>;
  onOpenRelated: (artifactType: string) => void;
}

function TargetExplanation({ target, diagram, definitionsByType, onOpenRelated }: TargetExplanationProps) {
  if (target.kind === 'none') {
    return (
      <p className="p-4 text-sm leading-relaxed text-ink-600">
        Selecciona un elemento del lienzo para ver su ficha. Desde la paleta puedes abrir una vista rápida y, si quieres el detalle, la misma ficha.
      </p>
    );
  }
  if (target.kind === 'multiple') {
    return (
      <p className="p-4 text-sm leading-relaxed text-ink-600">
        Hay {target.count} elementos seleccionados. Selecciona solo uno para ver su explicación.
      </p>
    );
  }

  const element = target.kind === 'node' ? target.node : target.edge;
  const definition = definitionsByType.get(element.artifactType);
  if (!definition) return null;

  return (
    <ArtifactExplanation
      key={element.id}
      definition={definition}
      definitionsByType={definitionsByType}
      onOpenRelated={onOpenRelated}
      instance={
        target.kind === 'node' ? (
          <NodeInstance node={target.node} diagram={diagram} />
        ) : (
          <EdgeInstance edge={target.edge} diagram={diagram} />
        )
      }
    />
  );
}

/** Recuadro "En tu diagrama": conecta la teoría con el elemento concreto. */
function InstanceBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">En tu diagrama</p>
      <div className="text-ink-900">{children}</div>
    </div>
  );
}

function NodeInstance({ node, diagram }: { node: DiagramNode; diagram: Diagram }) {
  const incoming = diagram.edges.filter((edge) => edge.targetId === node.id).length;
  const outgoing = diagram.edges.filter((edge) => edge.sourceId === node.id).length;
  const parent = node.parentId ? diagram.nodes.find((candidate) => candidate.id === node.parentId) : undefined;

  return (
    <InstanceBox>
      {node.label && <p className="font-medium">«{node.label}»</p>}
      <p className="text-xs text-ink-600">
        {plural(incoming, 'conexión de entrada', 'conexiones de entrada')} y {plural(outgoing, 'de salida', 'de salida')}.
        {parent && <span className="block">Está en el carril «{parent.label}».</span>}
      </p>
    </InstanceBox>
  );
}

function EdgeInstance({ edge, diagram }: { edge: DiagramEdge; diagram: Diagram }) {
  const nameOf = (id: string) => nodeName(diagram.nodes.find((candidate) => candidate.id === id), 'nodo sin nombre');
  return (
    <InstanceBox>
      <p>
        De «{nameOf(edge.sourceId)}» a «{nameOf(edge.targetId)}»
      </p>
      <p className="text-xs text-ink-600">{edge.guard ? `Guarda: [${edge.guard}]` : 'Sin guarda. Haz doble clic en la flecha para añadir una.'}</p>
    </InstanceBox>
  );
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
