import { faBookOpen, faDiagramProject, faGraduationCap, faMoon, faPlus, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileMenu } from '@/ui/toolbar/FileMenu';
import { navigate, useRoute } from '@/ui/navigation/route';
import { useUiStore } from '@/ui/uiStore';
import { RailButton } from './RailButton';

/**
 * Riel de navegación a la izquierda: acciones del editor arriba (crear, explicar,
 * archivo), la página Aprender y el cambio de tema claro/oscuro al pie.
 */
export function NavRail() {
  const narrationOpen = useUiStore((state) => state.narrationOpen);
  const setNarrationOpen = useUiStore((state) => state.setNarrationOpen);
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);
  const route = useRoute();
  const inEditor = route.page === 'editor';
  /** Las acciones del editor llevan de vuelta a él si se estaba en Aprender. */
  const inEditorThen = (action: () => void) => () => {
    if (!inEditor) navigate({ page: 'editor' });
    action();
  };
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
        <RailButton icon={faPlus} label="Nuevo" title="Abrir o crear un diagrama" onClick={inEditorThen(() => setGalleryOpen(true))} />
        <RailButton
          icon={faBookOpen}
          label="Explicar"
          title="Explicar diagrama: narración paso a paso"
          active={inEditor && narrationOpen}
          aria-pressed={inEditor && narrationOpen}
          onClick={inEditorThen(() => setNarrationOpen(!narrationOpen || !inEditor))}
        />
        <FileMenu />
        <RailButton
          icon={faGraduationCap}
          label="Aprender"
          title="Aprender: guías interactivas de cada tipo de diagrama"
          active={!inEditor}
          aria-current={!inEditor ? 'page' : undefined}
          onClick={() => navigate(inEditor ? { page: 'learn' } : { page: 'editor' })}
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
