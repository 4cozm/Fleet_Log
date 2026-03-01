import { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SHIP_IMG } from '../utils/logParser';

const SHIP_NODES = {
    "바르거": { x: 100, y: 100 },
    "슬레이프니르": { x: 100, y: 200 },
    "댐네이션": { x: 100, y: 300 },
    "디보우터": { x: 100, y: 400 },
    "Tempest FI": { x: 600, y: 100 },
    "Maelstrom": { x: 600, y: 200 },
    "Raven NI": { x: 600, y: 300 },
    "Hurricane": { x: 600, y: 400 }
};

const CustomNode = ({ data }) => (
  <div style={{
    padding: '5px',
    borderRadius: '8px',
    background: '#0a0a1a',
    border: `2px solid ${data.isEnemy ? '#ff3333' : '#007aff'}`,
    textAlign: 'center',
    width: '60px',
    position: 'relative'
  }}>
    <img 
        src={`https://images.evetech.net/types/${data.iconId}/render?size=64`} 
        style={{ width: '100%', borderRadius: '4px' }} 
        alt={data.label}
    />
    <div style={{ fontSize: '8px', color: '#fff', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.label}
    </div>
    {data.isDead && (
        <div style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '14px' }}>💀</div>
    )}
  </div>
);

const nodeTypes = {
  ship: CustomNode,
};

const TacticalFlow = ({ logs }) => {
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map();
    const edgeMap = new Map();

    // Create unique nodes from fleet lists + any seen in logs
    const allShips = new Set([...Object.keys(SHIP_NODES)]);
    
    allShips.forEach(ship => {
        const isEnemy = !["바르거", "슬레이프니르", "댐네이션", "디보우터", "앱솔루션", "팔라딘", "에리스"].includes(ship);
        nodeMap.set(ship, {
            id: ship,
            type: 'ship',
            position: SHIP_NODES[ship] || { x: Math.random() * 500, y: Math.random() * 500 },
            data: { 
                label: ship, 
                iconId: SHIP_IMG[ship] || 670,
                isEnemy,
                isDead: false
            },
        });
    });

    // Process logs to create edges based on focus
    logs.forEach(l => {
        const { type, actor, target, val, isOut } = l.parsed;
        if (!actor || !target || actor === target) return;

        const edgeId = `${actor}-${target}`;
        if (!edgeMap.has(edgeId)) {
            edgeMap.set(edgeId, {
                id: edgeId,
                source: actor,
                target: target,
                label: '',
                animated: true,
                style: { 
                    stroke: type === 'rep' ? '#00e676' : (isOut ? '#007aff' : '#ff3333'),
                    strokeWidth: 1
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: type === 'rep' ? '#00e676' : (isOut ? '#007aff' : '#ff3333'),
                },
                data: { total: 0 }
            });
        }
        edgeMap.get(edgeId).data.total += val;
        edgeMap.get(edgeId).style.strokeWidth = Math.min(8, 1 + edgeMap.get(edgeId).data.total / 50000);
        
        if (type === 'kill' || type === 'loss') {
            if (nodeMap.has(target)) {
                nodeMap.get(target).data.isDead = true;
            }
        }
    });

    return { 
        nodes: Array.from(nodeMap.values()), 
        edges: Array.from(edgeMap.values()) 
    };
  }, [logs]);

  return (
    <div style={{ width: '100%', height: '500px', background: '#020205', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#111" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default TacticalFlow;
