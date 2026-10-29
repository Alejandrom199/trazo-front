import { faChevronLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState, type ReactNode } from 'react';
import type { ArtifactDefinition, Diagram, DiagramEdge, DiagramNode, Template } from '@/core/model';
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
 * Con el modo aprendizaje activado se abre solo; desactivado, se reduce a un
 * botón "Ver explicación" que aparece al seleccionar algo.
 */
export function ExplanationPanel() {
  const module = useActiveModule();
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  const learningMode = useUiStore((state) => state.learningMode);

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
  const isOpen = learningMode || openedFor === key;

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

  return (
    <Panel className="flex max-h-full w-80 flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        {browsed.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className="-ml-1.5 flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-canvas hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
          </button>
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Explicación</h2>
        {!learningMode && (
          <button
            type="button"
            onClick={() => setOpenedFor(null)}
            aria-label="Cerrar explicación"
            className="ml-auto flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-canvas hover:text-ink-900"
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
        ) : (
          <TargetExplanation
            target={target}
            diagram={diagram}
            template={module.templates.find((candidate) => candidate.id === diagram.templateId)}
            definitionsByType={definitionsByType}
            onOpenRelated={openRelated}
          />
        )}
      </div>
    </Panel>
  );
}

interface TargetExplanationProps {
  target: ExplanationTarget;
  diagram: Diagram;
  /** Plantilla de la que salió el diagrama, si la hay. */
  template: Template | undefined;
  definitionsByType: Map<string, ArtifactDefinition>;
  onOpenRelated: (artifactType: string) => void;
}

function TargetExplanation({ target, diagram, template, definitionsByType, onOpenRelated }: TargetExplanationProps) {
  if (target.kind === 'none' && template) {
    return <TemplateGoals template={template} definitionsByType={definitionsByType} onOpenRelated={onOpenRelated} />;
  }
  if (target.kind === 'none') {
    return (
      <p className="p-4 text-sm leading-relaxed text-ink-600">
        Selecciona un elemento del lienzo para ver qué es, para qué sirve y por qué existe. También puedes pasar el
        ratón por la paleta para una explicación corta.
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

interface TemplateGoalsProps {
  template: Template;
  definitionsByType: Map<string, ArtifactDefinition>;
  onOpenRelated: (artifactType: string) => void;
}

/** Sin selección en un diagrama de plantilla: qué enseña y por dónde empezar a explorar. */
function TemplateGoals({ template, definitionsByType, onOpenRelated }: TemplateGoalsProps) {
  return (
    <div className="space-y-4 p-4 text-sm leading-relaxed text-ink-600">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Plantilla · {template.difficulty}</p>
        <h3 className="mt-1 text-base font-semibold text-ink-900">{template.name}</h3>
        <p className="mt-1">{template.description}</p>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Qué te enseña</p>
        <ul className="space-y-1">
          {template.learningGoals.map((type) => {
            const definition = definitionsByType.get(type);
            if (!definition) return null;
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => onOpenRelated(type)}
                  className="w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent-soft"
                >
                  <span className="block text-sm font-medium text-ink-900">{definition.name}</span>
                  <span className="line-clamp-2 block text-xs text-ink-600">{definition.whatIs}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-xs text-ink-400">Selecciona cualquier elemento del lienzo para ver su explicación completa.</p>
    </div>
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
        {plural(incoming, 'conexión de entrada', 'conexiones de entrada')} ·{' '}
        {plural(outgoing, 'de salida', 'de salida')}
        {parent && <> · en el carril «{parent.label}»</>}
      </p>
    </InstanceBox>
  );
}

function EdgeInstance({ edge, diagram }: { edge: DiagramEdge; diagram: Diagram }) {
  const nameOf = (id: string) => {
    const node = diagram.nodes.find((candidate) => candidate.id === id);
    return node?.label || 'nodo sin nombre';
  };
  return (
    <InstanceBox>
      <p>
        De «{nameOf(edge.sourceId)}» a «{nameOf(edge.targetId)}»
      </p>
      <p className="text-xs text-ink-600">{edge.guard ? `Guarda: [${edge.guard}]` : 'Sin guarda · doble clic para añadir una'}</p>
    </InstanceBox>
  );
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
