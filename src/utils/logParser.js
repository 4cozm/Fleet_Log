export const SHIP_IMG = {
    "바르거": 28664, "슬레이프니르": 22440, "댐네이션": 22470, "디보우터": 11983,
    "앱솔루션": 22444, "팔라딘": 28659, "에리스": 22448, "Tempest FI": 3529,
    "Maelstrom": 631, "Raven NI": 33157, "Hurricane": 523, "Scythe": 627, "Osprey": 626
};

const ENEMY_FLEET = ["Tempest FI", "Maelstrom", "Raven NI", "Hurricane", "Scythe", "Osprey"];

export function parseLog(c) {
    let type = 'msg', val = 0, isOut = false, actor = "", target = "";
    const clean = c.replace(/\((combat|notify)\)/, '').trim();
    
    if (c.includes('(combat)')) {
        if (clean.startsWith('KILL:')) {
            type = 'kill';
            actor = clean.split('시전자: ')[1]?.split(',')[0];
            target = clean.split('대상: ')[1];
        } else if (clean.startsWith('LOSS:')) {
            type = 'loss';
            actor = clean.split('시전자: ')[1]?.split(',')[0];
            target = clean.split('대상: ')[1];
        } else {
            const v = clean.match(/^(\d+):/);
            if (v) {
                val = parseInt(v[1]);
                type = (clean.includes('수리') || clean.includes('전송')) ? 'rep' : 'dmg';
                
                const actorPart = clean.split('시전자: ')[1] || clean.split('시전자 - ')[1];
                const targetPart = clean.split('대상: ')[1] || clean.split('대상 - ')[1];
                
                actor = actorPart?.split(',')[0]?.trim();
                target = targetPart?.split(',')[0]?.trim() || targetPart?.trim();
                
                if (type === 'dmg' && actor && SHIP_IMG[actor] && !ENEMY_FLEET.includes(actor)) {
                    isOut = true;
                }
            } else {
                type = 'tackle';
                const actorPart = clean.split('시전자: ')[1] || clean.split('시전자 - ')[1];
                const targetPart = clean.split('대상: ')[1] || clean.split('대상 - ')[1];
                actor = actorPart?.split(',')[0]?.trim();
                target = targetPart?.split(',')[0]?.trim() || targetPart?.trim();
            }
        }
    }
    
    let iconId = 670;
    if (SHIP_IMG[actor]) iconId = SHIP_IMG[actor];
    else if (SHIP_IMG[target]) iconId = SHIP_IMG[target];

    return { 
        type, 
        val, 
        isOut, 
        actor, 
        target, 
        icon: `https://images.evetech.net/types/${iconId}/render?size=128` 
    };
}
