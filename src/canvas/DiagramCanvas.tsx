import { Background, BackgroundVariant, Controls, ReactFlow } from '@xyflow/react';

/**
 * Lienzo basado en React Flow. En la Fase 0 solo ofrece zoom/pan sobre un
 * fondo de puntos; en la Fase 1 se conecta al store mediante adaptadores.
 */
export function DiagramCanvas() {
  return (
    <ReactFlow nodes={[]} edges={[]} minZoom={0.25} maxZoom={2}>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d4d4d8" />
      <Controls position="bottom-left" showInteractive={false} />
    </ReactFlow>
  );
}
