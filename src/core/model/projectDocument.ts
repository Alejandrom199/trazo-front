/**
 * Datos del documento ERS que el modelo no tiene: el problema, la audiencia,
 * el glosario, los riesgos, las interfaces… Se escriben una vez y se guardan
 * con el proyecto; lo demás del ERS (requisitos, casos de uso, diagramas,
 * matrices, pruebas) sale del propio proyecto. Sigue la plantilla IEEE 830.
 */

export interface GlossaryEntry {
  term: string;
  definition: string;
  alias: string;
  abbreviation: string;
}

export interface Stakeholder {
  name: string;
  role: string;
  responsibility: string;
  interests: string;
  contact: string;
}

export interface ProjectDocument {
  /** Para quién es el sistema (empresa o persona). */
  client: string;
  version: string;
  problem: string;
  objective: string;
  scope: string;
  notIncluded: string;
  risks: string;
  context: string;
  future: string;
  glossary: GlossaryEntry[];
  audience: Stakeholder[];
  userInterfaces: string;
  hardwareInterfaces: string;
  softwareInterfaces: string;
  communicationInterfaces: string;
  designConstraints: string;
  licensing: string;
  changeControl: string;
  observations: string;
}

/** Los campos de texto libre, en el orden del documento. */
export type ProjectDocumentText = Exclude<keyof ProjectDocument, 'glossary' | 'audience'>;

export function emptyProjectDocument(): ProjectDocument {
  return {
    client: '', version: '1.0', problem: '', objective: '', scope: '', notIncluded: '', risks: '', context: '', future: '',
    glossary: [], audience: [],
    userInterfaces: '', hardwareInterfaces: '', softwareInterfaces: '', communicationInterfaces: '',
    designConstraints: '', licensing: '', changeControl: '', observations: '',
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' ? value : '');
const rows = <T>(value: unknown, read: (item: Record<string, unknown>) => T): T[] => (Array.isArray(value) ? value.filter(isRecord).map(read) : []);

/** Lectura tolerante: lo que falta o no se entiende queda vacío (proyectos anteriores no lo tenían). */
export function parseProjectDocument(raw: unknown): ProjectDocument {
  const empty = emptyProjectDocument();
  if (!isRecord(raw)) return empty;
  const texts = Object.fromEntries(
    (Object.keys(empty) as (keyof ProjectDocument)[])
      .filter((key) => key !== 'glossary' && key !== 'audience')
      .map((key) => [key, typeof raw[key] === 'string' ? raw[key] : empty[key]]),
  ) as Pick<ProjectDocument, ProjectDocumentText>;
  return {
    ...texts,
    glossary: rows(raw.glossary, (item) => ({ term: text(item.term), definition: text(item.definition), alias: text(item.alias), abbreviation: text(item.abbreviation) })),
    audience: rows(raw.audience, (item) => ({ name: text(item.name), role: text(item.role), responsibility: text(item.responsibility), interests: text(item.interests), contact: text(item.contact) })),
  };
}
