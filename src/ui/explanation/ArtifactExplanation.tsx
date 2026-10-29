import type { ReactNode } from 'react';
import type { ArtifactDefinition } from '@/core/model';
import { describeConnectionRules } from './connectionRulesText';

interface ArtifactExplanationProps {
  definition: ArtifactDefinition;
  /** Para mostrar los nombres de los artefactos relacionados. */
  definitionsByType: Map<string, ArtifactDefinition>;
  onOpenRelated: (artifactType: string) => void;
  /** Datos del elemento concreto del diagrama, si se explica uno. */
  instance?: ReactNode;
}

/** Ficha completa de un artefacto: lo que dice su ArtifactDefinition, ordenado para aprender. */
export function ArtifactExplanation({ definition, definitionsByType, onOpenRelated, instance }: ArtifactExplanationProps) {
  const connections = describeConnectionRules(definition.connectionRules);

  return (
    <article className="space-y-5 px-4 py-4 text-sm leading-relaxed text-ink-600">
      <header className="space-y-1.5">
        <span className="inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-400">
          {definition.category}
        </span>
        <h3 className="text-base font-semibold text-ink-900">{definition.name}</h3>
        <p className="text-xs text-ink-400">
          Nombre UML: <span className="text-ink-600">{definition.umlName}</span>
        </p>
        <p className="text-[15px] leading-relaxed text-ink-900">{definition.whatIs}</p>
      </header>

      {instance}

      <Section title="Para qué sirve">
        <p>{definition.whatFor}</p>
      </Section>
      <Section title="Por qué existe">
        <p>{definition.whyExists}</p>
      </Section>
      <Section title="Cómo se dibuja">
        <p>{definition.notation}</p>
      </Section>
      <Section title="Cuándo usarlo">
        <BulletList items={definition.whenToUse} marker="bg-emerald-500" />
      </Section>
      <Section title="Cuándo no usarlo">
        <BulletList items={definition.whenNotToUse} marker="bg-ink-400" />
      </Section>
      <Section title="Reglas UML">
        <BulletList items={definition.rules} marker="bg-accent" />
        {connections && (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <ConnectionStat label="Entradas" value={connections.incoming} />
            <ConnectionStat label="Salidas" value={connections.outgoing} />
          </dl>
        )}
      </Section>
      <Section title="Errores comunes">
        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-amber-900">
          <BulletList items={definition.commonMistakes} marker="bg-amber-500" />
        </div>
      </Section>
      <Section title="Ejemplo">
        <p className="rounded-xl border-l-2 border-accent bg-accent-soft/60 px-3 py-2.5 text-ink-900">{definition.example}</p>
      </Section>

      {definition.relatedArtifacts.length > 0 && (
        <Section title="Relacionados">
          <div className="flex flex-wrap gap-1.5">
            {definition.relatedArtifacts.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onOpenRelated(type)}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-600 hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
              >
                {definitionsByType.get(type)?.name ?? type}
              </button>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h4>
      {children}
    </section>
  );
}

function BulletList({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className={`mt-[0.6em] size-1.5 shrink-0 rounded-full ${marker}`} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ConnectionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-canvas px-2.5 py-2">
      <dt className="text-[11px] text-ink-400">{label}</dt>
      <dd className="text-xs font-medium text-ink-900">{value}</dd>
    </div>
  );
}
