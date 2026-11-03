import {
  faBan,
  faBullseye,
  faCheck,
  faCircleExclamation,
  faLightbulb,
  faListCheck,
  faPenRuler,
  faPlus,
  faQuoteLeft,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ReactNode } from 'react';
import type { ArtifactDefinition } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { EdgeFigure } from '@/ui/artifacts/EdgeFigure';
import { describeConnectionRules } from '@/ui/explanation/connectionRulesText';

interface ArtifactBentoProps {
  module: DiagramModule;
  definition: ArtifactDefinition;
  /** Para mostrar los nombres de los artefactos relacionados. */
  definitionsByType: Map<string, ArtifactDefinition>;
  onOpenRelated: (artifactType: string) => void;
  /** Solo para nodos: lo coloca en el lienzo para probarlo. */
  onTry?: () => void;
}

/**
 * Ficha de un artefacto en Aprender, en bloques (bento): la figura con cómo se
 * dibuja, qué es, para qué y por qué, cuándo usarlo frente a cuándo no, reglas
 * frente a errores comunes, y el ejemplo con los relacionados. Es la misma
 * información de ArtifactDefinition que la ficha del editor, repartida para
 * leerse de un vistazo.
 */
export function ArtifactBento({ module, definition, definitionsByType, onOpenRelated, onTry }: ArtifactBentoProps) {
  const kind = module.nodeKinds[definition.type];
  const edgeKind = module.edgeKinds[definition.type];
  const connections = describeConnectionRules(definition.connectionRules);

  return (
    <div className="grid gap-2.5 p-3 md:grid-cols-4">
      <Tile className="flex flex-col items-center justify-center gap-3 text-center md:row-span-2">
        <span className="flex h-24 w-full items-center justify-center rounded-lg bg-canvas">
          {kind ? (
            <ArtifactFigure kind={kind} artifactType={definition.type} box={{ width: 130, height: 72 }} label={kind.hasLabel ? kind.defaultLabel : undefined} />
          ) : (
            edgeKind && <EdgeFigure kind={edgeKind} box={{ width: 130, height: 72 }} />
          )}
        </span>
        <span>
          <TileTitle icon={faPenRuler}>Cómo se dibuja</TileTitle>
          <span className="block text-xs leading-relaxed text-ink-600">{definition.notation}</span>
        </span>
      </Tile>

      <Tile className="md:col-span-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent capitalize">{definition.category}</span>
          <span className="text-xs text-ink-400">
            Nombre UML: <span className="text-ink-600">{definition.umlName}</span>
          </span>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-900">{definition.whatIs}</p>
      </Tile>

      <Tile>
        <TileTitle icon={faBullseye}>Para qué sirve</TileTitle>
        <Text>{definition.whatFor}</Text>
      </Tile>
      <Tile>
        <TileTitle icon={faLightbulb}>Por qué existe</TileTitle>
        <Text>{definition.whyExists}</Text>
      </Tile>
      <Tile className="flex flex-col">
        <TileTitle icon={faQuoteLeft}>Ejemplo</TileTitle>
        <p className="flex-1 border-l-2 border-accent pl-2.5 text-[13px] leading-relaxed text-ink-900">{definition.example}</p>
      </Tile>

      <Tile className="border-success/40 md:col-span-2">
        <TileTitle icon={faCheck} tone="text-success">Cuándo usarlo</TileTitle>
        <Bullets items={definition.whenToUse} marker="bg-success" />
      </Tile>
      <Tile className="md:col-span-2">
        <TileTitle icon={faBan}>Cuándo no usarlo</TileTitle>
        <Bullets items={definition.whenNotToUse} marker="bg-ink-400" />
      </Tile>

      <Tile className="md:col-span-2">
        <TileTitle icon={faListCheck} tone="text-accent">Reglas UML</TileTitle>
        <Bullets items={definition.rules} marker="bg-accent" />
        {connections && (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Entradas" value={connections.incoming} />
            <Stat label="Salidas" value={connections.outgoing} />
          </dl>
        )}
      </Tile>
      <Tile className="border-danger/40 md:col-span-2">
        <TileTitle icon={faCircleExclamation} tone="text-danger">Errores comunes</TileTitle>
        <Bullets items={definition.commonMistakes} marker="bg-danger" />
      </Tile>

      {(definition.relatedArtifacts.length > 0 || onTry) && (
        <Tile className="flex flex-wrap items-center justify-between gap-3 md:col-span-4">
          {definition.relatedArtifacts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-ink-400">Relacionados</span>
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
          ) : (
            <span />
          )}
          {onTry && (
            <button
              type="button"
              onClick={onTry}
              className="bg-brand flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              Probarlo en el lienzo
            </button>
          )}
        </Tile>
      )}
    </div>
  );
}

function Tile({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border border-line bg-surface p-3.5 ${className}`}>{children}</section>;
}

function TileTitle({ icon, tone = 'text-ink-400', children }: { icon: IconDefinition; tone?: string; children: ReactNode }) {
  return (
    <h4 className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
      <FontAwesomeIcon icon={icon} className="text-[11px]" aria-hidden />
      {children}
    </h4>
  );
}

function Text({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-ink-600">{children}</p>;
}

function Bullets({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-600">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className={`mt-[0.6em] size-1.5 shrink-0 rounded-full ${marker}`} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-canvas px-2.5 py-2">
      <dt className="text-[11px] text-ink-400">{label}</dt>
      <dd className="text-xs font-medium text-ink-900">{value}</dd>
    </div>
  );
}
