import { faBookOpen, faDiagramProject, faGraduationCap, faMoon, faPlus, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileMenu } from '@/ui/toolbar/FileMenu';
import { useUiStore } from '@/ui/uiStore';
import { RailButton } from './RailButton';

/**
 * Riel de navegación a la izquierda: acciones globales arriba (crear, explicar,
 * archivo, modo aprendizaje) y el cambio de tema claro/oscuro al pie.
 */
export function NavRail() {
  const narrationOpen = useUiStore((state) => state.narrationOpen);
  const setNarrationOpen = useUiStore((state) => state.setNarrationOpen);
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);
  const learningMode = useUiStore((state) => state.learningMode);
  const setLearningMode = useUiStore((state) => state.setLearningMode);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const isDark = theme === 'dark';

  return (
    <nav aria-label="Principal" className="flex w-14 shrink-0 flex-col items-center border-r border-line bg-surface py-3 md:w-[76px]">
      <div
        className="bg-brand mb-4 flex size-9 items-center justify-center rounded-xl text-base text-white shadow-panel md:size-10 md:text-lg"
        title="Trazo"
        aria-label="Trazo"
      >
        <FontAwesomeIcon icon={faDiagramProject} />
      </div>

      <div className="flex w-full flex-col gap-1">
        <RailButton icon={faPlus} label="Nuevo" title="Abrir o crear un diagrama" onClick={() => setGalleryOpen(true)} />
        <RailButton
          icon={faBookOpen}
          label="Explicar"
          title="Explicar diagrama: narración paso a paso"
          active={narrationOpen}
          aria-pressed={narrationOpen}
          onClick={() => setNarrationOpen(!narrationOpen)}
        />
        <FileMenu />
        <RailButton
          icon={faGraduationCap}
          label="Aprender"
          title="Modo aprendizaje: muestra la explicación de cada elemento al seleccionarlo"
          role="switch"
          active={learningMode}
          aria-checked={learningMode}
          onClick={() => setLearningMode(!learningMode)}
        />
      </div>

      <div className="mt-auto w-full">
        <RailButton
          icon={isDark ? faSun : faMoon}
          label={isDark ? 'Claro' : 'Oscuro'}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        />
      </div>
    </nav>
  );
}
