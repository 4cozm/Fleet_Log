import { useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MarkerType,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SHIP_IMG } from '../utils/logParser';

// 전술적 배치: 아군(좌측), 적군(우측) 고정 레이아웃
const FIXED_POSITIONS = {
    // 아군 함대
    "바르거": { x: 50, y: 50 },
    "슬레이프니르": { x: 50, y: 150 },
    "댐네이션": { x: 50, y: 250 },
    "디보우터": { x: 50, y: 350 },
    "앱솔루션": { x: 180, y: 100 },
    "팔라딘": { x: 180, y: 200 },
    "에리스": { x: 180, y: 300 },
    
    // 적군 함대
    "Tempest FI": { x: 650, y: 50 },
    "Maelstrom": { x: 650, y: 150 },
    "Raven NI": { x: 650, y: 250 },
    "Hurricane": { x: 650, y: 350 },
    "Scythe": { x: 520, y: 100 },
    "Osprey": { x: 520, y: 300 }
};

const ShipNode = ({ data }) => (
  <div style={{
    padding: '2px',
    borderRadius: '10px',
    background: 'rgba(5, 5, 15, 0.9)',
    border: `2px solid ${data.isEnemy ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
    boxShadow: `0 0 15px ${data.isEnemy ? 'rgba(255, 60, 60, 0.2)' : 'rgba(0, 122, 255, 0.2)'}`,
    width: '64px',
    height: '64px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  }}>
    <img 
        src={data.icon} 
        style={{ width: '100%', height: '100%', borderRadius: '6px', opacity: data.isDead ? 0.3 : 1 }} 
        alt={data.label}
    />
    <div style={{ 
        position: 'absolute', 
        bottom: '-18px', 
        fontSize: '10px', 
        color: '#fff', 
        fontFamily: 'var(--font-stat)', 
        whiteSpace: 'nowrap',
        textShadow: '0 0 5px #000'
    }}>
        {data.label}
    </div>
    {/* 체력바 시뮬레이션 */}
    {!data.isDead && (
        <div style={{ 
            position: 'absolute', 
            top: '-6px', 
            left: '0', 
            width: '100%', 
            height: '3px', 
            background: '#222', 
            borderRadius: '2px',
            overflow: 'hidden'
        }}>
            <div style={{ width: '85%', height: '100%', background: 'var(--accent-green)' }}></div>
        </div>
    )}
    {data.isDead && (
        <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            fontSize: '24px',
            zIndex: 10
        }}>
            💀
        </div>
    )}
  </div>
);

const nodeTypes = {
  ship: ShipNode,
};

const TacticalFlow = ({ logs }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const nodeMap = new Map();
    const edgeMap = new Map();

    // 기본 노드 생성
    Object.entries(FIXED_POSITIONS).forEach(([ship, pos]) => {
        const isEnemy = !["바르거", "슬레이프니르", "댐네이션", "디보우터", "앱솔루션", "팔라딘", "에리스"].includes(ship);
        const iconId = SHIP_IMG[ship] || 670;
        nodeMap.set(ship, {
            id: ship,
            type: 'ship',
            position: pos,
            data: { 
                label: ship, 
                icon: `https://images.evetech.net/types/${iconId}/render?size=128`,
                isEnemy,
                isDead: false
            },
            draggable: false,
        });
    });

    // 로그 기반 엣지 계산
    logs.forEach(l => {
        const { type, actor, target, val, isOut } = l.parsed;
        if (!actor || !target || actor === target) return;
        
        // 노드 동적 추가 (정의되지 않은 함선)
        if (!nodeMap.has(actor)) {
            nodeMap.set(actor, {
                id: actor, type: 'ship', 
                position: { x: Math.random() * 400 + 200, y: Math.random() * 400 },
                data: { label: actor, icon: `https://images.evetech.net/types/670/render?size=128`, isEnemy: true }
            });
        }
        if (!nodeMap.has(target)) {
            nodeMap.set(target, {
                id: target, type: 'ship', 
                position: { x: Math.random() * 400 + 200, y: Math.random() * 400 },
                data: { label: target, icon: `https://images.evetech.net/types/670/render?size=128`, isEnemy: false }
            });
        }

        const edgeId = `${actor}-${target}`;
        if (!edgeMap.has(edgeId)) {
            const color = type === 'rep' ? 'var(--accent-green)' : (isOut ? 'var(--accent-blue)' : 'var(--accent-red)');
            edgeMap.set(edgeId, {
                id: edgeId,
                source: actor,
                target: target,
                animated: true,
                style: { 
                    stroke: color,
                    strokeWidth: 1,
                    opacity: 0.6
                },
                markerEnd: { type: MarkerType.ArrowClosed, color },
                data: { total: 0 }
            });
        }
        edgeMap.get(edgeId).data.total += val;
        edgeMap.get(edgeId).style.strokeWidth = Math.min(6, 1 + edgeMap.get(edgeId).data.total / 10000);
        edgeMap.get(edgeId).style.opacity = 0.4 + Math.min(0.6, edgeMap.get(edgeId).data.total / 50000);
        
        if (type === 'kill' || type === 'loss') {
            if (nodeMap.has(target)) nodeMap.get(target).data.isDead = true;
        }
    });

    setNodes(Array.from(nodeMap.values()));
    setEdges(Array.from(edgeMap.values()));
  }, [logs]);

  return (
    <div className="flow-wrapper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        panOnScroll={false}
        zoomOnScroll={false}
        preventScrolling={false}
      >
        <Background color="#111" gap={30} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export default TacticalFlow;
