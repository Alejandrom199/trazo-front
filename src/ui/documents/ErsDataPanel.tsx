import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { emptyProjectDocument, type GlossaryEntry, type ProjectDocument, type ProjectDocumentText, type Stakeholder } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { inputClass } from '@/ui/explanation/formFields';

/** Los textos del documento por capítulo, con una pista de qué escribir (plantilla IEEE 830). */
const TEXT_GROUPS: { title: string; fields: { key: ProjectDocumentText; label: string; placeholder: string; rows?: number }[] }[] = [
  {
    title: 'Portada',
    fields: [
      { key: 'client', label: 'Cliente', placeholder: 'La empresa o persona para quien es el sistema', rows: 1 },
      { key: 'version', label: 'Versión', placeholder: '1.0', rows: 1 },
    ],
  },
  {
    title: '2. Presentación del producto',
    fields: [
      { key: 'problem', label: '2.1.1 Planteamiento del problema', placeholder: 'Quién es el negocio, cómo trabaja hoy, qué problema tiene, a quién afecta y cuál es su impacto.' },
      { key: 'objective', label: '2.1.2 Objetivo', placeholder: 'Para [cliente] que necesita [necesidad], el producto [nombre] es [qué es] que [beneficio].' },
      { key: 'scope', label: '2.1.3 Alcance', placeholder: 'Qué permitirá la solución, por módulos:\n- Módulo de…: …' },
      { key: 'notIncluded', label: '2.1.4 El sistema no contempla', placeholder: 'Lo que queda fuera de esta versión.' },
      { key: 'risks', label: '2.2 Riesgos', placeholder: '- Que los usuarios no adopten el sistema…' },
    ],
  },
  {
    title: '3. Descripción general',
    fields: [
      { key: 'context', label: '3.1 Contexto del producto', placeholder: 'Dónde está el negocio, a qué se dedica, cuántas personas trabajan y cómo se organizan.' },
      { key: 'future', label: '3.2 Perspectivas futuras', placeholder: 'Lo que puede llegar en versiones futuras.' },
    ],
  },
  {
    title: '7. Requerimientos de interfaz',
    fields: [
      { key: 'userInterfaces', label: '7.1 Con el usuario', placeholder: 'Pantallas, menús, reportes y cómo se navega.' },
      { key: 'hardwareInterfaces', label: '7.2 De hardware', placeholder: 'Impresoras, lectores, dispositivos. «No aplica» si no hay.' },
      { key: 'softwareInterfaces', label: '7.3 De software', placeholder: 'Otros sistemas, servicios o componentes con los que se integra.' },
      { key: 'communicationInterfaces', label: '7.4 De comunicación', placeholder: 'Redes, protocolos (HTTPS, correo…).' },
    ],
  },
  {
    title: '9 – 12. Cierre',
    fields: [
      { key: 'designConstraints', label: '9. Restricciones de diseño', placeholder: 'Lenguajes, herramientas, arquitectura, seguridad o rendimiento que se deben respetar.' },
      { key: 'licensing', label: '10. Requerimientos de licencia', placeholder: 'Componentes comprados o licencias necesarias. «No aplica» si no hay.' },
      { key: 'changeControl', label: '11. Control de cambios', placeholder: '- Toda solicitud de cambio la aprueba el responsable del área.\n- Se evalúa el impacto y se acuerda la prioridad.\n- …' },
      { key: 'observations', label: '12. Observaciones', placeholder: 'Cualquier otra información importante.' },
    ],
  },
];

/** Cuántos campos del documento faltan por escribir. */
export function pendingFields(doc: ProjectDocument): number {
  const texts = TEXT_GROUPS.flatMap((group) => group.fields).filter((field) => !doc[field.key].trim()).length;
  return texts + (doc.audience.some((item) => item.name.trim()) ? 0 : 1);
}

/**
 * Lo que el ERS necesita y el modelo no sabe: se escribe aquí una vez y queda
 * guardado con el proyecto. Cada campo se guarda al salir de él.
 */
export function ErsDataPanel({ document: stored }: { document: ProjectDocument | undefined }) {
  const doc = stored ?? emptyProjectDocument();
  const update = (patch: Partial<ProjectDocument>) => useProjectStore.getState().updateDocument(patch);
  const label = 'block text-[11px] font-semibold uppercase tracking-wider text-ink-400';

  return (
    <div className="space-y-6 p-4">
      <p className="text-xs leading-relaxed text-ink-600">
        Lo demás sale del proyecto. Aquí va lo que el modelo no sabe. Una línea es un párrafo; empieza con «-» para hacer una lista.
      </p>

      {TEXT_GROUPS.slice(0, 1).map((group) => <TextGroup key={group.title} group={group} doc={doc} onChange={update} />)}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-ink-900">1.2 Definiciones y abreviaturas</h3>
        <p className="text-[11px] text-ink-400">Los términos del negocio. RF, RNF, RN, CU, ACT, DG y CP se agregan solos.</p>
        <RowsEditor<GlossaryEntry>
          rows={doc.glossary}
          columns={[['term', 'Término'], ['definition', 'Definición'], ['alias', 'Alias'], ['abbreviation', 'Abreviatura']]}
          empty={{ term: '', definition: '', alias: '', abbreviation: '' }}
          addLabel="Agregar un término"
          onChange={(glossary) => update({ glossary })}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-ink-900">1.3 Audiencia</h3>
        <p className="text-[11px] text-ink-400">Quién participa: cliente, usuarios, equipo.</p>
        <RowsEditor<Stakeholder>
          rows={doc.audience}
          columns={[['name', 'Stakeholder'], ['role', 'Rol'], ['responsibility', 'Responsabilidad'], ['interests', 'Intereses'], ['contact', 'Contacto']]}
          empty={{ name: '', role: '', responsibility: '', interests: '', contact: '' }}
          addLabel="Agregar un stakeholder"
          onChange={(audience) => update({ audience })}
        />
      </section>

      {TEXT_GROUPS.slice(1).map((group) => <TextGroup key={group.title} group={group} doc={doc} onChange={update} />)}

      <p className="text-[11px] leading-relaxed text-ink-400">
        <span className={label}>Del modelo</span>
        La descripción de cada actor sale de sus notas en el diagrama de casos de uso; los requerimientos, fichas, diagramas, matrices y casos de prueba, del proyecto.
      </p>
    </div>
  );
}

function TextGroup({ group, doc, onChange }: { group: (typeof TEXT_GROUPS)[number]; doc: ProjectDocument; onChange: (patch: Partial<ProjectDocument>) => void }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-ink-900">{group.title}</h3>
      {group.fields.map((field) => (
        <label key={field.key} className="block">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
            {field.label}
            {!doc[field.key].trim() && <span className="size-1.5 rounded-full bg-warning" title="Por completar" />}
          </span>
          {field.rows === 1 ? (
            <input key={`${field.key}:${doc[field.key]}`} defaultValue={doc[field.key]} placeholder={field.placeholder} onBlur={(event) => event.target.value !== doc[field.key] && onChange({ [field.key]: event.target.value.trim() })} className={`${inputClass} mt-1`} />
          ) : (
            <textarea key={`${field.key}:${doc[field.key]}`} defaultValue={doc[field.key]} placeholder={field.placeholder} rows={field.rows ?? 3} onBlur={(event) => event.target.value !== doc[field.key] && onChange({ [field.key]: event.target.value.trim() })} className={`${inputClass} mt-1 resize-y`} />
          )}
        </label>
      ))}
    </section>
  );
}

/** Una tabla editable de pocas columnas (glosario, audiencia): una tarjeta por fila. */
function RowsEditor<T extends object>({ rows, columns, empty, addLabel, onChange }: { rows: T[]; columns: [keyof T & string, string][]; empty: T; addLabel: string; onChange: (rows: T[]) => void }) {
  const set = (index: number, key: keyof T, value: string) => onChange(rows.map((row, position) => (position === index ? { ...row, [key]: value } : row)));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="relative space-y-1.5 rounded-lg border border-line p-2.5 pr-9">
          {columns.map(([key, title]) => (
            <input
              key={`${key}:${String(row[key])}`}
              aria-label={title}
              placeholder={title}
              defaultValue={String(row[key] ?? '')}
              onBlur={(event) => event.target.value !== row[key] && set(index, key, event.target.value.trim())}
              className={`${inputClass} h-8 text-xs`}
            />
          ))}
          <button type="button" onClick={() => onChange(rows.filter((_, position) => position !== index))} aria-label="Quitar la fila" className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { ...empty }])} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft">
        <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> {addLabel}
      </button>
    </div>
  );
}
