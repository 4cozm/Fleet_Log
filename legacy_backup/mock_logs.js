/** 
 * EVE Tactical Engagement: HIGH-INTENSITY DYNAMIC MOCK DATA
 * 포함 사항: 준 데미지(OUT), 받은 데미지(IN), 로지스틱스(REP), 함선 파괴(KILL/LOSS)
 */

const ALLY_FLEET = ["바르거", "슬레이프니르", "댐네이션", "디보우터", "앱솔루션", "팔라딘", "에리스"];
const ENEMY_FLEET = ["Tempest FI", "Maelstrom", "Raven NI", "Hurricane", "Scythe", "Osprey"];

function rnd(n) { return Math.floor(Math.random() * n); }

const MOCK_LOGS = [];
let baseTime = new Date("2026-03-02T15:00:00");

for (let min = 0; min < 60; min++) {
    const wave = Math.sin(min / 10) * 0.5 + 0.5;
    const intensity = (min >= 15 && min <= 45) ? (0.6 + wave * 0.4) : (0.1 + wave * 0.2);
    
    const eventsPerMin = Math.floor(40 * intensity) + 5;

    for (let i = 0; i < eventsPerMin; i++) {
        const sec = rnd(60);
        const time = new Date(baseTime.getTime() + (min * 60 + sec) * 1000);
        const timestamp = time.toISOString().replace('T', ' ').substring(0, 19);
        
        const typeRoll = Math.random();
        let content = "";

        // 함선 파괴 이벤트 (낮은 확률로 발생)
        if (typeRoll < 0.02) { 
            const isLoss = Math.random() > 0.6; // 40% 확률로 적 처치, 60% 확률로 아군 손실 (교전 난이도 반영)
            if (isLoss) {
                const ship = ALLY_FLEET[rnd(ALLY_FLEET.length)];
                content = `(combat) LOSS: 함선 파괴됨 - 시전자: ${ENEMY_FLEET[rnd(ENEMY_FLEET.length)]}, 대상: ${ship}`;
            } else {
                const ship = ENEMY_FLEET[rnd(ENEMY_FLEET.length)];
                content = `(combat) KILL: 적 함선 격침 - 시전자: ${ALLY_FLEET[rnd(ALLY_FLEET.length)]}, 대상: ${ship}`;
            }
        }
        else if (typeRoll < 0.35) { // 준 데미지
            const val = Math.floor((2000 + rnd(3000)) * (0.5 + intensity));
            content = `(combat) ${val}: 점사 데미지 시전자 - ${ALLY_FLEET[rnd(ALLY_FLEET.length)]}, 대상 - ${ENEMY_FLEET[rnd(ENEMY_FLEET.length)]}`;
        } 
        else if (typeRoll < 0.65) { // 받은 데미지
            const val = Math.floor((1500 + rnd(4000)) * (0.5 + intensity));
            content = `(combat) ${val}: 화력 공격 시전자 - ${ENEMY_FLEET[rnd(ENEMY_FLEET.length)]}, 대상 - ${ALLY_FLEET[rnd(ALLY_FLEET.length)]}`;
        }
        else if (typeRoll < 0.90) { // 로지스틱스
            const val = Math.floor((1000 + rnd(2500)) * (0.5 + intensity * 1.5));
            const logType = Math.random() > 0.5 ? "원격 장갑 수리" : "원격 실드 전송";
            content = `(combat) ${val}: ${logType} 시전자 - ${ALLY_FLEET[rnd(ALLY_FLEET.length)]}, 대상 - ${ALLY_FLEET[rnd(ALLY_FLEET.length)]}`;
        }
        else { // 태클
            const actions = ["워프 스크램블", "워프 디스럽트", "웹 시도"];
            content = `(combat) ${actions[rnd(actions.length)]} 시전자 - ${ALLY_FLEET[rnd(ALLY_FLEET.length)]}, 대상 - ${ENEMY_FLEET[rnd(ENEMY_FLEET.length)]}`;
        }

        MOCK_LOGS.push({ timestamp, content });
    }
}

MOCK_LOGS.sort((a, b) => new Date(a.timestamp.replace(/-/g, '/')) - new Date(b.timestamp.replace(/-/g, '/')));
