import { readLinkedDiagramId, withLinkedDiagram } from '@/core/model';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { projectFromJson, projectToJson } from '@/core/persistence/projectFormat';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { createId } from '@/core/utils/id';
import { downloadText, toFileName } from '@/ui/files/fileTransfer';

/**
 * Exportar e importar un proyecto completo (.trazo-project). Cada función
 * devuelve el aviso para el usuario: el éxito o por qué no se pudo.
 */

/** Descarga el proyecto abierto con todos sus diagramas (guardando antes el abierto). */
export function exportActiveProject(): string | null {
  const active = useProjectStore.getState().project;
  if (!active) return 'Primero crea o importa un proyecto.';
  const current = useDiagramStore.getState().diagram;
  const { repository, refresh } = usePersistenceStore.getState();
  if (current && repository) repository.save(current);
  refresh();
  const diagrams = active.diagramIds
    .map((id) => (current?.id === id ? current : repository?.load(id)))
    .filter((diagram) => diagram !== null && diagram !== undefined);
  if (diagrams.length === 0) return 'El proyecto todavía no tiene diagramas guardados.';
  downloadText(projectToJson(active, diagrams), `${toFileName(active.name)}.trazo-project`, 'application/json');
  return null;
}

/**
 * Importa un proyecto como uno nuevo: todo recibe ids nuevos (diagramas,
 * vínculos, relaciones) y los subprocesos, carpetas y requisitos se traducen
 * a ellos, para no chocar con lo que ya hay en el navegador.
 */
export function importProjectText(text: string, fileName: string): string {
  const parsed = projectFromJson(text);
  if (!parsed.ok) return `No se pudo importar «${fileName}»: ${parsed.error}`;
  const unsupported = parsed.project.diagrams.find((diagram) => !diagramRegistry.has(diagram.diagramType));
  if (unsupported) return `Trazo no conoce el tipo de diagrama «${unsupported.diagramType}».`;
  const persistence = usePersistenceStore.getState();
  if (!persistence.repository) return 'Este navegador no permite guardar un proyecto con varios diagramas.';

  const now = new Date().toISOString();
  const diagramIds = new Map(parsed.project.diagrams.map((diagram) => [diagram.id, createId()]));
  const newId = (id: string) => diagramIds.get(id)!;
  const diagrams = parsed.project.diagrams.map((diagram) => ({
    ...diagram,
    id: newId(diagram.id),
    updatedAt: now,
    nodes: diagram.nodes.map((node) => {
      const linked = readLinkedDiagramId(node);
      return linked ? { ...node, props: withLinkedDiagram(node.props, diagramIds.get(linked) ?? null) } : node;
    }),
  }));
  for (const diagram of diagrams) persistence.repository.save(diagram);
  persistence.refresh();

  useProjectStore.getState().openProject({
    id: createId(),
    name: parsed.project.name,
    diagramIds: diagrams.map((diagram) => diagram.id),
    traceLinks: parsed.project.traceLinks.map((link) => ({
      ...link,
      id: createId(),
      source: { ...link.source, diagramId: newId(link.source.diagramId) },
      target: { ...link.target, diagramId: newId(link.target.diagramId) },
    })),
    folders: parsed.project.folders,
    folderOf: Object.fromEntries(Object.entries(parsed.project.folderOf).map(([diagramId, folderId]) => [newId(diagramId), folderId])),
    diagramRelations: parsed.project.diagramRelations.map((relation) => ({
      ...relation,
      id: createId(),
      sourceDiagramId: newId(relation.sourceDiagramId),
      targetDiagramId: newId(relation.targetDiagramId),
    })),
    requirements: parsed.project.requirements,
    requirementLinks: parsed.project.requirementLinks.map((link) => ({ ...link, id: createId(), diagramId: newId(link.diagramId) })),
    createdAt: now,
    updatedAt: now,
  });
  useDiagramStore.getState().openDiagram(diagrams[0]!);
  return `Se importó el proyecto «${parsed.project.name}» con ${diagrams.length} diagramas.`;
}
