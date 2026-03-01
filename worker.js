export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS 설정
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        // 1. 로컬 클라이언트로부터 데이터 수신 및 병합 (POST)
        if (request.method === "POST" && url.pathname === "/upload") {
            const { requestId, logs } = await request.json();
            
            // 기존 데이터 로드 (없으면 빈 배열)
            const existingDataStr = await env.EVE_LOGS_KV.get(requestId);
            const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
            
            // 해시 트래킹 맵 (중복 제거용)
            const trackingMap = new Map();
            existingData.forEach(log => {
                const key = `${log.timestamp}_${log.content}`;
                const count = (trackingMap.get(key) || 0) + 1;
                trackingMap.set(key, count);
            });

            const mergedLogs = [...existingData];

            logs.forEach(logLine => {
                const timeMatch = logLine.match(/^\[ (.*?) \]/);
                if (!timeMatch) return;
                
                const timestamp = timeMatch[1];
                const content = logLine.substring(timeMatch[0].length).trim();
                const trackingKey = `${timestamp}_${content}`;
                
                const currentCount = trackingMap.get(trackingKey) || 0;
                
                // 새로운(해시 순번이 다른) 로그만 배열에 추가
                if (currentCount === 0) {
                    mergedLogs.push({ timestamp, content });
                    trackingMap.set(trackingKey, 1);
                }
            });

            // 시간순 정렬
            mergedLogs.sort((a, b) => new Date(a.timestamp.replace(/\./g, '-')) - new Date(b.timestamp.replace(/\./g, '-')));

            // KV 저장 (7일 TTL = 604800초)
            await env.EVE_LOGS_KV.put(requestId, JSON.stringify(mergedLogs), { expirationTtl: 604800 });
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // 2. 프론트엔드 조회 요청 (GET)
        if (request.method === "GET" && url.pathname === "/logs") {
            const code = url.searchParams.get("code");
            if (!code) return new Response("NO SIGNAL", { status: 401, headers: corsHeaders });

            const logs = await env.EVE_LOGS_KV.get(code);
            if (!logs) return new Response("UNAUTHORIZED ACCESS OR EXPIRED", { status: 404, headers: corsHeaders });

            return new Response(logs, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
};