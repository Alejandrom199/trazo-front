import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash, type Route } from './route';

describe('rutas por hash', () => {
  it.each<[string, Route]>([
    ['', { page: 'editor' }],
    ['#/', { page: 'editor' }],
    ['#/otra-cosa', { page: 'editor' }],
    ['#/aprender', { page: 'learn' }],
    ['#/aprender/', { page: 'learn' }],
    ['#/aprender/flow-uml', { page: 'learn-flow' }],
    ['#/aprender/activity', { page: 'learn-diagram', diagramType: 'activity' }],
  ])('«%s» es %j', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it.each<Route>([{ page: 'editor' }, { page: 'learn' }, { page: 'learn-flow' }, { page: 'learn-diagram', diagramType: 'activity' }])(
    'Ida y vuelta: %j',
    (route) => {
      expect(parseRoute(routeToHash(route))).toEqual(route);
    },
  );
});
